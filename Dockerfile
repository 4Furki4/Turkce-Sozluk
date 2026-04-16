FROM oven/bun:1-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Stage 1: Install deps with Bun (Fast)
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Stage 2: Build with Node (Memory Safe)
FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1
ENV NODE_OPTIONS=--max-old-space-size=1536
COPY --from=deps /app/node_modules ./node_modules

# ANY variable passed here forces Docker to stop caching from this exact line downward
ARG CACHE_BUST=1

COPY . .
RUN npm run build -- --webpack

# Stage 3: Run with Bun (Fast Startup)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/src/assets ./src/assets
COPY --from=builder /app/src/app/icon.svg ./src/app/icon.svg
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["bun", "server.js"]
