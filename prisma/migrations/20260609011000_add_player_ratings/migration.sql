ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "penaltyRatingApplied" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "PlayerRating" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "goalsScored" INTEGER NOT NULL DEFAULT 0,
  "goalsConceded" INTEGER NOT NULL DEFAULT 0,
  "currentRating" INTEGER NOT NULL DEFAULT 1000,
  "highestRating" INTEGER NOT NULL DEFAULT 1000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlayerRating_userId_key" ON "PlayerRating"("userId");
CREATE INDEX IF NOT EXISTS "PlayerRating_currentRating_idx" ON "PlayerRating"("currentRating");
CREATE INDEX IF NOT EXISTS "PlayerRating_wins_idx" ON "PlayerRating"("wins");
CREATE INDEX IF NOT EXISTS "PlayerRating_matchesPlayed_idx" ON "PlayerRating"("matchesPlayed");

ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;