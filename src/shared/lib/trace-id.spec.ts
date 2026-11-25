import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TRACE_ID_LENGTH,
  normalizeTraceId,
  traceIdFromError,
  traceIdFromHeaders,
} from './trace-id.ts';

const VALID = '0123456789abcdef0123456789abcdef';

test('normalizeTraceId: валидный id приводится к нижнему регистру', () => {
  assert.equal(normalizeTraceId(VALID.toUpperCase()), VALID);
});

test('normalizeTraceId: пробелы по краям срезаются', () => {
  assert.equal(normalizeTraceId(`  ${VALID}  `), VALID);
});

test('normalizeTraceId: форма и длина проверяются', () => {
  for (const raw of [
    'abc123',
    `${VALID}00`,
    'z'.repeat(TRACE_ID_LENGTH),
    '',
    undefined,
    null,
    42,
  ]) {
    assert.equal(normalizeTraceId(raw), undefined, `приняли ${String(raw)}`);
  }
});

test('traceIdFromHeaders: AxiosHeaders с get', () => {
  const headers = {
    get: (name: string) =>
      name.toLowerCase() === 'x-trace-id' ? VALID : undefined,
  };

  assert.equal(traceIdFromHeaders(headers), VALID);
});

test('traceIdFromHeaders: обычный объект и мусор', () => {
  assert.equal(traceIdFromHeaders({ 'x-trace-id': VALID }), VALID);
  assert.equal(traceIdFromHeaders({ 'x-trace-id': 'мусор' }), undefined);
  assert.equal(traceIdFromHeaders(null), undefined);
  assert.equal(traceIdFromHeaders('строка'), undefined);
});

test('traceIdFromError: у обрыва связи ответа нет — кода тоже', () => {
  assert.equal(traceIdFromError({ message: 'Network Error' }), undefined);
  assert.equal(traceIdFromError(undefined), undefined);
  assert.equal(traceIdFromError(new Error('boom')), undefined);
});

test('traceIdFromError: у ответа сервера код берётся из заголовков', () => {
  const error = { response: { status: 500, headers: { 'x-trace-id': VALID } } };

  assert.equal(traceIdFromError(error), VALID);
});
