CREATE TABLE "InfrastructureServer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT,
  "region" TEXT,
  "country" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "endpoint" TEXT,
  "monitorPort" INTEGER,
  "local" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfrastructureServer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InfrastructureServer_enabled_role_idx" ON "InfrastructureServer"("enabled", "role");
CREATE INDEX "InfrastructureServer_country_city_idx" ON "InfrastructureServer"("country", "city");
CREATE INDEX "InfrastructureServer_endpoint_idx" ON "InfrastructureServer"("endpoint");
ALTER TABLE "TunnelProfile" ADD COLUMN "serverId" TEXT;
CREATE INDEX "TunnelProfile_serverId_idx" ON "TunnelProfile"("serverId");
INSERT INTO "InfrastructureServer" ("id","name","provider","region","country","city","role","endpoint","monitorPort","local","enabled")
VALUES ('asia-vpn-01','Asia VPN 01','Hostinger','Asia','India','Mumbai','Asia VPN',NULL,NULL,true,true),
       ('eu-core-01','EU Core 01','OVHcloud','EU','Poland','Warsaw','EU Core','51.254.219.29',443,false,true)
ON CONFLICT ("id") DO NOTHING;