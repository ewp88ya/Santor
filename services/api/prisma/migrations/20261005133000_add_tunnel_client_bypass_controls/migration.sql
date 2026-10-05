CREATE TABLE "TunnelProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "protocol" TEXT NOT NULL,
  "nodeId" TEXT,
  "endpoint" TEXT,
  "port" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TunnelProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TunnelProfile_protocol_enabled_idx" ON "TunnelProfile"("protocol","enabled");
CREATE INDEX "TunnelProfile_nodeId_idx" ON "TunnelProfile"("nodeId");

CREATE TABLE "ClientProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "client" TEXT NOT NULL,
  "tunnelId" TEXT,
  "config" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClientProfile_client_enabled_idx" ON "ClientProfile"("client","enabled");

CREATE TABLE "BypassRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "matchType" TEXT NOT NULL,
  "pattern" TEXT NOT NULL,
  "action" TEXT NOT NULL DEFAULT 'direct',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BypassRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BypassRule_enabled_priority_idx" ON "BypassRule"("enabled","priority");
CREATE INDEX "BypassRule_matchType_pattern_idx" ON "BypassRule"("matchType","pattern");