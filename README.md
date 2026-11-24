# frontend — веб-клиент Hookster

Next.js App Router: лента, плеер игры, AI Studio, профиль, вход по коду.
Стек — по `HOOKSTER_FRONTEND_GUIDELINES.md`: TypeScript, Tailwind v4,
TanStack Query, Axios, Zod, React Hook Form, Zustand (пока не понадобился).

## Маршруты

| Путь | Что показывает |
|---|---|
| `/` | входная страница |
| `/feed` | лента; пока шлюз отвечает 501 (нет RPC GetFeed), есть переход по id игры |
| `/feed/[gameId]` | карточка игры, плеер SubwaySurf в iframe (`GET /feed/{gameId}`) |
| `/create` | AI Studio: сообщение → задача → статус (`POST /generate`, `GET /generate/{taskId}`) |
| `/login` | вход по OTP (`/auth/otp/send`, `/auth/otp/verify`) |
| `/profile` | профиль (`GET /profile/me`) |

## Переменные

| Переменная | По умолчанию |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` |
| `NEXT_PUBLIC_GAME_URL` | `http://localhost:8081` (сборка SubwaySurf) |
| `NEXT_PUBLIC_SPRITE_BASE_URL` | пусто — спрайты от origin игры |

`NEXT_PUBLIC_*` вшивается в бандл при сборке: в Docker это build-arg,
поэтому адрес шлюза должен быть виден из браузера, а не из контейнера.

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
npm run build
```

## Ограничения

- `GET /feed` отдаёт 501: в контракте `hookkster/contracts` нет `GetFeed`
  (ADR-0011). Лента показывается как пустая с объяснением.
- Плеер SubwaySurf работает на моках: конфиг и спрайты приходят из ответа
  delivery, живые S3-ассеты зависят от ключей владельца (ADR-0005).
- Apicraft-генерация клиента не включена: `openapi.yaml` лежит в
  `docs-AI-DeepSeek`, а сгенерированный код без стабильного контракта
  быстро устареет. Сейчас API-слой — типизированные функции в
  `src/shared/api/axios-instance.ts`.
