CREATE TABLE "Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'remote',
    "endpoint" TEXT,
    "monitorPort" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "monitorEnabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Server_slug_key" ON "Server"("slug");
CREATE INDEX "Server_active_monitorEnabled_idx" ON "Server"("active", "monitorEnabled");
CREATE INDEX "Server_region_city_idx" ON "Server"("region", "city");

ALTER TABLE "TunnelProfile" ADD COLUMN "serverId" TEXT;
CREATE INDEX "TunnelProfile_serverId_idx" ON "TunnelProfile"("serverId");
ALTER TABLE "TunnelProfile" ADD CONSTRAINT "TunnelProfile_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;