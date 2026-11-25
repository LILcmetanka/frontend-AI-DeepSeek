import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  clearSessionResult,
  formatDuration,
  readSessionResult,
  saveSessionResult,
  type SessionResult,
} from './session-result.ts';

/** Поддельный sessionStorage: тот же контракт, что у браузерного. */
class FakeStorage {
  private readonly items = new Map<string, string>();

  /** Если true — setItem бросает, как в приватном режиме с переполнением. */
  throwOnSet = false;

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw new Error('quota exceeded');
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

const storage = new FakeStorage();

beforeEach(() => {
  storage.throwOnSet = false;
  (globalThis as { window?: unknown }).window = { sessionStorage: storage };
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

function store(value: unknown): void {
  storage.setItem('hookster:last-session', JSON.stringify(value));
}

const VALID: SessionResult = {
  gameId: 'g-1',
  title: 'Гонка',
  authorId: 'a-1',
  durationSec: 42,
  finishedAt: 1_700_000_000_000,
};

test('formatDuration: минуты и секунды с ведущим нулём', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(7), '0:07');
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(768), '12:48');
});

test('formatDuration: округление и отрицательное время', () => {
  assert.equal(formatDuration(59.6), '1:00');
  assert.equal(formatDuration(-30), '0:00');
});

test('readSessionResult: без записи — null', () => {
  assert.equal(readSessionResult(), null);
});

test('readSessionResult: валидная запись возвращается как есть', () => {
  store(VALID);

  assert.deepEqual(readSessionResult(), VALID);
});

test('readSessionResult: битый JSON и не объект — null', () => {
  storage.setItem('hookster:last-session', '{не json');
  assert.equal(readSessionResult(), null);

  store([VALID]);
  assert.equal(readSessionResult(), null);

  store('строка');
  assert.equal(readSessionResult(), null);
});

test('readSessionResult: без gameId или с нечисловой длительностью — null', () => {
  store({ ...VALID, gameId: '' });
  assert.equal(readSessionResult(), null);

  store({ ...VALID, durationSec: 'много' });
  assert.equal(readSessionResult(), null);

  store({ ...VALID, durationSec: Number.NaN });
  assert.equal(readSessionResult(), null);
});

test('readSessionResult: длительность округляется, очки — только числом', () => {
  store({ ...VALID, durationSec: 41.6, score: 120 });

  const withScore = readSessionResult();
  assert.equal(withScore?.durationSec, 42);
  assert.equal(withScore?.score, 120);

  store({ ...VALID, score: '120' });
  assert.equal(readSessionResult()?.score, undefined);
});

test('readSessionResult: пустые title/authorId и нет finishedAt — подставляются', () => {
  store({ gameId: 'g-2', durationSec: 5 });

  const result = readSessionResult();
  assert.equal(result?.title, '');
  assert.equal(result?.authorId, '');
  assert.equal(typeof result?.finishedAt, 'number');
});

test('saveSessionResult: запись читается обратно', () => {
  saveSessionResult(VALID);

  assert.deepEqual(readSessionResult(), VALID);
});

test('saveSessionResult: отказ хранилища не бросает наружу', () => {
  storage.throwOnSet = true;

  assert.doesNotThrow(() => saveSessionResult(VALID));
});

test('clearSessionResult: запись удаляется', () => {
  saveSessionResult(VALID);
  clearSessionResult();

  assert.equal(readSessionResult(), null);
});
