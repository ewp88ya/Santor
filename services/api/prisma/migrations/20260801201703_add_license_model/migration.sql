/*
  Warnings:

  - You are about to drop the column `key` on the `License` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[licenseKey]` on the table `License` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `licenseKey` to the `License` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "License_key_key";

-- AlterTable
ALTER TABLE "License" DROP COLUMN "key",
ADD COLUMN     "licenseKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "License_licenseKey_key" ON "License"("licenseKey");
