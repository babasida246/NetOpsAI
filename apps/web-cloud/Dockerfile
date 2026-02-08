# Production stage - use pre-built artifacts from local pnpm build
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace structure for proper dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages

# Copy package.json for dependency installation
COPY apps/web-cloud/package.json ./

# Install ALL dependencies (adapter-node needs @sveltejs/kit at runtime)
RUN pnpm install --no-frozen-lockfile

# Copy pre-built SvelteKit output (must run `pnpm build` first)
# SvelteKit builds to .svelte-kit/output in adapter-node mode
COPY apps/web-cloud/.svelte-kit/output/client ./client
COPY apps/web-cloud/.svelte-kit/output/server ./server

# Copy custom handler.js for static file serving
COPY apps/web-cloud/handler.js ./handler.js

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_BASE_URL=${BACKEND_BASE_URL:-http://cloud-api:3000}

# Start the app with custom handler
CMD ["node", "handler.js"]
