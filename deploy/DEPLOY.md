# Zero2Exit — Deployment Guide (Dokploy + Traefik)

## Architecture

```
Internet
  → Traefik (Dokploy — handles SSL + routing)
    → frontend  (Next.js :3001, on dokploy-network)
      → backend (Fastify :3000, via Next.js rewrites inside Docker)
        ├── redis    (:6379, internal only)
        └── worker   (BullMQ background jobs)
          └── Supabase Postgres (external managed DB)
```

Traefik is managed by Dokploy. It handles HTTPS certificates (Let's Encrypt) and routes `https://z2e.zaidan-group.com` to the frontend container. All other services are internal — no ports exposed to the internet.

---

## Prerequisites

| Requirement | Details |
|---|---|
| VPS | 2 CPU, 4 GB RAM, 40 GB disk minimum |
| OS | Ubuntu 22.04 / Debian 12 |
| Dokploy | Installed and running ([dokploy.com](https://dokploy.com)) |
| Traefik | Running via Dokploy (automatic) |
| Domain | A record pointing to your VPS IP |

---

## Step 1 — Point DNS to Your VPS

At your domain registrar, add:

| Type | Name | Value       |
|---|---|------------|
| A | z2e | YOUR_VPS_IP |

Verify: `ping z2e.zaidan-group.com`

---

## Step 2 — Push Code to Git

From your local machine:

```bash
git add .
git commit -m "Production deployment config"
git push origin master
```

---

## Step 3 — Configure Dokploy application

In Dokploy:

1. Create a new **Application** pointing at this repository.
2. Under **Docker Compose**:
   - Compose file path: `docker-compose.dokploy.yml`
   - Working directory: repo root.
3. Exposed service:
   - Service: `frontend`
   - Port: `3001`
   - Host rule: `Host(\`z2e.zaidan-group.com\`)`

Dokploy will attach Traefik to the external `dokploy-network` and route HTTPS traffic to the `frontend` container only.

---

## Step 4 — Configure Environment

Use `deploy/.env.production.example` as a template and add the following **Dokploy environment variables** for the app:

**Core**

- `DOMAIN=z2e.zaidan-group.com`
- `FRONTEND_URL=https://z2e.zaidan-group.com`

**Supabase Postgres**

- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`
- `DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require` (or Supabase pooler URL if provided)

**Redis**

- `REDIS_URL=redis://redis:6379`

**Clerk**

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
- `CLERK_SECRET_KEY=sk_live_...`
- `CLERK_WEBHOOK_SECRET=whsec_...`

**LLM providers (at least one)**

- `GEMINI_API_KEY=...` (and optionally `GEMINI_MODEL`)
  or
- `GROQ_API_KEY=...` / `GROQ_MODEL=...`
  or
- `NVIDIA_API_KEY=...`, `NVIDIA_BASE_URL=...`, `NVIDIA_MODEL=...`

Stripe, AWS S3, DocuSign, Resend, Langfuse and Perplexity keys are **optional**. If unset, the backend will log warnings and disable those features but still start.

Note: `NEXT_PUBLIC_API_URL` is set inside `docker-compose.dokploy.yml` to `http://backend:3000`, so you do not need to override it in Dokploy.

---

## Step 5 — Deploy and run Prisma migrations

After saving the Dokploy application:

1. Click **Deploy** — Dokploy will build images and start:
   - `redis` (internal)
   - `backend` (internal)
   - `worker` (internal)
   - `frontend` (Traefik-exposed on port 3001)
2. Once containers are healthy, open a shell into the `backend` container (from Dokploy or via SSH + `docker compose exec` in the Dokploy stack) and run:

```bash
npx prisma migrate deploy
```

This applies all Prisma migrations against your **Supabase Postgres** database using `DATABASE_URL`.

Your site is live at **https://z2e.zaidan-group.com**

---

## Step 6 — Configure Webhooks

### Clerk

1. [Clerk Dashboard](https://dashboard.clerk.com) → Production instance
2. Domains → add `z2e.zaidan-group.com`
3. Webhooks → create endpoint:
   - URL: `https://z2e.zaidan-group.com/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret → `CLERK_WEBHOOK_SECRET` in `.env`

### Stripe

1. [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Add endpoint:
   - URL: `https://z2e.zaidan-group.com/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`
3. Copy signing secret → `STRIPE_WEBHOOK_SECRET` in `.env`

After updating `.env`, restart:

```bash
docker compose up -d --build
```

---

## Commands

```bash
# Status
docker compose ps

# Logs (all / specific)
docker compose logs -f
docker compose logs -f backend

# Restart
docker compose restart

# Stop
docker compose down

# Update + redeploy
git pull && docker compose up -d --build

# Run migrations
docker compose exec backend npx prisma migrate deploy

# Database shell
# (Database is managed by Supabase — use Supabase dashboard instead)

# Full rebuild (no cache)
docker compose build --no-cache && docker compose up -d
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Site not loading | `docker compose ps` — all containers should be "Up (healthy)" |
| 502 Bad Gateway | Frontend not ready yet — wait 30s, check `docker compose logs frontend` |
| SSL error | DNS must resolve to VPS IP. Check Traefik logs in Dokploy dashboard. |
| Clerk auth fails | Use **production** keys. Verify domain is added in Clerk dashboard. |
| DB connection error | `docker compose logs postgres` — wait for healthcheck. Run migrations again. |
| Webhooks failing | Check URL matches domain exactly. Check `docker compose logs backend`. |
| Out of memory | Need 4GB+ RAM. Add swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
