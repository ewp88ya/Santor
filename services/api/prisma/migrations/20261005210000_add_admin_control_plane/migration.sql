CREATE TABLE "AdminControlConfig" (
  "id" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminControlConfig_pkey" PRIMARY KEY ("id")
);
