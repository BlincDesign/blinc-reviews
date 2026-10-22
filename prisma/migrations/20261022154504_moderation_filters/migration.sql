-- CreateEnum
CREATE TYPE "AlertMode" AS ENUM ('OFF', 'PENDING', 'NEGATIVE', 'ALL');

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN     "alertEmail" TEXT,
ADD COLUMN     "alertMode" "AlertMode" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "blockedEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "blockedWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "holdContactInfo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "holdProfanity" BOOLEAN NOT NULL DEFAULT true;
