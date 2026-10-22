-- AlterEnum
ALTER TYPE "ReviewStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

