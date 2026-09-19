CREATE TABLE "TelegramIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "linkCodeHash" TEXT,
    "linkCodeExpiresAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramIdentity_userId_key" ON "TelegramIdentity"("userId");
CREATE UNIQUE INDEX "TelegramIdentity_telegramUserId_key" ON "TelegramIdentity"("telegramUserId");
CREATE UNIQUE INDEX "TelegramIdentity_linkCodeHash_key" ON "TelegramIdentity"("linkCodeHash");
CREATE INDEX "TelegramIdentity_telegramUserId_idx" ON "TelegramIdentity"("telegramUserId");

ALTER TABLE "TelegramIdentity" ADD CONSTRAINT "TelegramIdentity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
