-- Migration: replace clerk_user_id with Supabase auth UUID
--
-- Safe to run on a dev database with no production users.
-- All existing rows are purged via CASCADE before schema changes.

-- ── 1. Clear all data (dev only — no production users) ─────────────────────
TRUNCATE TABLE founders CASCADE;

-- ── 2. Drop the legacy column ───────────────────────────────────────────────
ALTER TABLE "founders" DROP CONSTRAINT IF EXISTS "founders_clerk_user_id_key";
ALTER TABLE "founders" DROP COLUMN IF EXISTS "clerk_user_id";

-- ── 3. Add new user_id UUID column ──────────────────────────────────────────
ALTER TABLE "founders" ADD COLUMN "user_id" UUID NOT NULL;

-- ── 4. Unique constraint (mirrors Prisma @unique) ───────────────────────────
ALTER TABLE "founders" ADD CONSTRAINT "founders_user_id_key" UNIQUE ("user_id");

-- ── 5. Foreign key to Supabase auth.users (cross-schema) ───────────────────
--       ON DELETE CASCADE: removing an auth user cleans up their founder row.
ALTER TABLE "founders"
  ADD CONSTRAINT "founders_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES auth.users(id)
  ON DELETE CASCADE;


-- ══════════════════════════════════════════════════════════════════════════════
-- Row Level Security
--
-- The Fastify backend connects via the service role (bypasses RLS by design).
-- These policies protect direct Supabase API / dashboard access.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.founders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_own_row" ON public.founders
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_responses_own" ON public.onboarding_responses
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "module_progress_own" ON public.module_progress
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.idea_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "idea_validations_own" ON public.idea_validations
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.legal_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_structures_own" ON public.legal_structures
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_own" ON public.documents
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_sessions_own" ON public.coach_sessions
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_own" ON public.subscriptions
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_own" ON public.audit_log
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.founder_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_roadmaps_own" ON public.founder_roadmaps
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.roadmap_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roadmap_revisions_own" ON public.roadmap_revisions
  FOR ALL USING (
    roadmap_id IN (
      SELECT id FROM public.founder_roadmaps
      WHERE founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
    )
  );

ALTER TABLE public.knowledge_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_nodes_own" ON public.knowledge_nodes
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.knowledge_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_edges_own" ON public.knowledge_edges
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.brand_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_identities_own" ON public.brand_identities
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.gtm_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtm_documents_own" ON public.gtm_documents
  FOR ALL USING (
    founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
  );

ALTER TABLE public.gtm_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtm_sections_own" ON public.gtm_sections
  FOR ALL USING (
    gtm_document_id IN (
      SELECT id FROM public.gtm_documents
      WHERE founder_id IN (SELECT id FROM public.founders WHERE user_id = auth.uid())
    )
  );
