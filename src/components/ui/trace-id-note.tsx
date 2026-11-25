'use client';

import { useState } from 'react';

import { traceIdFromError, traceIdFromHeaders } from '@/shared/lib/trace-id';

/**
 * Строка «код запроса» под сообщением об ошибке (Э27, ADR-0042).
 *
 * Показываем только когда сервер действительно ответил: у обрыва связи
 * ответа нет, и придумывать код нельзя. По кнопке кладём id в буфер —
 * человеку нужно передать его в поддержку, а не переписать руками.
 */
export function TraceIdNote({
  error,
  headers,
  className = '',
}: {
  error?: unknown;
  headers?: unknown;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const traceId =
    error !== undefined ? traceIdFromError(error) : traceIdFromHeaders(headers);
  if (!traceId) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(traceId ?? '');
      setCopied(true);
    } catch {
      // Буфер недоступен (http-origin, запрет) — id виден на экране,
      // его можно выделить руками. Ошибку не показываем.
    }
  }

  return (
    <p
      data-trace-id={traceId}
      className={`mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[11px] leading-[1.4] text-ink-mute ${className}`}
    >
      <span>код запроса</span>
      <span className="select-all">{traceId}</span>
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded-pill border border-line px-2 py-0.5 font-sans text-[11px] font-bold text-ink-soft transition-colors hover:border-acid hover:text-acid"
      >
        {copied ? 'скопировано' : 'скопировать'}
      </button>
      <span className="w-full font-sans text-[11px] text-ink-mute">
        назовите этот код при обращении
      </span>
    </p>
  );
}
