-- DropIndex
DROP INDEX IF EXISTS "legal_structures_founder_id_idx";

-- Deduplicate: keep only one row per founder_id.
-- Tie-break on updated_at DESC, then id DESC (deterministic even with identical timestamps).
DELETE FROM "legal_structures" a
USING "legal_structures" b
WHERE a."founder_id" = b."founder_id"
  AND a."id" <> b."id"
  AND (
    a."updated_at" < b."updated_at"
    OR (a."updated_at" = b."updated_at" AND a."id" < b."id")
  );

-- CreateIndex (unique replaces the old non-unique index)
CREATE UNIQUE INDEX "legal_structures_founder_id_key" ON "legal_structures"("founder_id");
