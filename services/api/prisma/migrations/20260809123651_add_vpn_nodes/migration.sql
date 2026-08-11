-- CreateTable
CREATE TABLE "VPNNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 51820,
    "protocol" TEXT NOT NULL DEFAULT 'wireguard',
    "publicKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VPNNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VPNNode_name_key" ON "VPNNode"("name");

-- Create initial VPN node from the existing serverNode configuration.
INSERT INTO "VPNNode" (
    "id",
    "name",
    "hostname",
    "port",
    "protocol",
    "active",
    "createdAt",
    "updatedAt"
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'node-1',
    'node-1.santor.app',
    51820,
    'wireguard',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Add the new relation column as nullable during migration.
ALTER TABLE "VPNAccess"
ADD COLUMN "vpnNodeId" TEXT;

-- Migrate existing VPNAccess records to node-1.
UPDATE "VPNAccess"
SET "vpnNodeId" = '00000000-0000-0000-0000-000000000001'
WHERE "vpnNodeId" IS NULL;

-- Enforce the new relation.
ALTER TABLE "VPNAccess"
ALTER COLUMN "vpnNodeId" SET NOT NULL;

-- Remove the old hardcoded node field.
ALTER TABLE "VPNAccess"
DROP COLUMN "serverNode";

-- AddForeignKey
ALTER TABLE "VPNAccess"
ADD CONSTRAINT "VPNAccess_vpnNodeId_fkey"
FOREIGN KEY ("vpnNodeId") REFERENCES "VPNNode"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
