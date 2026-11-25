/**
 * Подпись автора игры.
 *
 * Публичного профиля в API нет: есть только `GET /profile/me` (свой логин)
 * и `GET /profile/me/games` (свои игры). Поэтому в карточке — короткий
 * хвост `authorId`, как в макете `@uuid`. Функция одна на весь фронт: когда
 * в контракте появится автор с именем, меняется только она.
 */

/** Сколько символов id показываем: хватает, чтобы отличать авторов. */
const HANDLE_LENGTH = 8;

export function authorHandle(authorId: string): string {
  const id = (authorId || '').trim();
  if (id === '') return '@неизвестный';
  return `@${id.slice(0, HANDLE_LENGTH)}`;
}
