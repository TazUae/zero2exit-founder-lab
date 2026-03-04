-- CreateTable
CREATE TABLE "founders" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "stage" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'launch',
    "stripe_customer_id" TEXT,
    "s3_bucket_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "founders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_responses" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "stage_assigned" TEXT NOT NULL,
    "module_plan" JSONB NOT NULL,
    "routing_rationale" TEXT,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_eval_at" TIMESTAMP(3),

    CONSTRAINT "onboarding_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_progress" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "outputs" JSONB,
    "score" INTEGER,
    "last_activity" TIMESTAMP(3),

    CONSTRAINT "module_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_validations" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "business_description" TEXT NOT NULL,
    "objections" JSONB,
    "market_sizing" JSONB,
    "competitive_map" JSONB,
    "icp_profiles" JSONB,
    "scorecard" JSONB,
    "share_card_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idea_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_structures" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "recommended_jurisdiction" TEXT,
    "recommended_entity_type" TEXT,
    "confidence_score" INTEGER,
    "jurisdiction_comparison" JSONB,
    "holdco_needed" BOOLEAN,
    "org_chart" JSONB,
    "legal_roadmap" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "module_id" TEXT,
    "doc_type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_url" TEXT,
    "docusign_envelope_id" TEXT,
    "docusign_status" TEXT NOT NULL DEFAULT 'draft',
    "signers" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_sessions" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "context_snapshot" JSONB,
    "language" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT,
    "actor_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "founders_clerk_user_id_key" ON "founders"("clerk_user_id");

-- CreateIndex
CREATE INDEX "module_progress_founder_id_idx" ON "module_progress"("founder_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_progress_founder_id_module_id_key" ON "module_progress"("founder_id", "module_id");

-- CreateIndex
CREATE INDEX "idea_validations_founder_id_idx" ON "idea_validations"("founder_id");

-- CreateIndex
CREATE INDEX "legal_structures_founder_id_idx" ON "legal_structures"("founder_id");

-- CreateIndex
CREATE INDEX "documents_founder_id_idx" ON "documents"("founder_id");

-- CreateIndex
CREATE INDEX "coach_sessions_founder_id_idx" ON "coach_sessions"("founder_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "audit_log_founder_id_idx" ON "audit_log"("founder_id");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- AddForeignKey
ALTER TABLE "onboarding_responses" ADD CONSTRAINT "onboarding_responses_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_validations" ADD CONSTRAINT "idea_validations_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_structures" ADD CONSTRAINT "legal_structures_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_sessions" ADD CONSTRAINT "coach_sessions_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
