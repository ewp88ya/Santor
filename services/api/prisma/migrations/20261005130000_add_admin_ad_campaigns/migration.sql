CREATE TABLE "AdCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "imageUrl" TEXT,
  "ctaLabel" TEXT,
  "landingUrl" TEXT,
  "productCode" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'website',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdCampaign_status_idx" ON "AdCampaign"("status");
CREATE INDEX "AdCampaign_channel_status_idx" ON "AdCampaign"("channel", "status");
CREATE INDEX "AdCampaign_startAt_endAt_idx" ON "AdCampaign"("startAt", "endAt");