# ── Multi-stage build for AXON-RYZR API (NestJS) ──

# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app

# Needed by some native deps (argon2) + openssl for Prisma engines
RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# Stage 2: runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma on Alpine (musl) needs openssl/libssl for its query+schema engines.
# ffmpeg is used to extract a still frame from videos for text verification (Fase 3).
RUN apk add --no-cache openssl ffmpeg

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs
EXPOSE 4000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
