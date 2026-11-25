// Проверка чистой логики режима пакета (FU_0006) без тест-раннера:
// в проекте его нет, а тянуть vitest ради пяти функций незачем.
// Node 24 исполняет .ts напрямую (type stripping), импортов в модуле нет.
//
// Запуск: npm run check:package

import assert from 'node:assert/strict';
import {
  buildPackageDocument,
  isPackageGame,
  parseIntegrity,
  toBase64,
  verifyIntegrity,
} from '../src/shared/lib/game-package.ts';

let passed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

await check('isPackageGame: .js — пакет', () => {
  assert.equal(isPackageGame('http://localhost:9000/games/templates/racing/v1.0.0/index.js'), true);
  assert.equal(isPackageGame('https://cdn.example.com/a/index.mjs?v=2'), true);
  assert.equal(isPackageGame('http://localhost:8081/?embed=1'), false);
  assert.equal(isPackageGame(''), false);
  assert.equal(isPackageGame(undefined), false);
  assert.equal(isPackageGame('https://example.com/game.zip'), false);
});

await check('parseIntegrity: SRI-токены', () => {
  assert.deepEqual(parseIntegrity('sha384-abc+/def=='), { algorithm: 'SHA-384', digest: 'abc+/def==' });
  assert.deepEqual(parseIntegrity('md5-x sha256-AAA'), { algorithm: 'SHA-256', digest: 'AAA' });
  assert.equal(parseIntegrity('sha1-AAA'), null);
  assert.equal(parseIntegrity(''), null);
});

await check('verifyIntegrity: совпало, не совпало, без суммы', async () => {
  const code = 'export function startGame() { return true; }';
  const digest = await crypto.subtle.digest('SHA-384', new TextEncoder().encode(code));
  const integrity = `sha384-${toBase64(new Uint8Array(digest))}`;

  assert.equal(await verifyIntegrity(code, integrity), 'ok');
  assert.equal(await verifyIntegrity(`${code} // подмена`, integrity), 'mismatch');
  assert.equal(await verifyIntegrity(code, ''), 'no-integrity');
  assert.equal(await verifyIntegrity(code, null), 'no-integrity');
  assert.equal(await verifyIntegrity(code, integrity, null), 'unsupported');
});

await check('verifyIntegrity: base64 без «=» тоже сходится', async () => {
  const code = 'export function startGame() {}';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  const integrity = `sha256-${toBase64(new Uint8Array(digest)).replace(/=+$/, '')}`;
  assert.equal(await verifyIntegrity(code, integrity), 'ok');
});

await check('buildPackageDocument: код и конфиг внутри, теги не ломают документ', () => {
  const doc = buildPackageDocument({
    code: 'export function startGame(){ const s = "</script><b>"; return s; }',
    config: { speed: 7, note: '</script>' },
    gameId: 'g-1',
    userId: 'u-1',
    spriteBaseUrl: 'http://localhost:9000/games',
  });

  assert.match(doc, /<div id="hookster-root"><\/div>/);
  assert.match(doc, /sandbox|hookster-runner/);
  assert.match(doc, /startGame/);
  // Ни код, ни конфиг не должны закрывать тег script раньше времени.
  const closings = doc.match(/<\/script>/g) ?? [];
  assert.equal(closings.length, 1, 'ожидался ровно один закрывающий тег script');
  assert.match(doc, /<\\\/script>/);
  assert.match(doc, /const gameId = "g-1";/);
  assert.match(doc, /spriteBaseUrl/);
});

await check('buildPackageDocument: пустой конфиг не ломает документ', () => {
  const doc = buildPackageDocument({
    code: 'export function startGame() {}',
    config: null,
    gameId: 'g',
    userId: 'u',
    spriteBaseUrl: '',
  });
  assert.match(doc, /const config = \{\};/);
});

console.log(`\n${passed} проверок прошло`);
