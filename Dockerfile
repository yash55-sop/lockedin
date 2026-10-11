# 1. Install dependencies only when needed
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./
ENV HUSKY=0
RUN npm ci --legacy-peer-deps

# 2. Rebuild the source code only when needed
FROM node:22-alpine AS base

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV IS_DOCKER=true
ENV SKIP_ENV_VALIDATION=true
RUN npm run build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV HOSTNAME="0.0.0.0"

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static


USER nextjs

ARG PORT=3000

EXPOSE $PORT
ENV PORT $PORT

# CMD HOSTNAME=node server.js
CMD ["node", "server.js"]
