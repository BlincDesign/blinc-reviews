-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "planCheckedAt" TIMESTAMP(3);
