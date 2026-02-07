# Production stage - use pre-built artifacts from local pnpm build
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy pre-built artifacts from local build (must run `pnpm build` first)
COPY --chown=nodejs:nodejs packages/domain/dist packages/domain/dist/
COPY --chown=nodejs:nodejs packages/domain/package.json packages/domain/
COPY --chown=nodejs:nodejs packages/contracts/dist packages/contracts/dist/
COPY --chown=nodejs:nodejs packages/contracts/package.json packages/contracts/
COPY --chown=nodejs:nodejs packages/application/dist packages/application/dist/
COPY --chown=nodejs:nodejs packages/application/package.json packages/application/
COPY --chown=nodejs:nodejs packages/config/dist packages/config/dist/
COPY --chown=nodejs:nodejs packages/config/package.json packages/config/
COPY --chown=nodejs:nodejs packages/infra-postgres/dist packages/infra-postgres/dist/
COPY --chown=nodejs:nodejs packages/infra-postgres/package.json packages/infra-postgres/
COPY --chown=nodejs:nodejs packages/infra-redis/dist packages/infra-redis/dist/
COPY --chown=nodejs:nodejs packages/infra-redis/package.json packages/infra-redis/
COPY --chown=nodejs:nodejs packages/infra-vector/dist packages/infra-vector/dist/
COPY --chown=nodejs:nodejs packages/infra-vector/package.json packages/infra-vector/
COPY --chown=nodejs:nodejs packages/observability/dist packages/observability/dist/
COPY --chown=nodejs:nodejs packages/observability/package.json packages/observability/
COPY --chown=nodejs:nodejs packages/providers/dist packages/providers/dist/
COPY --chown=nodejs:nodejs packages/providers/package.json packages/providers/
COPY --chown=nodejs:nodejs packages/security/dist packages/security/dist/
COPY --chown=nodejs:nodejs packages/security/package.json packages/security/
COPY --chown=nodejs:nodejs packages/tools/dist packages/tools/dist/
COPY --chown=nodejs:nodejs packages/tools/package.json packages/tools/
COPY --chown=nodejs:nodejs apps/gateway-mcp/dist apps/gateway-mcp/dist/
COPY --chown=nodejs:nodejs apps/gateway-mcp/package.json apps/gateway-mcp/

# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

USER nodejs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "apps/gateway-mcp/dist/server.js"]
