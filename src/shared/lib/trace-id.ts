/**
 * Код запроса для разбора ошибки (Э27, ADR-0042).
 *
 * Шлюз отдаёт `X-Trace-ID` в каждом ответе и разрешает браузеру читать его
 * (`Access-Control-Expose-Headers`). Если человек видит ошибку, этот код —
 * единственное, по чему поддержка найдёт весь путь запроса в логах.
 *
 * Разбор нарочно без axios: работаем с тем, что реально приходит в
 * `error.response.headers` (AxiosHeaders с `get` или обычный объект) и не
 * тянем зависимость в компонент.
 */

export const TRACE_ID_HEADER = 'x-trace-id';

/** Та же форма, что у шлюза: 32 шестнадцатеричных символа. */
export const TRACE_ID_LENGTH = 32;

const HEX = /^[0-9a-f]+$/i;

/** Принимает только валидный id и приводит его к нижнему регистру. */
export function normalizeTraceId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;

  const value = raw.trim();
  if (value.length !== TRACE_ID_LENGTH || !HEX.test(value)) return undefined;

  return value.toLowerCase();
}

/** Значение заголовка из `headers` ответа: AxiosHeaders или обычный объект. */
export function traceIdFromHeaders(headers: unknown): string | undefined {
  if (headers === null || typeof headers !== 'object') return undefined;

  const withGet = headers as { get?: (name: string) => unknown };
  const raw =
    typeof withGet.get === 'function'
      ? withGet.get.call(headers, TRACE_ID_HEADER)
      : (headers as Record<string, unknown>)[TRACE_ID_HEADER];

  return normalizeTraceId(raw);
}

/** Код запроса из ошибки axios: есть только у ответа сервера, не у обрыва. */
export function traceIdFromError(error: unknown): string | undefined {
  if (error === null || typeof error !== 'object') return undefined;

  const response = (error as { response?: { headers?: unknown } }).response;

  return traceIdFromHeaders(response?.headers);
}
