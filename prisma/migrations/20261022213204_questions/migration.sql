-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "askerName" TEXT NOT NULL,
    "askerEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_shopId_productId_status_createdAt_idx" ON "Question"("shopId", "productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Question_shopId_status_createdAt_idx" ON "Question"("shopId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Question_shopId_askerEmail_idx" ON "Question"("shopId", "askerEmail");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
