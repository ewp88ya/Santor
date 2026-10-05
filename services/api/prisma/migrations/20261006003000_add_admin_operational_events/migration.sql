CREATE TABLE "AdminOperationalEvent" (
  "id" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "auto" BOOLEAN NOT NULL DEFAULT true,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedBy" TEXT,
  "assignedTo" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminOperationalEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminOperationalEvent_status_severity_idx" ON "AdminOperationalEvent"("status", "severity");
CREATE INDEX "AdminOperationalEvent_category_createdAt_idx" ON "AdminOperationalEvent"("category", "createdAt");
CREATE INDEX "AdminOperationalEvent_source_createdAt_idx" ON "AdminOperationalEvent"("source", "createdAt");
CREATE INDEX "AdminOperationalEvent_createdAt_idx" ON "AdminOperationalEvent"("createdAt");