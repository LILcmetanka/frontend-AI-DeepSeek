'use client';

import { useEffect, useState } from 'react';
import { getAccessToken, onAuthChanged } from './auth';

/**
 * Есть ли живой access-токен в этой вкладке.
 *
 * На сервере localStorage нет, поэтому первый рендер всегда «гость» —
 * состояние уточняется в эффекте. Так разметка на сервере и при гидратации
 * совпадает, а переключающееся меню не ломает SSR.
 */
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(getAccessToken() !== null);
    return onAuthChanged(() => setSignedIn(getAccessToken() !== null));
  }, []);

  return signedIn;
}
