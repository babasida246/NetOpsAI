FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/edge-api/package.json ./apps/edge-api/
COPY packages ./packages

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

COPY apps/edge-api/dist ./apps/edge-api/dist
COPY apps/edge-api/migrations ./apps/edge-api/migrations
COPY apps/edge-api/seed ./apps/edge-api/seed

WORKDIR /app/apps/edge-api

ENV NODE_ENV=production
ENV EDGE_BIND_HOST=0.0.0.0
ENV EDGE_PORT=3002

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3002/health || exit 1

CMD ["node", "dist/main.js"]
