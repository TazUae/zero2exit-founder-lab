-- Add suggested_improvements column to idea_validations
ALTER TABLE "idea_validations" ADD COLUMN "suggested_improvements" JSONB;
