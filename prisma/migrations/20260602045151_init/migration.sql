-- CreateEnum
CREATE TYPE "MatchStreamMode" AS ENUM ('NONE', 'PLAYER_STREAM', 'OFFICIAL_STREAM');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "featuredLive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "officialStreamUrl" TEXT,
ADD COLUMN     "playerStreamUrl" TEXT,
ADD COLUMN     "streamMode" "MatchStreamMode" NOT NULL DEFAULT 'NONE';
