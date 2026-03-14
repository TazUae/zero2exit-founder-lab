# Zero2Exit — Founder Operating System

AI-powered SaaS for MENA-region founders. Validates startup ideas,
generates legal structure recommendations, builds go-to-market strategies,
and provides an AI coach — all in Arabic and English.

---

## Architecture

```
Zero2Exit-Founder-Lab-main/
├── zero2exit-backend/     Fastify + tRPC + Prisma + BullMQ (port 3000)
├── zero2exit-frontend/    Next.js 16 + Tailwind + shadcn/ui (port 3001)
├── scripts/               yolo-test.sh and utility scripts
└── deploy/                Production env examples
```

**Backend stack:** Fastify 4, tRPC, Prisma (PostgreSQL), Redis, BullMQ,
OIDC-ready auth (Authentik planned), Stripe, NVIDIA NIM (Kimi K2.5 + FLUX.1)

**Frontend stack:** Next.js 16 App Router, Tailwind CSS, shadcn/ui,
tRPC client, Zustand, next-intl (Arabic/English/RTL)

---

## Prerequisites

- Node.js 20+
- PostgreSQL (or self-hosted Supabase)
- Redis
- OIDC identity provider (Authentik recommended)
- NVIDIA NIM API key (for Kimi K2.5 AI + FLUX.1 logo generation)
- Stripe account (optional for payments)
- AWS S3 bucket (optional for document storage)

---

## Environment Setup

**Backend** — copy and fill in:
```bash
cp deploy/.env.production.example zero2exit-backend/.env
```

Required variables:
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379
NVIDIA_API_KEY=nvapi-...
FRONTEND_URL=http://localhost:3001
```

**Frontend** — create zero2exit-frontend/.env.local:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
PLAYWRIGHT_BYPASS_SECRET=playwright-bypass-secret-zero2exit-dev-only
PLAYWRIGHT_TEST_FOUNDER_ID=<your test founder id from DB>
PLAYWRIGHT_BASE_URL=http://localhost:3001
```

---

## Running Locally

**Backend:**
```bash
cd zero2exit-backend
npm install
npx prisma migrate deploy
npm run dev
# → http://localhost:3000
# → http://localhost:3000/health
```

**Frontend:**
```bash
cd zero2exit-frontend
npm install
npm run dev
# → http://localhost:3001
```

**Background worker** (optional — for BullMQ jobs):
```bash
cd zero2exit-backend
npm run worker
```

---

## Running Tests

**Backend unit tests (Vitest):**
```bash
cd zero2exit-backend
npm run test           # run once
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

Test files:
- src/lib/llm/parse.test.ts — JSON parsing/repair (12 tests)
- src/lib/context/founderContext.test.ts — Redis caching (4 tests)
- src/config/env.test.ts — env validation (9 tests)

**Frontend E2E tests (Playwright):**
```bash
cd zero2exit-frontend

# Run full suite (both servers must be running)
npx playwright test --project=chromium

# Run specific spec
npx playwright test tests/e2e/dashboard.spec.ts --project=chromium

# Run with browser visible
npx playwright test --headed --project=chromium

# Update visual regression baselines
npx playwright test tests/e2e/visual.spec.ts --update-snapshots
```

E2E test files:
- auth.spec.ts — redirect guards (2 tests, skipped with Google OAuth)
- dashboard.spec.ts — dashboard load + sidebar (3 tests)
- onboarding.spec.ts — form validation + input (3 tests)
- data-submission.spec.ts — M01 idea validation form (5 tests)
- payments.spec.ts — settings + plan display (5 tests)
- gtm.spec.ts — GTM, Documents, Brand, Coach pages (6 tests)
- visual.spec.ts — screenshot regression baselines (7 tests)

**Run everything at once:**
```bash
bash scripts/yolo-test.sh
```

---

## Known Exceptions

| Item | Status | Reason |
|------|--------|--------|
| auth.spec.ts — redirect test | Skipped | Playwright bypass header is global; redirect never fires in test mode |
| auth.spec.ts — wrong password | Skipped | Google OAuth only; no email/password flow |
| Backend lint warnings (67) | Acceptable | no-explicit-any and no-console in worker/script files; no errors |
| Stripe E2E | Not tested | Price IDs not configured in dev; checkout session returns error |
| BullMQ worker typecheck | Fixed | Separate IORedis connection instance used |

---

## Deployment

Backend and frontend are deployed separately via Dokploy on Contabo VPS.
See deploy/ folder for production env examples and Docker configuration.
