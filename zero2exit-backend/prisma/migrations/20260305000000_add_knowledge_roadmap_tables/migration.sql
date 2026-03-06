-- CreateTable
CREATE TABLE "market_research" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_research_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "founder_roadmaps" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "roadmap" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "founder_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_revisions" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_nodes" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_edges" (
    "id" TEXT NOT NULL,
    "founder_id" TEXT NOT NULL,
    "from_node_id" TEXT NOT NULL,
    "to_node_id" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_edges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_research_topic_idx" ON "market_research"("topic");

-- CreateIndex
CREATE INDEX "founder_roadmaps_founder_id_idx" ON "founder_roadmaps"("founder_id");

-- CreateIndex
CREATE INDEX "roadmap_revisions_roadmap_id_idx" ON "roadmap_revisions"("roadmap_id");

-- CreateIndex
CREATE INDEX "knowledge_nodes_founder_id_type_idx" ON "knowledge_nodes"("founder_id", "type");

-- CreateIndex
CREATE INDEX "knowledge_edges_founder_id_idx" ON "knowledge_edges"("founder_id");

-- CreateIndex
CREATE INDEX "knowledge_edges_from_node_id_idx" ON "knowledge_edges"("from_node_id");

-- CreateIndex
CREATE INDEX "knowledge_edges_to_node_id_idx" ON "knowledge_edges"("to_node_id");

-- AddForeignKey
ALTER TABLE "founder_roadmaps" ADD CONSTRAINT "founder_roadmaps_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_revisions" ADD CONSTRAINT "roadmap_revisions_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "founder_roadmaps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_nodes" ADD CONSTRAINT "knowledge_nodes_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_founder_id_fkey" FOREIGN KEY ("founder_id") REFERENCES "founders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "knowledge_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "knowledge_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
