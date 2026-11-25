import { test } from 'node:test';
import assert from 'node:assert/strict';

import { authorHandle } from './author.ts';

test('authorHandle: короткий хвост id с @', () => {
  assert.equal(authorHandle('0359429c-6ffa-445d-89da-f9f5e73648d7'), '@0359429c');
});

test('authorHandle: восемь символов — ровно столько, сколько нужно', () => {
  const handle = authorHandle('abcdefgh');

  assert.equal(handle, '@abcdefgh');
  assert.equal(handle.length, 9);
});

test('authorHandle: пустой или отсутствующий автор', () => {
  assert.equal(authorHandle(''), '@неизвестный');
  assert.equal(authorHandle('   '), '@неизвестный');
});
