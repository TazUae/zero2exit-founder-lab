#!/bin/bash
set -e

echo "===== APPLY OPTION A: SUPABASE ROUTING ====="

echo ""
echo "=== 1. CONNECT SUPABASE TO TRAEFIK NETWORK ==="
docker network connect dokploy-network supabase-kong 2>/dev/null || true

echo ""
echo "=== 2. ADD TRAEFIK LABELS TO SUPABASE ==="
docker container update \
  --label-add traefik.enable=true \
  --label-add traefik.docker.network=dokploy-network \
  --label-add traefik.http.routers.supabase.priority=200 \
  --label-add 'traefik.http.routers.supabase.rule=Host(`z2e.zaidan-group.com`) && PathPrefix(`/supabase`)' \
  --label-add traefik.http.routers.supabase.entrypoints=websecure \
  --label-add traefik.http.routers.supabase.tls.certresolver=letsencrypt \
  --label-add traefik.http.middlewares.supabase-stripprefix.stripprefix.prefixes=/supabase \
  --label-add traefik.http.routers.supabase.middlewares=supabase-stripprefix \
  --label-add traefik.http.services.supabase.loadbalancer.server.port=8000 \
  supabase-kong

echo ""
echo "=== 3. VERIFY ROUTE ==="
sleep 3
curl -I https://z2e.zaidan-group.com/supabase || true

echo ""
echo "===== OPTION A ROUTING APPLIED ====="
