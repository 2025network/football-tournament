-- CreateEnum
CREATE TYPE "MatchLiveStatus" AS ENUM ('NOT_STARTED', 'LIVE', 'PAUSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "liveAwayScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "liveEndedAt" TIMESTAMP(3),
ADD COLUMN     "liveHomeScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "livePlayerOneScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "livePlayerTwoScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "liveStartedAt" TIMESTAMP(3),
ADD COLUMN     "liveStatus" "MatchLiveStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "refereeId" TEXT;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
