import axios from 'axios';
import { errorMessage, taskErrorMessage } from '@/shared/api/axios-instance';

/**
 * Ошибки генерации по-русски по коду, а не по телу ответа.
 *
 * Шлюз отвечает `{ error: { code, message } }`; сообщение у него русское, но
 * у апстримов бывает английский технический текст и JSON правил Zod.
 * Поэтому пользователю показываем строку, выбранную по `code` (и по HTTP-
 * статусу, когда кода нет), а сырое тело не печатаем никогда.
 */

interface ErrorBody {
  error?: { code?: string; message?: string };
}

const QUOTA_TEXT =
  'Лимит генераций на сегодня исчерпан: 3 в сутки. Попробуй завтра — или собери игру в другой раз.';

export function apiErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError<ErrorBody>(error)) return undefined;
  return error.response?.data?.error?.code;
}

function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** Текст для ошибки POST /generate. */
export function generateErrorText(error: unknown): string {
  const code = apiErrorCode(error);
  const status = apiErrorStatus(error);

  switch (code) {
    case 'MODERATION_REJECTED':
      return 'Промпт не прошёл модерацию. Переформулируй запрос — без грубых и опасных формулировок.';
    case 'QUOTA_EXCEEDED':
    case 'RESOURCE_EXHAUSTED':
    case 'TOO_MANY_REQUESTS':
      return QUOTA_TEXT;
    case 'VALIDATION_ERROR':
      return 'Запрос не прошёл проверку: промпт 1–1500 символов, буквы русского или латинского алфавита, цифры и обычные знаки. Проверь текст и выбранную игру.';
    case 'NOT_FOUND':
      return 'Игра не найдена — выбери другую из ленты.';
    case 'UNAUTHORIZED':
      return 'Сессия истекла — войди заново.';
    case 'UNAVAILABLE':
      return 'Сервис генерации не отвечает. Попробуй через минуту.';
    case 'INTERNAL_ERROR':
      return 'Внутренняя ошибка на сервере. Попробуй ещё раз.';
    default:
      break;
  }

  // Кода может не быть (прокси, старый шлюз) — тогда решает статус.
  if (status === 429) return QUOTA_TEXT;
  if (status === 401) return 'Сессия истекла — войди заново.';
  if (status === 404) return 'Игра не найдена — выбери другую из ленты.';
  if (status === undefined) {
    return 'Нет связи с сервером. Проверь сеть и попробуй снова.';
  }
  // Шлюз на прочие коды отвечает по-русски, поэтому его текст допустим.
  return errorMessage(error);
}

/**
 * Коды, которые оркестратор кладёт в `errorCode` задачи. Всё остальное —
 * незнакомый код, и его английский `errorMessage` показывать нельзя.
 */
const TASK_ERROR_CODES = new Set([
  'INVALID_INPUT',
  'MODERATION_REJECTED',
  'IDEMPOTENCY_CONFLICT',
  'TEMPLATE_NOT_FOUND',
  'INVALID_MANIFEST',
  'AI_REFUSED',
  'CONFIG_SERVICE_FAILED',
  'ASSET_SERVICE_FAILED',
  'ASSET_GENERATOR_FAILED',
  'SAVE_GAME_FAILED',
  'TIMEOUT',
  'INTERNAL',
]);

/** Текст для задачи, завершившейся с ERROR. */
export function taskErrorText(
  code: string | undefined,
  message?: string,
): string {
  if (code === 'QUOTA_EXCEEDED') return QUOTA_TEXT;
  if (!code || !TASK_ERROR_CODES.has(code)) {
    return 'Не получилось собрать ремикс. Попробуй ещё раз.';
  }
  return taskErrorMessage(code, message);
}
