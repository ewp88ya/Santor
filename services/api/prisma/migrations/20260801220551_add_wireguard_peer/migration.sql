-- CreateTable
CREATE TABLE "WireGuardPeer" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "endpoint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WireGuardPeer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WireGuardPeer_deviceId_key" ON "WireGuardPeer"("deviceId");

-- AddForeignKey
ALTER TABLE "WireGuardPeer" ADD CONSTRAINT "WireGuardPeer_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
