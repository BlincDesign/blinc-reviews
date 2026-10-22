-- AlterEnum
ALTER TYPE "ReviewRequestStatus" ADD VALUE 'SENDING';

-- AlterTable
ALTER TABLE "ReviewRequest" ADD COLUMN     "clickedAt" TIMESTAMP(3),
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "items" JSONB NOT NULL,
ADD COLUMN     "openedAt" TIMESTAMP(3),
ADD COLUMN     "orderName" TEXT,
ADD COLUMN     "reminderAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "token" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN     "reminderDelayDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_shopId_email_key" ON "EmailSuppression"("shopId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_token_key" ON "ReviewRequest"("token");

-- CreateIndex
CREATE INDEX "ReviewRequest_reminderAt_idx" ON "ReviewRequest"("reminderAt");

-- CreateIndex
CREATE INDEX "ReviewRequest_shopId_createdAt_idx" ON "ReviewRequest"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailSuppression" ADD CONSTRAINT "EmailSuppression_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

