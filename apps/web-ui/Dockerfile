# Build stage
FROM node:20-alpine AS builder

# Install pnpm (match workspace lockfile version)
RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy all packages (dependencies)
COPY packages ./packages
COPY apps/web-ui ./apps/web-ui

# Install dependencies
# Allow regenerating/updating the lockfile in the build container when it is out-of-date
# (keeps builds working if workspace package.json changed but lockfile not updated). In CI
# you may prefer to keep `--frozen-lockfile` and update the lockfile locally instead.
RUN pnpm install --no-frozen-lockfile

# Build the app
WORKDIR /app/apps/web-ui
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/web-ui/build ./build
COPY --from=builder /app/apps/web-ui/package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start the app
CMD ["node", "build"]
