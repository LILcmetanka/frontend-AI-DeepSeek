# frontend — веб-клиент Hookster

Next.js App Router: лента, плеер игры, AI Studio, профиль, вход по коду.
Стек — по `HOOKSTER_FRONTEND_GUIDELINES.md`: TypeScript, Tailwind v4,
TanStack Query, Axios, Zod, React Hook Form, Zustand (пока не понадобился).

## Маршруты

| Путь | Что показывает |
|---|---|
| `/` | витрина продукта (логотип, заголовок, два выхода) |
| `/feed` | лента карточек со свайпом и клавишами, догрузка, конец ленты |
| `/feed/[gameId]` | карточка игры, плеер SubwaySurf в iframe (`GET /feed/{gameId}`) |
| `/create` | AI Studio (нужен вход): сообщение → задача → статус (`POST /generate`, `GET /generate/{taskId}`) |
| `/login` | вход по OTP (`/auth/otp/send`, `/auth/otp/verify`) |
| `/profile` | профиль (нужен вход, `GET /profile/me`) |

## Переменные

| Переменная | По умолчанию |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` |
| `NEXT_PUBLIC_GAME_URL` | `http://localhost:8081` (сборка SubwaySurf) |
| `NEXT_PUBLIC_SPRITE_BASE_URL` | пусто — спрайты от origin игры |

`NEXT_PUBLIC_*` вшивается в бандл при сборке: в Docker это build-arg,
поэтому адрес шлюза должен быть виден из браузера, а не из контейнера.

## Вход и сессия

- `src/shared/lib/auth.ts`: access-токен в `localStorage`, refresh — HttpOnly-кука
  шлюза (`withCredentials`). Параллельные 401 ждут один `/auth/refresh`.
- `axios-instance.ts`: на 401 один повтор запроса после refresh; ошибки `/auth/*`
  не обновляются (неверный код — это не истёкшая сессия).
- `RequireAuth` защищает `/profile` и `/create`: живой токен или refresh по куке,
  иначе редирект на `/login?next=…`; после входа возвращает на `next`.
- В шапке и сайдбаре — вход/выход и переключатель темы.
- Шлюз ждёт `{identifier, type}` и телефон в E.164 без плюса; клиент убирает
  из номера всё кроме цифр и меняет ведущую 8 на 7.

## Плеер

`src/shared/lib/game-player.tsx` встраивает SubwaySurf в iframe и держит
мост на `postMessage`: игра присылает `hookster:ready`, страница отвечает
`hookster:mount` с конфигом игры и базой спрайтов, обратно идут события
`play_start` / `play_finish` / `skip` — страница пересылает их в
`POST /events`. Протокол — `SubwaySurf-AI-DeepSeek/docs/EMBED.md`.

Если `NEXT_PUBLIC_GAME_URL` пуст, плеера нет: страница показывает конфиг
и предупреждение.

## Локально

```bash
npm ci
cp .env.example .env.local
npm run dev      # http://localhost:3000
npm run lint
npm run typecheck
npm test         # чистые модули, node --test
npm run build
```

## Дизайн-система

Источник правды — `Hookster-AI/design/gaming-feed-design/uploads/Hookster дизайн-система (2)`
(`readme.md`, `tokens/*.css`, `guidelines/`). В коде:

- `src/app/globals.css` — палитра и шкалы из `tokens/*.css` в Tailwind `@theme`;
  семантические токены — ссылки на палитру, поэтому темы меняются значениями.
  Ссылаться на палитру надо как `var(--color-lime-300)` — `var(--lime-300)`
  не существует и свойство молча станет невалидным.
- `src/components/brand/brand.tsx` — `HooksterMark`, `HooksterFace`,
  `HooksterAppIcon`, `HooksterLockup`, `Mascot`. SVG из системы — `public/brand/logo/`.
- `src/components/ui/controls.tsx` — кнопки (8 видов × 4 размера), поле, поле
  промпта, чипы, бейджи, сообщения; `components/ui/empty-state.tsx` — пустое
  состояние с маскотом.
- `src/shared/lib/theme.ts` — тема `hookster:theme` в `localStorage`, тёмная по
  умолчанию, скрипт в `<head>` ставит атрибут до первой отрисовки.

Правила: одна лаймовая primary-кнопка на экран; маскот — только пустые
состояния и загрузка; иконки — контуры lucide `strokeWidth={2.5}`; тексты
строчными, «на ты», без канцелярита. Решения — ADR-0044, ADR-0045.

## Тесты

Раннера в проекте нет и новых пакетов не ставим: `npm test` — это
`node --test "src/**/*.spec.ts"`. Node 24 исполняет TypeScript сам
(type stripping), поэтому спек-файл импортирует модуль с явным `.ts`
(в `tsconfig.json` из-за этого включён `allowImportingTsExtensions`).

Покрыто то, что легко сломать незаметно и что не требует браузера:

| Файл | Что проверяется |
|---|---|
| `shared/lib/trace-id.spec.ts` | разбор `X-Trace-ID` из заголовков (`AxiosHeaders` и обычный объект), форма и длина, у обрыва связи кода нет |
| `shared/lib/author.spec.ts` | подпись автора: восемь символов, `@неизвестный` на пустом id |
| `shared/lib/session-result.spec.ts` | `formatDuration`, чтение итога сессии из `sessionStorage` (битый JSON, пустой `gameId`, нечисловая длительность, очки только числом), `save`/`clear` |
| `shared/lib/auth.spec.ts` | `isTokenExpired`: запас 30 секунд, мусор, payload без `exp` |

`shared/lib/game-package.ts` проверяется отдельно — `npm run
check:package` (SRI, разбор `integrity`, `buildPackageDocument`).
Браузерные проверки (лента, плеер, мобильный набор, офлайн) живут в
umbrella: `make edge`, `make smoke`, `scripts/browser-check/*`.

## Ограничения

- `GET /feed` отдаёт 501: в контракте `hookkster/contracts` нет `GetFeed`
  (ADR-0011). Лента показывается как пустая с объяснением.
- Плеер SubwaySurf работает на моках: конфиг и спрайты приходят из ответа
  delivery, живые S3-ассеты зависят от ключей владельца (ADR-0005).
- Apicraft-генерация клиента не включена: `openapi.yaml` лежит в
  `docs-AI-DeepSeek`, а сгенерированный код без стабильного контракта
  быстро устареет. Сейчас API-слой — типизированные функции в
  `src/shared/api/axios-instance.ts`.
