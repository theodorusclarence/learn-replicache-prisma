-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SUCCESS', 'FAILED', 'PROCESSING');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "EventStatus";
