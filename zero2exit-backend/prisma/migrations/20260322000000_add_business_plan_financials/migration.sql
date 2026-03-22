-- CreateTable
CREATE TABLE "business_plans" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Business Plan',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_plan_sections" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "content" JSONB NOT NULL DEFAULT '{}',
    "plain_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_plan_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_projections" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "inputs" JSONB NOT NULL DEFAULT '{}',
    "projections" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_projections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_plans_founder_id_key" ON "business_plans"("founder_id");

-- CreateIndex
CREATE INDEX "business_plans_founder_id_idx" ON "business_plans"("founder_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_plan_sections_plan_id_section_key_key" ON "business_plan_sections"("plan_id", "section_key");

-- CreateIndex
CREATE INDEX "business_plan_sections_plan_id_idx" ON "business_plan_sections"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_projections_plan_id_key" ON "financial_projections"("plan_id");

-- AddForeignKey
ALTER TABLE "business_plans" ADD CONSTRAINT "business_plans_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_plan_sections" ADD CONSTRAINT "business_plan_sections_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "business_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_projections" ADD CONSTRAINT "financial_projections_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "business_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
