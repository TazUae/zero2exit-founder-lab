#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "══════════════════════════════════════════"
echo "  Zero2Exit — Deploy"
echo "══════════════════════════════════════════"

# Verify .env exists
if [ ! -f ".env" ]; then
  echo "❌ .env not found. Run first:"
  echo "   cp deploy/.env.production.example .env && nano .env"
  exit 1
fi

source .env
echo "  Domain: ${DOMAIN:?Set DOMAIN in .env}"

# Pull latest code
echo ""
echo "[1/4] Pulling latest code..."
git pull
echo "  ✅ Done"

# Ensure dokploy-network exists
echo ""
echo "[2/4] Checking Docker network..."
docker network inspect dokploy-network >/dev/null 2>&1 || {
  echo "  Creating dokploy-network..."
  docker network create dokploy-network
}
echo "  ✅ dokploy-network ready"

# Build images
echo ""
echo "[3/4] Building images..."
docker compose build
echo "  ✅ Images built"

# Start services + run migrations
echo ""
echo "[4/4] Starting services..."
docker compose up -d
sleep 8
docker compose exec -T backend npx prisma migrate deploy 2>/dev/null && echo "  ✅ Migrations applied" || echo "  ⚠️  Migrations skipped (may already be up to date)"

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Live at https://$DOMAIN"
echo "══════════════════════════════════════════"
echo ""
echo "  docker compose ps       — status"
echo "  docker compose logs -f  — logs"
echo "  docker compose restart  — restart"
echo ""
