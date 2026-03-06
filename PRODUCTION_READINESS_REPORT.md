# Zero2Exit — Production Readiness QA Report

**Date:** March 5, 2026  
**Auditor:** Staff Engineer — Full End-to-End Audit  
**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · tRPC 11 · PostgreSQL (Prisma 6) · Fastify · Redis · Clerk · Stripe · Perplexity · Gemini/Groq/NVIDIA LLMs

---

## System Architecture Summary

```
Frontend (Next.js 16 App Router)
  → tRPC React Query client (httpBatchLink + Clerk JWT)
  → Fastify API (/api/trpc)
    → tRPC routers (gateway, m01, m02, dashboard, founder, coach, documents, payments, startup, knowledge)
      → Services (research, competitor-intelligence, knowledge-graph, agent-orchestrator)
      → Prisma ORM → PostgreSQL
      → Redis (caching, rate-limiting, distributed locks)
      → LLM Router (Gemini → Groq → NVIDIA, task-aware fallback)
      → Perplexity API (competitive research)
      → External: Clerk (auth), Stripe (payments), S3 (storage), DocuSign (documents)
```

### Router Map
| Router | Endpoints | Purpose |
|--------|-----------|---------|
| `gateway` | submitQuestionnaire, getModulePlan, triggerReEvaluation | Onboarding & stage classification |
| `m01` | submitBusinessDescription, submitObjectionResponse, getMarketSizing, getIcpProfiles, getScorecard, getState | Idea Validation |
| `m02` | getJurisdictionComparison, getEntityRecommendation, runHoldcoWizard, getLegalRoadmap, getState | Legal Structure |
| `dashboard` | getInvestorReadiness, getRiskAlerts, getCompetitorSnapshot | Dashboard aggregation |
| `founder` | getProfile, getDashboard, updateLanguagePreference | Founder profile + dashboard summary |
| `coach` | sendMessage, getSession, listSessions, getProactiveSuggestions | AI Coach |
| `documents` | list, getSignedUrl, getDocusignStatus | Document management |
| `payments` | createCheckoutSession, getSubscription, createPortalSession | Stripe billing |
| `startup` | generateRoadmap | Multi-agent roadmap pipeline |
| `knowledge` | getGraph | Knowledge graph |

---

## 1. Critical Bugs (FIXED)

### BUG-001: Module Status Mismatch — M02 Never Counted as Complete
- **Severity:** CRITICAL
- **Location:** `m02.ts` → `updateM02Progress()`
- **Issue:** M02 sets module status to `'completed'` while the rest of the system (founder.getDashboard, coach, gateway) checks for `status === 'complete'`. This means M02 completion is **never counted** in dashboard progress, investor readiness, or module plan logic.
- **Impact:** Dashboard progress bar permanently wrong for founders who complete M02. Coach never sees M02 as done.
- **Fix Applied:** Changed `'completed'` → `'complete'` in `updateM02Progress()`.

### BUG-002: `buildModulePlan` Hardcodes M01 as Active Module
- **Severity:** CRITICAL
- **Location:** `gateway.ts` → `buildModulePlan()`
- **Issue:** The function always sets `moduleId === 'M01'` as `'active'` and all others as `'locked'`. For stages `pre_seed` (modules M02-M04), `seed` (M03-M05), `growth` (M05-M06), `scale` (M05-M06), M01 is NOT in the module list. Result: **all modules are locked with nothing active** for non-idea stages.
- **Impact:** Founders classified at pre_seed or beyond have a completely broken module plan — no module is actionable.
- **Fix Applied:** Changed to `index === 0 ? 'active' : 'locked'` so the first module in any stage's plan is active.

### BUG-003: Broken Navigation Link `/dashboard/legal`
- **Severity:** HIGH
- **Location:** `IdeaValidationWorkspace.tsx` line 1170
- **Issue:** "Go to Legal Structure" links to `/dashboard/legal` which does not exist. The correct route is `/dashboard/m02`.
- **Impact:** Founders clicking "Next Step" after M01 get a 404.
- **Fix Applied:** Changed href to `/dashboard/m02`.

### BUG-004: RiskAlerts Component Never Rendered
- **Severity:** HIGH
- **Location:** `DashboardClient.tsx`
- **Issue:** `RiskAlerts` component is fully implemented with its own tRPC query (`dashboard.getRiskAlerts`) but is never imported or rendered in the dashboard.
- **Impact:** Risk alerts are invisible to founders despite the backend generating them correctly.
- **Fix Applied:** Added `RiskAlerts` import and rendered it alongside `CompetitorSnapshot` in a 2-column grid.

### BUG-005: DashboardClient Missing Error State
- **Severity:** MEDIUM
- **Location:** `DashboardClient.tsx`
- **Issue:** If `founder.getDashboard` query fails, the component falls through to the `!data` onboarding CTA, which is misleading.
- **Impact:** An API failure shows "Welcome to Zero2Exit" instead of an error message, confusing returning founders.
- **Fix Applied:** Added explicit error state before the `!data` check.

### BUG-006: MarketSizeSnapshot Missing Error State
- **Severity:** MEDIUM
- **Location:** `MarketSizeSnapshot.tsx`
- **Issue:** Component has loading and empty states but no error handling. If the `m01.getState` query fails, it silently shows nothing.
- **Fix Applied:** Added error state with "Unable to load market data" message.

---

## 2. Logic Issues (NOT FIXED — Require Product Decision)

### LOGIC-001: IdeaValidation Upsert Uses `id: founderId` Pattern
- **Location:** `m01.ts` lines 182–191, `gateway.ts` lines 79–98
- **Issue:** Both routers upsert records using `where: { id: founderId }` and `create: { id: founderId }`, overloading the primary key to enforce 1:1 without a schema constraint. The `IdeaValidation` model allows 1:N but the code forces 1:1.
- **Risk:** If another code path creates an IdeaValidation with a different ID for the same founder, `findFirst + orderBy: createdAt` in other queries would fetch a different record, causing data inconsistency.
- **Recommendation:** Add `@@unique([founderId])` to `IdeaValidation` and use `where: { founderId }` for upserts, matching the `LegalStructure` pattern.

### LOGIC-002: Validation Score Derived From Two Sources
- **Location:** `founderContext.ts` reads `ideaVal.scorecard.total`; `dashboard.ts` reads `moduleProgress.score`
- **Issue:** Both should hold the same value since `m01.getScorecard` writes both, but the writes are in separate `safeAsync` calls. If one succeeds and the other fails, they diverge.
- **Risk:** Dashboard validation score and investor readiness score could show different values.
- **Recommendation:** Write both in a single transaction.

### LOGIC-003: Investor Readiness `riskScore` Uses Raw Scorecard Total
- **Location:** `dashboard.ts` line 53
- **Issue:** `riskScore` is derived from `scorecard.total` which is 0–100. A high total means good — but in the readiness formula it's weighted positively (`0.2 * riskScore`), which double-counts validation. The name `riskScore` is misleading.
- **Recommendation:** Either rename to `scorecardScore` or invert the logic (100 - riskLevel).

### LOGIC-004: Perplexity Model List Contains Deprecated Models
- **Location:** `perplexity.ts`
- **Issue:** The fallback list includes 8 models like `sonar-medium-online` and `llama-3-sonar-*` which are deprecated. The function tries each sequentially, wasting time on 404s.
- **Recommendation:** Reduce to `['sonar', 'sonar-pro']` and add proper error logging per attempt.

---

## 3. Data Integrity Issues

### DATA-001: OnboardingResponse ID Overload ✅ Working But Fragile
- Same pattern as LOGIC-001. Uses `id: founderId` to force 1:1 without schema enforcement.

### DATA-002: Market Size — Single Source of Truth ✅ VERIFIED
- TAM/SAM/SOM is stored only in `IdeaValidation.marketSizing` (JSON).
- Dashboard `MarketSizeSnapshot` reads from `m01.getState` → `ideaValidation.marketSizing`.
- Dashboard `getInvestorReadiness` reads from same table to check completion.
- No duplication detected.

### DATA-003: Validation Score — Single Source of Truth ✅ VERIFIED (with caveat)
- Score stored in `ModuleProgress.score` (via `m01.getScorecard`) and `IdeaValidation.scorecard.total`.
- `founderContext` reads from `IdeaValidation.scorecard.total`.
- `dashboard.getInvestorReadiness` reads from `ModuleProgress.score`.
- Both writes happen in `m01.getScorecard` but in separate `safeAsync` blocks (see LOGIC-002).

### DATA-004: Onboarding Fields Not Duplicated ✅ VERIFIED
- Onboarding responses stored only in `OnboardingResponse.responses` (JSON).
- `IdeaValidation` has `businessDescription` which is a separate field entered in M01, not duplicated from onboarding.

### DATA-005: Competitor Data Uses Proper Cache Hierarchy ✅ VERIFIED
- Redis cache (24h TTL) → DB `MarketResearch` cache → Perplexity + LLM.
- No stale data risk beyond the 24h window.

---

## 4. Performance Issues

### PERF-001: CompetitorSnapshot Triggers Expensive Pipeline on Cache Miss
- A cache miss in `getCompetitorSnapshot` triggers Perplexity API + LLM call sequentially.
- This is a `query` (not mutation), so React Query may retry on component mount.
- **Mitigation:** Redis 24h cache + DB cache prevent most cold calls. Low risk.

### PERF-002: Founder Context Queries 6 Tables on Cache Miss
- On Redis cache miss, `getFounderContext` runs 6 parallel Prisma queries.
- 5-minute TTL means frequent cache misses under low traffic.
- **Recommendation:** Consider longer TTL (15 min) or warm on key mutations.

### PERF-003: No React.memo on Dashboard Cards
- `MarketSizeSnapshot`, `InvestorReadinessCard`, `CompetitorSnapshot`, etc. are not memoized.
- Each has its own tRPC query, so React Query handles data caching.
- **Impact:** Low — React Query prevents refetches, and these are leaf components.

### PERF-004: M01 Pipeline Runs 4 LLM Calls (1 Sequential + 3 Parallel)
- `runFullStartupAnalysis` calls `submitBusinessDescription` first, then `getScorecard`, `getMarketSizing`, `getIcpProfiles` in parallel.
- Total: 4 LLM calls + 1 Perplexity call per full analysis.
- Rate limited to 10/min per founder. Acceptable.

---

## 5. Security Issues

### SEC-001: LLM Prompt Injection Risk
- **Severity:** MEDIUM
- User-provided `businessDescription` is interpolated directly into LLM prompts with no sanitization.
- A malicious founder could craft input to override system prompt instructions.
- **Recommendation:** Add input sanitization to strip control-like patterns. Consider output validation (all LLM outputs go through `extractJSON` or `parseJSONOrThrow` which provides some structural safety).

### SEC-002: Dev Auth Bypass Header
- `x-test-founder-id` bypasses Clerk auth. Gated behind `NODE_ENV === 'development'`.
- **Risk:** Low if `NODE_ENV` is always `production` in deployment. Verify CI/CD sets this correctly.

### SEC-003: Missing Env Validation for External Service Keys
- `env.ts` validates core keys (DATABASE_URL, REDIS_URL, CLERK_SECRET_KEY) but not Stripe, AWS, DocuSign keys.
- Runtime failures will occur when those features are used without proper keys.
- **Recommendation:** Add optional validation with runtime warnings for Stripe/AWS/DocuSign keys.

### SEC-004: Non-null Assertion on `CLERK_SECRET_KEY`
- `trpc.ts:37`: `process.env.CLERK_SECRET_KEY!` — safe because `env.ts` validates it at boot.
- **Risk:** None if `env.ts` is always imported before `trpc.ts`. Current boot order (via `server.ts`) ensures this.

### SEC-005: Internal Error Messages Properly Hidden
- `server.ts` error handler returns generic "Internal Server Error" for 500s.
- tRPC error messages in m01/m02 are user-friendly (no stack traces leaked).

---

## 6. Suggested Refactors

### REFACTOR-001: Unify JSON Extraction Logic
- `extractJSON()` in `m01.ts`, `cleanLLMJson()` + `parseJSONOrThrow()` in `m02.ts`, and inline `raw.replace(/```json/)` in agents and competitor service all do the same thing.
- **Recommendation:** Extract into a shared `lib/llm/parse.ts` utility.

### REFACTOR-002: Unify Industry/Geography/Segment Options
- Same option lists duplicated in `IdeaValidationWorkspace`, `LegalStructureWorkspace`, and roadmap page.
- **Recommendation:** Create `lib/constants/options.ts` shared across components.

### REFACTOR-003: Unify `SELECT_CLASS` Styling
- Same long Tailwind class string duplicated between M01 and M02 workspaces.
- **Recommendation:** Extract to shared `ui/` component or utility.

### REFACTOR-004: BullMQ Workers Are Stubs
- All 3 workers (ai-heavy, webhooks, notifications) are TODO implementations.
- The worker entry point imports them but they do nothing.
- **Recommendation:** Either implement or remove the worker infrastructure until needed.

### REFACTOR-005: Consolidate `console.*` → Logger
- **FIXED** in routers (`m01.ts`, `gateway.ts`, `dashboard.ts`).
- Still present in: `llm/router.ts`, `trpc.ts`, `locks/founderLock.ts`.
- **Recommendation:** Complete the migration in remaining files.

### REFACTOR-006: Add `@@unique([founderId])` to IdeaValidation
- Schema allows 1:N but code forces 1:1 via ID overload.
- Adding a unique constraint would make the intent explicit and prevent bugs.

### REFACTOR-007: Links Missing Locale Prefix
- Several frontend links use absolute paths (`/onboarding`, `/dashboard`) without locale prefix.
- next-intl middleware may handle this via redirect, but it adds an unnecessary round-trip.
- **Affected:** `DashboardClient.tsx` (2 instances), `FounderOnboardingSummary.tsx` (1 instance), `OnboardingPage.tsx` (1 instance).

---

## Summary of Fixes Applied

| # | File | Fix | Severity |
|---|------|-----|----------|
| 1 | `m02.ts` | `'completed'` → `'complete'` in module status | CRITICAL |
| 2 | `gateway.ts` | `buildModulePlan` activates first module (not hardcoded M01) | CRITICAL |
| 3 | `IdeaValidationWorkspace.tsx` | `/dashboard/legal` → `/dashboard/m02` | HIGH |
| 4 | `DashboardClient.tsx` | Added `RiskAlerts` component to dashboard | HIGH |
| 5 | `DashboardClient.tsx` | Added error state for failed dashboard query | MEDIUM |
| 6 | `MarketSizeSnapshot.tsx` | Added error state for failed m01 query | MEDIUM |
| 7 | `m01.ts` | Replaced all `console.*` with structured logger | LOW |
| 8 | `gateway.ts` | Replaced all `console.*` with structured logger | LOW |
| 9 | `dashboard.ts` | Replaced all `console.*` with structured logger | LOW |

---

## Dashboard Card Verification Matrix

| Card | Data Source | Backend Query | Verified |
|------|-----------|---------------|----------|
| Validation Score | `ModuleProgress.score` (M01) via `founderContext` | `founder.getDashboard` | ✅ |
| Progress | `ModuleProgress` count where `status === 'complete'` | `founder.getDashboard` | ✅ (after BUG-001 fix) |
| Market Size (TAM/SAM/SOM) | `IdeaValidation.marketSizing` | `m01.getState` | ✅ |
| Investor Readiness | Weighted aggregate of 5 dimensions | `dashboard.getInvestorReadiness` | ✅ |
| Onboarding Summary | `OnboardingResponse.responses` | `gateway.getModulePlan` | ✅ |
| Competitor Snapshot | Perplexity + LLM → Redis/DB cache | `dashboard.getCompetitorSnapshot` | ✅ |
| Risk Alerts | `IdeaValidation.scorecard` breakdown + dimensions | `dashboard.getRiskAlerts` | ✅ (after BUG-004 fix) |
| Plan | `Founder.plan` via `founderContext` | `founder.getDashboard` | ✅ |
| Next Action | Derived from active module | `founder.getDashboard` | ✅ |

---

## End-to-End Flow Verification

### Onboarding → Dashboard
```
OnboardingPage (10 questions)
  → gateway.submitQuestionnaire (mutation)
    → LLM classifies stage
    → DB: Founder.stage updated
    → DB: OnboardingResponse created
    → DB: ModuleProgress rows created (first = 'active')
    → Redis: founderContext invalidated
  → redirect to /dashboard
    → founder.getDashboard (query) ← uses founderContext cache
    → Dashboard renders with stage, progress, next action
```
✅ **Verified:** Data flows correctly end-to-end.

### Idea Validation → Dashboard
```
IdeaValidationWorkspace
  → m01.submitBusinessDescription → LLM stress-test → DB: IdeaValidation upserted
  → m01.getScorecard → LLM scorecard → DB: IdeaValidation.scorecard + ModuleProgress.score
  → m01.getMarketSizing → Research + LLM → DB: IdeaValidation.marketSizing
  → m01.getIcpProfiles → Research + LLM → DB: IdeaValidation.icpProfiles
  → invalidate m01.getState
Dashboard reads:
  → MarketSizeSnapshot ← m01.getState.ideaValidation.marketSizing ✅
  → Validation Score ← founder.getDashboard.validationScore (from founderContext.ideaVal.scorecard.total) ✅
  → InvestorReadiness ← dashboard.getInvestorReadiness (from ModuleProgress.score) ✅
  → RiskAlerts ← dashboard.getRiskAlerts (from IdeaValidation.scorecard.breakdown) ✅
```
✅ **Verified:** All data pipelines connect correctly.

### Legal Structure → Dashboard
```
LegalStructureWorkspace
  → m02.getJurisdictionComparison → LLM → DB: LegalStructure.jurisdictionComparison
  → m02.getEntityRecommendation → LLM → DB: LegalStructure.recommendedJurisdiction/Entity
  → m02.runHoldcoWizard → Logic → DB: LegalStructure.holdcoNeeded/orgChart
  → m02.getLegalRoadmap → LLM → DB: LegalStructure.legalRoadmap + ModuleProgress.status='complete'
Dashboard reads:
  → InvestorReadiness.legalStructure ← LegalStructure presence check ✅
  → Progress ← ModuleProgress.status === 'complete' ✅ (after BUG-001 fix)
```
✅ **Verified:** After fix, M02 completion is properly counted.

---

## Production Readiness Verdict

### Ready With Caveats

The system is **functional end-to-end** after the 9 fixes applied. The critical path (onboarding → M01 → M02 → dashboard) works correctly with proper data flow, error handling, and caching.

**Blockers for production:**
1. ~~Module status mismatch~~ — **FIXED**
2. ~~Module plan activation bug~~ — **FIXED**
3. ~~Broken navigation link~~ — **FIXED**
4. LOGIC-001 (IdeaValidation upsert pattern) should be addressed before high traffic
5. Worker stubs should either be implemented or removed

**Acceptable for soft launch:**
- LLM prompt injection risk (MEDIUM — founders are authenticated users)
- Locale-less links (covered by next-intl middleware redirect)
- Perplexity deprecated models (functional fallback, just slow)

**Not blocking but recommended pre-GA:**
- Unify JSON parsing across codebase
- Unify shared constants (industry/geography options)
- Complete logger migration
- Add `@@unique([founderId])` to IdeaValidation schema
