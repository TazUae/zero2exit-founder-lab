-- Add unique constraint on founder_id for idea_validations (enforces 1:1)
CREATE UNIQUE INDEX "idea_validations_founder_id_key" ON "idea_validations"("founder_id");

-- Drop the now-redundant non-unique index
DROP INDEX IF EXISTS "idea_validations_founder_id_idx";

-- Add unique constraint on founder_id for onboarding_responses (enforces 1:1)
CREATE UNIQUE INDEX "onboarding_responses_founder_id_key" ON "onboarding_responses"("founder_id");
