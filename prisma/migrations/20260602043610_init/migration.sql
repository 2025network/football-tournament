-- CreateEnum
CREATE TYPE "StreamPlatform" AS ENUM ('YOUTUBE', 'FACEBOOK', 'TWITCH', 'TIKTOK', 'OTHER');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "livestreamUrl" TEXT,
ADD COLUMN     "roomCode" TEXT,
ADD COLUMN     "roomPassword" TEXT,
ADD COLUMN     "spectatorNote" TEXT;
