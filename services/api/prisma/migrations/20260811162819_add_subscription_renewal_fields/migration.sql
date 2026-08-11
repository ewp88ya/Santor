-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "gracePeriodEnd" TIMESTAMP(3),
ADD COLUMN     "nextRenewalAttemptAt" TIMESTAMP(3),
ADD COLUMN     "renewalAttempts" INTEGER NOT NULL DEFAULT 0;
