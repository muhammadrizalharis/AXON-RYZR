# ── Next.js build for AXON-RYZR web (monorepo-aware) ──
# Build context = repository root (see docker-compose.yml).

FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Shared workspace package (consumed via file: dependency).
COPY packages/shared ./packages/shared

# Install web deps (symlinks ../../packages/shared).
COPY apps/web/package*.json ./apps/web/
WORKDIR /app/apps/web
RUN npm install

# Build.
COPY apps/web/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.mjs ./next.config.mjs

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["npm", "run", "start"]
