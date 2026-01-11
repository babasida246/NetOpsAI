# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/
COPY tsconfig.base.json ./

# Copy source code (workspace)
COPY apps/api ./apps/api
COPY packages ./packages

# Install dependencies (after sources are in place to keep workspace links)
RUN pnpm install --frozen-lockfile

# Build workspace deps needed by API
RUN pnpm --filter @tools/registry build

# Build API
WORKDIR /app/apps/api
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/

# Copy built artifacts and packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages ./packages

# Install production dependencies only (after packages copied)
RUN pnpm install --frozen-lockfile --prod

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

# Start
CMD ["node", "dist/main.js"]
