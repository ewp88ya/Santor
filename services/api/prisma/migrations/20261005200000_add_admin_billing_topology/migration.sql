CREATE TABLE "AdminBillingConfig" (
    "id" TEXT NOT NULL,
    "topology" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminBillingConfig_pkey" PRIMARY KEY ("id")
);