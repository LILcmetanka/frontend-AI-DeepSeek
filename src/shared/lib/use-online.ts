'use client';

import { useEffect, useState } from 'react';

/**
 * Состояние сети браузера. `navigator.onLine` не гарантия: он врёт, когда
 * сеть есть, а шлюз недоступен, поэтому окончательное решение по экрану
 * принимает ошибка запроса (`isNetworkError`), а этот флаг — для подписи
 * «нет сети» и мгновенной реакции на возвращение связи.
 *
 * На сервере и до монтирования считаем, что сеть есть: иначе разметка
 * сервера и клиента разойдётся.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return online;
}
