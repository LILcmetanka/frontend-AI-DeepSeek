/**
 * Режим пакета игры (FU_0006, ADR-0026).
 *
 * Требование ТЗ: клиенту передаётся исполняемый JS-код механики и JSON-конфиг,
 * и этого достаточно, чтобы запустить игровой сеанс. Раньше плеер всегда играл
 * встроенную сборку движка; здесь появляется второй режим — запуск пакета,
 * который приехал в карточке игры (`code_url`).
 *
 * Почему так:
 *  * код пакета тянется обычным `fetch(':code_url')` и сверяется с
 *    `code_integrity` (sha384/sha256/sha512, формат SRI) через WebCrypto —
 *    чужой JS не исполняется, если файл подменили в S3;
 *  * исполняется он в `iframe sandbox="allow-scripts"`: у документа прозрачное
 *    (opaque) происхождение, поэтому пакет не читает cookie и localStorage
 *    платформы и не ходит в API от имени пользователя;
 *  * связь — тот же postMessage-протокол, что у встроенной сборки
 *    (`hookster:ready` / `hookster:event`), поэтому страница про события
 *    ничего не знает и не меняется.
 *
 * Модуль без зависимостей: его можно проверить обычным Node
 * (`scripts/check-game-package.mjs`).
 */

/** Данные для запуска пакета в песочнице. */
export interface PackageMount {
  code: string;
  config: Record<string, unknown> | null;
  gameId: string;
  userId: string;
  spriteBaseUrl: string;
}

export type IntegrityVerdict = 'ok' | 'no-integrity' | 'unsupported' | 'mismatch';

export interface SriDigest {
  /** Алгоритм в терминах WebCrypto: SHA-384 и т.п. */
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
  /** digest из атрибута integrity, base64 (возможно без выравнивающих «=»). */
  digest: string;
}

const SRI_RE = /^(sha256|sha384|sha512)-([A-Za-z0-9+/=]+)$/;

/**
 * Адрес пакета — это JS-модуль, а не встроенная сборка движка.
 * Проверяем расширение в пути (query и hash не мешают).
 */
export function isPackageGame(codeUrl: string | undefined | null): boolean {
  if (!codeUrl) return false;
  const trimmed = codeUrl.trim();
  if (!trimmed) return false;
  const path = trimmed.split(/[?#]/)[0];
  return /\.m?js$/i.test(path);
}

/** Разобрать атрибут integrity: берём первый поддерживаемый токен. */
export function parseIntegrity(integrity: string | undefined | null): SriDigest | null {
  if (!integrity) return null;
  for (const token of integrity.trim().split(/\s+/)) {
    const match = SRI_RE.exec(token);
    if (!match) continue;
    const algorithm = `SHA-${match[1].slice(3)}` as SriDigest['algorithm'];
    return { algorithm, digest: match[2] };
  }
  return null;
}

/** Base64 без выравнивания: SRI допускает оба вида. */
function trimPadding(value: string): string {
  return value.replace(/=+$/, '');
}

/** Uint8Array → base64. btoa есть и в браузере, и в Node 16+. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Сверить код пакета с `code_integrity`.
 *
 * Итоги:
 *  * `ok` — хеш сошёлся;
 *  * `no-integrity` — в карточке нет пригодного атрибута (играем, но пишем в лог);
 *  * `unsupported` — в окружении нет WebCrypto (`crypto.subtle`);
 *  * `mismatch` — файл не тот, что зарегистрирован; исполнять нельзя.
 */
export async function verifyIntegrity(
  code: string,
  integrity: string | undefined | null,
  subtle?: SubtleCrypto | null,
): Promise<IntegrityVerdict> {
  const sri = parseIntegrity(integrity);
  if (!sri) return 'no-integrity';
  // undefined — «взять окружение», null — «WebCrypto заведомо нет» (тест).
  const webcrypto = subtle === undefined ? globalThis.crypto?.subtle : subtle;
  if (!webcrypto) return 'unsupported';

  const digest = await webcrypto.digest(sri.algorithm, new TextEncoder().encode(code));
  const actual = trimPadding(toBase64(new Uint8Array(digest)));
  return actual === trimPadding(sri.digest) ? 'ok' : 'mismatch';
}

/** JSON внутрь <script>: `</script>` в данных иначе закрыл бы тег. */
function scriptSafe(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

/**
 * HTML-документ для `iframe srcdoc`: песочница, мост postMessage и запуск пакета.
 *
 * Код передаётся строкой и импортируется через blob:-URL — так он исполняется
 * как отдельный модуль (своя область видимости, настоящие import/export), а не
 * в одном скоупе с мостом.
 */
export function buildPackageDocument(mount: PackageMount): string {
  const code = scriptSafe(mount.code);
  const config = scriptSafe(mount.config ?? {});
  const gameId = scriptSafe(mount.gameId);
  const userId = scriptSafe(mount.userId);
  const spriteBaseUrl = scriptSafe(mount.spriteBaseUrl ?? '');

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; height: 100%; background: #0b1020; overflow: hidden; }
  #hookster-root { position: absolute; inset: 0; }
</style>
</head>
<body>
<div id="hookster-root"></div>
<script type="module">
const source = ${code};
const config = ${config};
const gameId = ${gameId};
const userId = ${userId};
const spriteBaseUrl = ${spriteBaseUrl};

const send = (payload) => {
  try { window.parent.postMessage({ source: 'hookster-runner', ...payload }, '*'); }
  catch (error) { /* песочница может запретить — молча */ }
};

// Протокол моста плоский: имя события в поле event, длительность и очки —
// рядом (SubwaySurf/docs/EMBED.md). Вложенный объект страница не разберёт.
const emit = (event) => {
  if (!event || typeof event.type !== 'string') return;
  send({
    type: 'hookster:event',
    event: event.type,
    durationSec: event.durationSec,
    score: event.score,
    distance: event.distance,
  });
};

let destroy = null;
const unmount = () => {
  const fn = destroy;
  destroy = null;
  if (typeof fn === 'function') {
    try { fn(); } catch (error) { /* пакет не должен ломать выгрузку */ }
  }
};

window.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.source === 'hookster-web' && data.type === 'hookster:unmount') unmount();
});
window.addEventListener('pagehide', unmount);

(async () => {
  try {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const module = await import(url);
    URL.revokeObjectURL(url);
    if (!module || typeof module.startGame !== 'function') {
      throw new Error('в пакете нет экспорта startGame');
    }
    destroy = module.startGame(config, {
      root: document.getElementById('hookster-root'),
      emit,
      gameId,
      userId,
      spriteBaseUrl,
    });
    send({ type: 'hookster:ready' });
  } catch (error) {
    send({ type: 'hookster:error', message: String((error && error.message) || error) });
  }
})();
</script>
</body>
</html>`;
}
