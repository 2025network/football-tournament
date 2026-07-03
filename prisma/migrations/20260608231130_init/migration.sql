-- CreateTable
CREATE TABLE "PenaltyShootoutResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT,
    "score" INTEGER NOT NULL,
    "totalShots" INTEGER NOT NULL DEFAULT 5,
    "shotsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenaltyShootoutResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PenaltyShootoutResult_userId_idx" ON "PenaltyShootoutResult"("userId");

-- CreateIndex
CREATE INDEX "PenaltyShootoutResult_matchId_idx" ON "PenaltyShootoutResult"("matchId");

-- CreateIndex
CREATE INDEX "PenaltyShootoutResult_score_idx" ON "PenaltyShootoutResult"("score");

-- CreateIndex
CREATE INDEX "PenaltyShootoutResult_createdAt_idx" ON "PenaltyShootoutResult"("createdAt");

-- AddForeignKey
ALTER TABLE "PenaltyShootoutResult" ADD CONSTRAINT "PenaltyShootoutResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyShootoutResult" ADD CONSTRAINT "PenaltyShootoutResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
