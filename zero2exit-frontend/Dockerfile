FROM node:20-alpine AS deps
WORKDIR /app
# Change CACHE_BUST value to force a fresh npm install
ARG CACHE_BUST=7
COPY package*.json ./
RUN npm ci --prefer-offline=false

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Increase Node.js heap to prevent OOM during webpack builds
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build
# ── Diagnostic: verify webpack ran (not Turbopack) and all assets were emitted ─
RUN echo "=== Bundler check (no 'turbopack' = webpack) ===" \
 && ls /app/.next/static/chunks/ | grep -i turbopack && echo "TURBOPACK STILL ON" || echo "webpack confirmed (no turbopack-*.js)" \
 && echo "=== .next/static/chunks total ===" && ls /app/.next/static/chunks/ | wc -l \
 && echo "=== CSS files ===" && ls /app/.next/static/chunks/*.css 2>/dev/null; ls /app/.next/static/css/ 2>/dev/null \
 && echo "=== .next/static top-level ===" && ls /app/.next/static/

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Fail the build if static chunks weren't copied — count appears in Dokploy build logs
RUN CHUNK_COUNT=$(ls .next/static/chunks/ 2>/dev/null | wc -l) \
 && echo "=== runner: .next/static/chunks/ has ${CHUNK_COUNT} files ===" \
 && [ "$CHUNK_COUNT" -gt 0 ] || (echo "ERROR: .next/static/chunks/ is empty — runner stage is stale" && exit 1)

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
