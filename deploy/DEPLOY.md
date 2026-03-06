# Zero2Exit — Deployment Guide (Dokploy + Traefik)

## Architecture

```
Internet
  → Traefik (Dokploy — handles SSL + routing)
    → frontend  (Next.js :3001)
      → backend (Fastify :3000, via Next.js rewrites)
        ├── postgres (:5432, internal only)
        ├── redis    (:6379, internal only)
        └── worker   (BullMQ background jobs)
```

Traefik is managed by Dokploy. It handles HTTPS certificates (Let's Encrypt) and routes `https://yourdomain.com` to the frontend container. All other services are internal — no ports exposed to the internet.

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

| Type | Name | Value |
|---|---|---|
| A | @ | YOUR_VPS_IP |
| A | www | YOUR_VPS_IP |

Verify: `ping yourdomain.com`

---

## Step 2 — Push Code to Git

From your local machine:

```bash
git add .
git commit -m "Production deployment config"
git push origin master
```

---

## Step 3 — Clone on VPS

```bash
ssh root@YOUR_VPS_IP
cd /var/www
git clone https://github.com/YOUR_USER/Zero2Exit-Founder-Lab.git zero2exit
cd zero2exit
```

---

## Step 4 — Configure Environment

```bash
cp deploy/.env.production.example .env
nano .env
```

Fill in all values. Generate passwords with:

```bash
openssl rand -hex 24
```

---

## Step 5 — Deploy

```bash
chmod +x deploy/deploy.sh
bash deploy/deploy.sh
```

This will:
1. Pull latest code
2. Ensure `dokploy-network` exists
3. Build all Docker images
4. Start all services
5. Run database migrations

Your site is live at **https://yourdomain.com**

---

## Step 6 — Configure Webhooks

### Clerk

1. [Clerk Dashboard](https://dashboard.clerk.com) → Production instance
2. Domains → add `yourdomain.com`
3. Webhooks → create endpoint:
   - URL: `https://yourdomain.com/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret → `CLERK_WEBHOOK_SECRET` in `.env`

### Stripe

1. [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Add endpoint:
   - URL: `https://yourdomain.com/webhooks/stripe`
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
docker compose exec postgres psql -U zero2exit

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
