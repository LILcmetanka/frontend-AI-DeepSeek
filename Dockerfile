# Образ frontend: deps → build (standalone) → runtime.
#
# NEXT_PUBLIC_API_URL вшивается в бандл на этапе сборки: браузер ходит на
# шлюз по адресу с хоста, а не по имени контейнера.

FROM node:24-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --fund=false

FROM deps AS build
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_GAME_URL=http://localhost:8081
ARG NEXT_PUBLIC_SPRITE_BASE_URL=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_GAME_URL=${NEXT_PUBLIC_GAME_URL}
ENV NEXT_PUBLIC_SPRITE_BASE_URL=${NEXT_PUBLIC_SPRITE_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node

EXPOSE 3000
CMD ["node", "server.js"]
