CREATE TABLE "SiteConfig" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "heroTitle" TEXT NOT NULL,
    "heroSubtitle" TEXT NOT NULL,
    "primaryCta" TEXT NOT NULL,
    "secondaryCta" TEXT NOT NULL,
    "trustLine" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "services" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);
