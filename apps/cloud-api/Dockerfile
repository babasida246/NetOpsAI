# Production stage - use pre-built artifacts from local pnpm build
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy package files for workspace structure
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cloud-api/package.json ./apps/cloud-api/
COPY packages ./packages

# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Copy pre-built artifacts from local build (must run `pnpm build` first)
COPY apps/cloud-api/dist ./apps/cloud-api/dist
COPY apps/cloud-api/locales ./apps/cloud-api/locales
COPY apps/cloud-api/migrations ./apps/cloud-api/migrations

# Set working directory
WORKDIR /app/apps/cloud-api

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Start app
CMD ["node", "dist/main.js"]
