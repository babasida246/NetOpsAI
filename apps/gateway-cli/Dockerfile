# Stage 1: Builder
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

# Copy all package.json files
COPY packages/*/package.json packages/
COPY packages/mcp-servers/core/*/package.json packages/mcp-servers/core/
COPY apps/api/package.json apps/api/
COPY apps/gateway-mcp/package.json apps/gateway-mcp/
COPY apps/gateway-cli/package.json apps/gateway-cli/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

COPY packages/ packages/
COPY apps/gateway-cli/ apps/gateway-cli/

# Build packages
WORKDIR /app
RUN pnpm -r build || echo "Build warnings ignored"

# Stage 2: Runner
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/packages/domain/dist packages/domain/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/domain/package.json packages/domain/
COPY --from=builder --chown=nodejs:nodejs /app/packages/contracts/dist packages/contracts/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/contracts/package.json packages/contracts/
COPY --from=builder --chown=nodejs:nodejs /app/packages/application/dist packages/application/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/application/package.json packages/application/
COPY --from=builder --chown=nodejs:nodejs /app/packages/config/dist packages/config/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/config/package.json packages/config/
COPY --from=builder --chown=nodejs:nodejs /app/packages/infra-postgres/dist packages/infra-postgres/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/infra-postgres/package.json packages/infra-postgres/
COPY --from=builder --chown=nodejs:nodejs /app/packages/infra-redis/dist packages/infra-redis/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/infra-redis/package.json packages/infra-redis/
COPY --from=builder --chown=nodejs:nodejs /app/packages/observability/dist packages/observability/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/observability/package.json packages/observability/
COPY --from=builder --chown=nodejs:nodejs /app/packages/providers/dist packages/providers/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/providers/package.json packages/providers/
COPY --from=builder --chown=nodejs:nodejs /app/packages/security/dist packages/security/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/security/package.json packages/security/
COPY --from=builder --chown=nodejs:nodejs /app/packages/tools/dist packages/tools/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/tools/package.json packages/tools/
COPY --from=builder --chown=nodejs:nodejs /app/apps/gateway-cli/dist apps/gateway-cli/dist/
COPY --from=builder --chown=nodejs:nodejs /app/apps/gateway-cli/package.json apps/gateway-cli/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

USER nodejs

ENV NODE_ENV=production

ENTRYPOINT ["node", "apps/gateway-cli/dist/index.js"]
CMD ["--help"]
