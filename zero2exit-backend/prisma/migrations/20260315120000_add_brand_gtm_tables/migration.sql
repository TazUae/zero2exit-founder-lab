-- Brand + GTM tables (must exist before 20260316000000_supabase_auth_migration RLS)
CREATE TABLE IF NOT EXISTS "brand_identities" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "questionnaire" JSONB NOT NULL DEFAULT '{}',
    "brand_names" JSONB NOT NULL DEFAULT '[]',
    "logo_direction" JSONB NOT NULL DEFAULT '{}',
    "color_palette" JSONB NOT NULL DEFAULT '[]',
    "typography" JSONB NOT NULL DEFAULT '{}',
    "positioning" TEXT,
    "taglines" JSONB NOT NULL DEFAULT '[]',
    "brand_voice" JSONB NOT NULL DEFAULT '{}',
    "pdf_url" TEXT,
    "logo_url" TEXT,
    "logo_prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "brand_identities_founder_id_key" ON "brand_identities"("founder_id");

CREATE TABLE IF NOT EXISTS "gtm_documents" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gtm_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gtm_documents_founder_id_key" ON "gtm_documents"("founder_id");
CREATE INDEX IF NOT EXISTS "gtm_documents_founder_id_idx" ON "gtm_documents"("founder_id");

CREATE TABLE IF NOT EXISTS "gtm_sections" (
    "id" TEXT NOT NULL,
    "gtm_document_id" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "plain_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gtm_sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gtm_sections_gtm_document_id_section_key_key" ON "gtm_sections"("gtm_document_id", "section_key");
CREATE INDEX IF NOT EXISTS "gtm_sections_gtm_document_id_idx" ON "gtm_sections"("gtm_document_id");

ALTER TABLE "brand_identities" DROP CONSTRAINT IF EXISTS "brand_identities_founder_id_fkey";
ALTER TABLE "brand_identities" ADD CONSTRAINT "brand_identities_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gtm_documents" DROP CONSTRAINT IF EXISTS "gtm_documents_founder_id_fkey";
ALTER TABLE "gtm_documents" ADD CONSTRAINT "gtm_documents_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gtm_sections" DROP CONSTRAINT IF EXISTS "gtm_sections_gtm_document_id_fkey";
ALTER TABLE "gtm_sections" ADD CONSTRAINT "gtm_sections_gtm_document_id_fkey" FOREIGN KEY ("gtm_document_id") REFERENCES "gtm_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
