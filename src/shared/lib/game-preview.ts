/**
 * Превью игры для карточек — сцена из макета.
 *
 * Источник: `design/gaming-feed-design/game-render.js` (рендер превью мини-игр
 * на canvas, общий для ленты и профиля). Перенесено один в один: те же
 * функции `runner`/`flappy`/`shooter`/`catcher`/`blocks`, те же палитры
 * макета. Отличие одно: макет брал вид и палитру из статичного списка
 * демо-игр, а у нас в ленте настоящие игры, поэтому вид выводится из
 * конфига игры, а палитра и зерно — детерминированно из её id.
 *
 * Чего здесь нет и почему: настоящего скриншота игры. API не отдаёт ни
 * кадра, ни превью-картинки (`GET /feed` возвращает конфиг и код пакета),
 * поэтому карточка рисует сцену того же вида, что и сама игра, а не
 * притворяется её фотографией.
 *
 * Модуль чистый: ни DOM, ни React, ни `@/`-алиасов — чтобы его можно было
 * проверять обычным `node --test` (frontend, раздел «Тесты»).
 */

/** Виды сцены из макета. */
export type PreviewKind = 'runner' | 'flappy' | 'shooter' | 'catcher' | 'blocks';

/** Палитра сцены из макета: фон, два плана декора и два акцента. */
export interface PreviewPalette {
  bg: string;
  far: string;
  mid: string;
  a: string;
  b: string;
}

/** Всё, что нужно, чтобы нарисовать один кадр. */
export interface PreviewScene {
  kind: PreviewKind;
  seed: number;
  palette: PreviewPalette;
}

/** Палитры пяти демо-игр макета, по порядку. */
export const PREVIEW_PALETTES: readonly PreviewPalette[] = [
  { bg: '#0D0D07', far: '#17170F', mid: '#26261F', a: '#C6FF2E', b: '#F2F2E8' },
  { bg: '#17170F', far: '#26261F', mid: '#3A3A32', a: '#FFE23D', b: '#F2F2E8' },
  { bg: '#060603', far: '#17170F', mid: '#26261F', a: '#C6FF2E', b: '#FF2E93' },
  { bg: '#0D0D07', far: '#17170F', mid: '#26261F', a: '#C6FF2E', b: '#FFE23D' },
  { bg: '#060603', far: '#17170F', mid: '#26261F', a: '#C6FF2E', b: '#FFE23D' },
] as const;

/** Вид по умолчанию: в ленте почти всё — бегуны. */
export const DEFAULT_PREVIEW_KIND: PreviewKind = 'runner';

/** Детерминированный хеш строки (тот же, что был у старого фона карточки). */
export function gameHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

const KIND_HINTS: ReadonlyArray<{ kind: PreviewKind; pattern: RegExp }> = [
  { kind: 'flappy', pattern: /flappy|bird|pipe|птиц|труб/i },
  { kind: 'shooter', pattern: /shooter|shoot|bullet|ship|enemy|asteroid|space|косм|кора?бл|враг|пул/i },
  { kind: 'catcher', pattern: /catcher|catch|basket|fruit|falling|лов|корзин|фрукт/i },
  { kind: 'blocks', pattern: /blocks|brick|paddle|breakout|арканоид|кирпич|платформ/i },
  { kind: 'runner', pattern: /runner|run|endless|jump|бег|раннер|забег/i },
];

/**
 * Вид сцены для игры.
 *
 * Порядок решения:
 * 1. явное указание в конфиге (`preview.kind` или `kind`) — если генератор
 *    когда-нибудь начнёт его писать, оно главнее догадок;
 * 2. подсказки в самом конфиге: имена спрайтов (`player`, `coin`, `enemy`),
 *    заголовок и название меню;
 * 3. иначе `runner` — единственный вид, который есть в обоих шаблонах.
 */
export function pickPreviewKind(config?: string | null): PreviewKind {
  const parsed = parseConfig(config);
  if (!parsed) return DEFAULT_PREVIEW_KIND;

  const explicit =
    readString(parsed, ['preview', 'kind']) ?? readString(parsed, ['kind']);
  if (explicit && isPreviewKind(explicit)) return explicit;

  const haystack = [
    readString(parsed, ['title']),
    readString(parsed, ['description']),
    readString(parsed, ['texts', 'menuTitle']),
    spriteNamesOf(parsed),
  ]
    .filter(Boolean)
    .join(' ');

  if (!haystack.trim()) return DEFAULT_PREVIEW_KIND;

  for (const hint of KIND_HINTS) {
    if (hint.pattern.test(haystack)) return hint.kind;
  }
  return DEFAULT_PREVIEW_KIND;
}

/** Сцена игры: вид из конфига, палитра и зерно — из id. */
export function sceneFor(gameId: string, config?: string | null): PreviewScene {
  const hash = gameHash(gameId);
  return {
    kind: pickPreviewKind(config),
    palette: PREVIEW_PALETTES[hash % PREVIEW_PALETTES.length],
    seed: 1 + (hash % 9),
  };
}

/** Имена спрайтов из конфига, одной строкой: по ним видно, что за игра. */
export function spriteNames(config?: string | null): string {
  const parsed = parseConfig(config);
  return parsed ? spriteNamesOf(parsed) : '';
}

function spriteNamesOf(parsed: Record<string, unknown>): string {
  const sprites = readObject(parsed, ['assets', 'sprites']);
  return sprites ? Object.keys(sprites).join(' ') : '';
}

function parseConfig(config?: string | null): Record<string, unknown> | null {
  if (!config || !config.trim()) return null;
  try {
    const value: unknown = JSON.parse(config);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readObject(
  source: Record<string, unknown>,
  path: string[],
): Record<string, unknown> | null {
  let node: unknown = source;
  for (const key of path) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
    node = (node as Record<string, unknown>)[key];
  }
  if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
  return node as Record<string, unknown>;
}

function readString(source: Record<string, unknown>, path: string[]): string | null {
  let node: unknown = source;
  for (const key of path) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === 'string' ? node : null;
}

function isPreviewKind(value: string): value is PreviewKind {
  return (
    value === 'runner' ||
    value === 'flappy' ||
    value === 'shooter' ||
    value === 'catcher' ||
    value === 'blocks'
  );
}

// --- Рисование -------------------------------------------------------------
// Ниже — перенос макета. Комментарии к геометрии не дублируются: смысл в
// том, что это те же числа, что в `game-render.js`, и вид совпадает с макетом.

const wrap = (x: number, m: number): number => ((x % m) + m) % m;
const hash = (i: number, s: number): number => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Контекст, которого достаточно для рисования: canvas или подделка в тесте. */
export type PreviewContext = {
  fillStyle: string | CanvasGradient | CanvasPattern;
} & Pick<
  CanvasRenderingContext2D,
  | 'fillRect'
  | 'beginPath'
  | 'arc'
  | 'fill'
  | 'moveTo'
  | 'lineTo'
  | 'closePath'
  | 'save'
  | 'restore'
  | 'translate'
  | 'rotate'
> &
  Partial<Pick<CanvasRenderingContext2D, 'roundRect' | 'rect'>>;

function rr(
  ctx: PreviewContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (w <= 0 || h <= 0) return;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  } else if (ctx.rect) {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
}

function dot(ctx: PreviewContext, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function runner(
  ctx: PreviewContext,
  W: number,
  H: number,
  t: number,
  c: PreviewPalette,
  seed: number,
): void {
  const gy = H * 0.7;
  for (let i = 0; i < 9; i += 1) {
    const bw = W * 0.26;
    const x = wrap(i * bw * 1.35 - t * 14, 9 * bw * 1.35) - bw;
    ctx.fillStyle = c.far;
    ctx.fillRect(x, gy - H * (0.09 + hash(i, seed) * 0.17), bw, H * (0.09 + hash(i, seed) * 0.17));
  }
  ctx.fillStyle = c.mid;
  ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = c.a;
  ctx.fillRect(0, gy - 3, W, 3);
  ctx.fillStyle = 'rgba(242,242,232,0.08)';
  for (let i = 0; i < 16; i += 1) {
    ctx.fillRect(wrap(i * W * 0.14 - t * 190, W * 2.24) - W * 0.14, gy + H * 0.06, W * 0.07, 3);
  }
  const span = W * 0.62;
  const spd = 175;
  const px = W * 0.24;
  const s = H * 0.058;
  ctx.fillStyle = c.b;
  for (let i = 0; i < 6; i += 1) {
    const x = wrap(i * span - t * spd, 6 * span) - span * 0.5;
    if (x > -s && x < W + s) rr(ctx, x, gy - s, s * 0.66, s, 4);
  }
  const u = wrap(t * spd + px + span * 0.5, span) / span;
  const jump = Math.pow(Math.max(0, Math.cos(u * Math.PI * 2)), 0.55) * H * 0.15;
  const ps = H * 0.055;
  ctx.fillStyle = c.a;
  rr(ctx, px - ps / 2, gy - ps - jump, ps, ps, 7);
  ctx.fillStyle = c.bg;
  ctx.fillRect(px - ps / 2 + ps * 0.52, gy - ps - jump + ps * 0.26, ps * 0.13, ps * 0.2);
  ctx.fillRect(px - ps / 2 + ps * 0.8, gy - ps - jump + ps * 0.26, ps * 0.13, ps * 0.2);
}

function flappy(
  ctx: PreviewContext,
  W: number,
  H: number,
  t: number,
  c: PreviewPalette,
  seed: number,
): void {
  for (let i = 0; i < 5; i += 1) {
    const cw = W * 0.34;
    const x = wrap(i * cw * 1.8 - t * 12, 5 * cw * 1.8) - cw;
    ctx.fillStyle = c.far;
    rr(ctx, x, H * (0.1 + hash(i, seed) * 0.5), cw, H * 0.045, 20);
  }
  const span = W * 0.56;
  const spd = 130;
  const bx = W * 0.3;
  const gap = H * 0.21;
  const pw = W * 0.15;
  const u = (t * spd) / span;
  const k = Math.floor(u);
  const gyAt = (i: number): number => H * (0.28 + hash(i, seed) * 0.38);
  for (let i = k - 1; i < k + 5; i += 1) {
    const x = bx + (i - u) * span;
    if (x < -pw || x > W + pw) continue;
    const g0 = gyAt(i);
    ctx.fillStyle = c.mid;
    rr(ctx, x - pw / 2, -10, pw, g0 - gap / 2 + 10, 10);
    rr(ctx, x - pw / 2, g0 + gap / 2, pw, H - g0 - gap / 2 + 10, 10);
    ctx.fillStyle = c.a;
    ctx.fillRect(x - pw / 2, g0 - gap / 2 - 6, pw, 6);
    ctx.fillRect(x - pw / 2, g0 + gap / 2, pw, 6);
  }
  const f = wrap(u, 1);
  const sm = f * f * (3 - 2 * f);
  const by = gyAt(k) + (gyAt(k + 1) - gyAt(k)) * sm + Math.sin(t * 9) * H * 0.006;
  const r = H * 0.025;
  ctx.fillStyle = c.b;
  dot(ctx, bx, by, r);
  ctx.fillStyle = c.bg;
  dot(ctx, bx + r * 0.35, by - r * 0.25, r * 0.19);
  ctx.fillStyle = c.a;
  ctx.beginPath();
  ctx.moveTo(bx + r * 0.8, by);
  ctx.lineTo(bx + r * 1.5, by + r * 0.2);
  ctx.lineTo(bx + r * 0.8, by + r * 0.42);
  ctx.fill();
}

function shooter(
  ctx: PreviewContext,
  W: number,
  H: number,
  t: number,
  c: PreviewPalette,
  seed: number,
): void {
  for (let i = 0; i < 46; i += 1) {
    const x = hash(i, seed) * W;
    const y = wrap(hash(i + 11, seed) * H + t * (18 + hash(i + 4, seed) * 60), H);
    ctx.fillStyle = 'rgba(242,242,232,' + (0.12 + hash(i + 7, seed) * 0.3) + ')';
    ctx.fillRect(x, y, 2, 2 + hash(i, seed) * 4);
  }
  const drift = Math.sin(t * 0.85) * W * 0.08;
  const es = W * 0.072;
  const cycle = wrap(t / 8, 1);
  for (let r = 0; r < 3; r += 1) {
    for (let col = 0; col < 5; col += 1) {
      if (hash(r * 5 + col, seed) < cycle * 0.7) continue;
      const x = W * 0.15 + col * W * 0.175 + drift;
      const y = H * 0.18 + r * H * 0.08 + Math.sin(t * 1.6 + col * 0.7) * 3;
      ctx.fillStyle = r === 0 ? c.b : c.mid;
      rr(ctx, x - es / 2, y - es / 2, es, es * 0.72, 5);
      ctx.fillStyle = c.bg;
      ctx.fillRect(x - es * 0.22, y - es * 0.1, es * 0.12, es * 0.14);
      ctx.fillRect(x + es * 0.1, y - es * 0.1, es * 0.12, es * 0.14);
    }
  }
  const sy = H * 0.8;
  const shipX = (tt: number): number => W * 0.5 + Math.sin(tt * 1.15) * W * 0.26;
  const T = 0.34;
  const life = 0.8;
  const bs = (H * 0.62) / life;
  ctx.fillStyle = c.a;
  for (let n = Math.ceil((t - life) / T); n <= Math.floor(t / T); n += 1) {
    rr(ctx, shipX(n * T) - 2, sy - (t - n * T) * bs - 14, 4, 14, 2);
  }
  const sx = shipX(t);
  const w = W * 0.09;
  ctx.beginPath();
  ctx.moveTo(sx, sy - w * 0.62);
  ctx.lineTo(sx + w / 2, sy + w * 0.38);
  ctx.lineTo(sx - w / 2, sy + w * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.b;
  rr(ctx, sx - w * 0.14, sy + w * 0.38, w * 0.28, H * 0.012 + Math.abs(Math.sin(t * 22)) * H * 0.012, 2);
}

function catcher(
  ctx: PreviewContext,
  W: number,
  H: number,
  t: number,
  c: PreviewPalette,
): void {
  const landY = H * 0.78;
  const fall = 250;
  const span = landY + H * 0.16;
  const bxAt = (tt: number): number => W * 0.5 + Math.sin(tt * 1.25) * W * 0.3;
  const s = W * 0.078;
  ctx.fillStyle = c.far;
  for (let i = 0; i < 4; i += 1) ctx.fillRect(0, H * (0.2 + i * 0.14), W, 1);
  for (let i = 0; i < 7; i += 1) {
    const y = wrap(t * fall + i * (span / 7), span) - H * 0.16;
    ctx.save();
    ctx.translate(bxAt(t + (landY - y) / fall), y);
    ctx.rotate(t * 1.5 + i);
    ctx.fillStyle = i % 2 ? c.b : c.a;
    rr(ctx, -s / 2, -s / 2, s, s, 6);
    ctx.restore();
  }
  const bw = W * 0.22;
  ctx.fillStyle = c.a;
  rr(ctx, bxAt(t) - bw / 2, landY, bw, H * 0.05, 9);
  ctx.fillStyle = c.mid;
  ctx.fillRect(0, H * 0.9, W, H * 0.1);
}

function blocks(
  ctx: PreviewContext,
  W: number,
  H: number,
  t: number,
  c: PreviewPalette,
  seed: number,
): void {
  const cols = 7;
  const rows = 4;
  const gapx = W * 0.012;
  const bw = (W * 0.9 - gapx * (cols - 1)) / cols;
  const bh = H * 0.028;
  const cycle = wrap(t / 11, 1);
  for (let r = 0; r < rows; r += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (hash(r * cols + col, seed) < cycle * 0.72) continue;
      ctx.fillStyle = r === 0 ? c.a : r === 1 ? c.b : c.mid;
      rr(ctx, W * 0.05 + col * (bw + gapx), H * 0.16 + r * (bh + H * 0.014), bw, bh, 4);
    }
  }
  const tri = (x: number): number => {
    const f = wrap(x, 1);
    return f < 0.5 ? f * 2 : 2 - f * 2;
  };
  ctx.fillStyle = c.b;
  dot(ctx, W * 0.07 + tri(t * 0.24) * W * 0.86, H * 0.42 + tri(t * 0.38) * H * 0.36, W * 0.019);
  const pw = W * 0.22;
  ctx.fillStyle = c.a;
  rr(ctx, W * 0.07 + tri(t * 0.24 - 0.035) * W * 0.86 - pw / 2, H * 0.86, pw, H * 0.016, 6);
}

const KINDS: Record<
  PreviewKind,
  (ctx: PreviewContext, W: number, H: number, t: number, c: PreviewPalette, seed: number) => void
> = { runner, flappy, shooter, catcher, blocks };

/**
 * Один кадр сцены в прямоугольнике `W`×`H`. Фон заливается палитрой сцены,
 * поэтому канвас не требует отдельной подложки.
 */
export function drawPreviewFrame(
  ctx: PreviewContext,
  width: number,
  height: number,
  time: number,
  scene: PreviewScene,
): void {
  const W = Math.round(width);
  const H = Math.round(height);
  if (!W || !H) return;

  ctx.fillStyle = scene.palette.bg;
  ctx.fillRect(0, 0, W, H);
  KINDS[scene.kind](ctx, W, H, time, scene.palette, scene.seed);
}

/** Кадр для статичной карточки: чуть дальше старта, чтобы сцена была «живой». */
export const STILL_FRAME_SECONDS = 2.4;
