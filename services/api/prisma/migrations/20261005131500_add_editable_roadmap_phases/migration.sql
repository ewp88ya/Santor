CREATE TABLE "RoadmapPhase" (
  "id" TEXT NOT NULL,
  "phase" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'validation',
  "note" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RoadmapPhase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoadmapPhase_phase_key" ON "RoadmapPhase"("phase");
CREATE INDEX "RoadmapPhase_status_idx" ON "RoadmapPhase"("status");
CREATE INDEX "RoadmapPhase_sortOrder_idx" ON "RoadmapPhase"("sortOrder");