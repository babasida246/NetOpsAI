# Production stage - use pre-built artifacts from local pnpm build
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy package files for workspace structure
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Copy package.json for each workspace package (for dependency resolution)
COPY packages/domain/package.json ./packages/domain/
COPY packages/security/package.json ./packages/security/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/application/package.json ./packages/application/
COPY packages/config/package.json ./packages/config/
COPY packages/infra-postgres/package.json ./packages/infra-postgres/
COPY packages/infra-redis/package.json ./packages/infra-redis/
COPY packages/infra-vector/package.json ./packages/infra-vector/
COPY packages/infra-netdevice/package.json ./packages/infra-netdevice/
COPY packages/observability/package.json ./packages/observability/
COPY packages/providers/package.json ./packages/providers/
COPY packages/tools/package.json ./packages/tools/

# Copy pre-built artifacts from local build (must run `pnpm build` first)
COPY apps/api/dist ./apps/api/dist
COPY apps/api/locales ./apps/api/locales
COPY apps/api/migrations ./apps/api/migrations

# Copy pre-built packages
COPY packages/domain/dist ./packages/domain/dist
COPY packages/security/dist ./packages/security/dist
COPY packages/contracts/dist ./packages/contracts/dist
COPY packages/application/dist ./packages/application/dist
COPY packages/config/dist ./packages/config/dist
COPY packages/infra-postgres/dist ./packages/infra-postgres/dist
COPY packages/infra-redis/dist ./packages/infra-redis/dist
COPY packages/infra-vector/dist ./packages/infra-vector/dist
COPY packages/infra-netdevice/dist ./packages/infra-netdevice/dist
COPY packages/observability/dist ./packages/observability/dist
COPY packages/providers/dist ./packages/providers/dist
COPY packages/tools/dist ./packages/tools/dist

# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Set working directory
WORKDIR /app/apps/api

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health/live || exit 1

# Start app
CMD ["node", "dist/main.js"]
