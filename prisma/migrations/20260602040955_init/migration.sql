-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentRank" INTEGER,
ADD COLUMN     "favoriteGame" "GameTitle",
ADD COLUMN     "totalDraws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalLosses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalWins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tournamentsPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tournamentsWon" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LeaderboardSeason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaderboardSeason_active_idx" ON "LeaderboardSeason"("active");

-- CreateIndex
CREATE INDEX "LeaderboardSeason_startDate_endDate_idx" ON "LeaderboardSeason"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "RankingHistory_userId_idx" ON "RankingHistory"("userId");

-- CreateIndex
CREATE INDEX "RankingHistory_seasonId_idx" ON "RankingHistory"("seasonId");

-- CreateIndex
CREATE INDEX "RankingHistory_createdAt_idx" ON "RankingHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_name_key" ON "Achievement"("name");

-- CreateIndex
CREATE INDEX "PlayerAchievement_userId_idx" ON "PlayerAchievement"("userId");

-- CreateIndex
CREATE INDEX "PlayerAchievement_achievementId_idx" ON "PlayerAchievement"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_userId_achievementId_key" ON "PlayerAchievement"("userId", "achievementId");

-- AddForeignKey
ALTER TABLE "RankingHistory" ADD CONSTRAINT "RankingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingHistory" ADD CONSTRAINT "RankingHistory_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeaderboardSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
