# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=development
COPY package.json yarn.lock ./
# --network-timeout alto: a VPS às vezes tem rede instável com o registry npm
# (ESOCKETTIMEDOUT). Dá mais fôlego pro download antes de abortar o build.
RUN corepack enable && yarn install --frozen-lockfile --production=false --network-timeout 600000

FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Embedded Signup (coexistência WhatsApp) — inlined no bundle em build time.
ARG NEXT_PUBLIC_META_APP_ID
ENV NEXT_PUBLIC_META_APP_ID=${NEXT_PUBLIC_META_APP_ID}
ARG NEXT_PUBLIC_META_CONFIG_ID
ENV NEXT_PUBLIC_META_CONFIG_ID=${NEXT_PUBLIC_META_CONFIG_ID}
ARG NEXT_PUBLIC_META_GRAPH_VERSION
ENV NEXT_PUBLIC_META_GRAPH_VERSION=${NEXT_PUBLIC_META_GRAPH_VERSION}
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && yarn build

FROM node:20-alpine AS runner
RUN apk add --no-cache curl tini
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -sfL http://localhost:3000/ -o /dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
