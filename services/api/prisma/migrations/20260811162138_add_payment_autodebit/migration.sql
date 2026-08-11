-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "autoDebit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "providerPaymentId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'one_time';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "autoDebitEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentCustomerId" TEXT,
ADD COLUMN     "paymentMethodId" TEXT;
