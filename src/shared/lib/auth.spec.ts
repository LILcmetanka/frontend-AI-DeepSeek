import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isTokenExpired } from './auth.ts';

/** Собрать JWT-подобную строку с нужным payload: подпись не проверяется. */
function tokenWith(payload: unknown): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(payload)}.подпись`;
}

const NOW_MS = 1_700_000_000_000;

test('isTokenExpired: живой токен не истёк', () => {
  const token = tokenWith({ exp: NOW_MS / 1000 + 300 });

  assert.equal(isTokenExpired(token, NOW_MS), false);
});

test('isTokenExpired: истёкший токен', () => {
  const token = tokenWith({ exp: NOW_MS / 1000 - 10 });

  assert.equal(isTokenExpired(token, NOW_MS), true);
});

test('isTokenExpired: запас 30 секунд — почти истёкший считается истёкшим', () => {
  const almost = tokenWith({ exp: NOW_MS / 1000 + 20 });
  const withReserve = tokenWith({ exp: NOW_MS / 1000 + 40 });

  assert.equal(isTokenExpired(almost, NOW_MS), true);
  assert.equal(isTokenExpired(withReserve, NOW_MS), false);
});

test('isTokenExpired: мусор считается истёкшим', () => {
  for (const token of ['', 'не-jwt', 'a.b', '...', 'a.%%%.c']) {
    assert.equal(isTokenExpired(token, NOW_MS), true, `приняли ${token}`);
  }
});

test('isTokenExpired: без числового exp — не истёк (решает сервер)', () => {
  assert.equal(isTokenExpired(tokenWith({ sub: 'u-1' }), NOW_MS), false);
  assert.equal(isTokenExpired(tokenWith({ exp: 'много' }), NOW_MS), false);
});
