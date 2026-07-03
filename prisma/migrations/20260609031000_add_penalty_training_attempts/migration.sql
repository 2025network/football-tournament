CREATE TABLE "PenaltyShootoutTrainingAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "totalShots" INTEGER NOT NULL DEFAULT 5,
  "shotsJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PenaltyShootoutTrainingAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PenaltyShootoutTrainingAttempt_userId_idx" ON "PenaltyShootoutTrainingAttempt"("userId");
CREATE INDEX "PenaltyShootoutTrainingAttempt_score_idx" ON "PenaltyShootoutTrainingAttempt"("score");
CREATE INDEX "PenaltyShootoutTrainingAttempt_createdAt_idx" ON "PenaltyShootoutTrainingAttempt"("createdAt");

ALTER TABLE "PenaltyShootoutTrainingAttempt"
  ADD CONSTRAINT "PenaltyShootoutTrainingAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
