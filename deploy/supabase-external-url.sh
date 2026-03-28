#!/usr/bin/env bash
# Run ON THE VPS inside your self-hosted Supabase directory (often /opt/supabase).
# Aligns public API URL with where Traefik + Kong actually serve Supabase (path /supabase).
#
# Usage:
#   export PUBLIC_SUPABASE_URL='https://z2e.zaidan-group.com/supabase'
#   ./deploy/supabase-external-url.sh
#
# Or:
#   PUBLIC_SUPABASE_URL='https://z2e.zaidan-group.com/supabase' ./deploy/supabase-external-url.sh

set -euo pipefail

PUBLIC_SUPABASE_URL="${PUBLIC_SUPABASE_URL:?Set PUBLIC_SUPABASE_URL, e.g. https://z2e.example.com/supabase}"
SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"

echo "=== Supabase API_EXTERNAL_URL sync ==="
echo "  Directory: $SUPABASE_DIR"
echo "  Target:    $PUBLIC_SUPABASE_URL"
echo ""

cd "$SUPABASE_DIR"

if [[ ! -f docker-compose.yml ]] && [[ ! -f docker-compose.yaml ]]; then
  echo "ERROR: No docker-compose.yml in $SUPABASE_DIR"
  exit 1
fi

# Official Supabase CLI stack stores secrets in .env; compose interpolates API_EXTERNAL_URL from there.
if [[ -f .env ]]; then
  if grep -q '^API_EXTERNAL_URL=' .env; then
    sed -i.bak "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=${PUBLIC_SUPABASE_URL}|" .env
    echo "  Patched .env (backup: .env.bak)"
  else
    echo "API_EXTERNAL_URL=${PUBLIC_SUPABASE_URL}" >> .env
    echo "  Appended API_EXTERNAL_URL to .env"
  fi
else
  echo "  WARN: no .env — checking docker-compose for inline API_EXTERNAL_URL"
fi

# Some installs hardcode env in compose; fix if present
for f in docker-compose.yml docker-compose.yaml; do
  [[ -f "$f" ]] || continue
  if grep -q 'API_EXTERNAL_URL=' "$f"; then
    sed -i.bak "s|API_EXTERNAL_URL=.*|API_EXTERNAL_URL=${PUBLIC_SUPABASE_URL}|g" "$f"
    echo "  Patched $f (backup: ${f}.bak)"
  fi
done

echo ""
echo "=== Verify ==="
grep -E '^API_EXTERNAL_URL=' .env 2>/dev/null || true
grep 'API_EXTERNAL_URL' docker-compose.yml 2>/dev/null | head -5 || true

echo ""
echo "=== Recreate services that read API_EXTERNAL_URL (auth + kong; rest/meta often too) ==="
# Kong + GoTrue are the minimum for OAuth redirects / forwarded host alignment.
docker compose up -d --force-recreate kong auth 2>/dev/null || docker compose up -d --force-recreate

echo ""
echo "=== Kong env (sanity) ==="
docker exec supabase-kong printenv 2>/dev/null | grep -E 'API_EXTERNAL|SUPABASE' || echo "  (inspect manually if kong name differs)"

echo ""
echo "=== Done. Optional: suppress GoTrue mailer host warnings ==="
echo "  Add to .env then: docker compose up -d --force-recreate auth"
echo "  GOTRUE_MAILER_EXTERNAL_HOSTS=z2e.zaidan-group.com,api.zaidan-group.com"
