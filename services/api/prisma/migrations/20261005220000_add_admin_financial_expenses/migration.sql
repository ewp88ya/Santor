CREATE TABLE "AdminFinancialExpense" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recurring" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminFinancialExpense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminFinancialExpense_expenseDate_idx" ON "AdminFinancialExpense"("expenseDate");
CREATE INDEX "AdminFinancialExpense_currency_expenseDate_idx" ON "AdminFinancialExpense"("currency", "expenseDate");
