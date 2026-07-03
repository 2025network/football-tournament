CREATE TABLE IF NOT EXISTS "Season" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlayerRating" ADD COLUMN IF NOT EXISTS "seasonId" TEXT;

DROP INDEX IF EXISTS "PlayerRating_userId_key";

CREATE INDEX IF NOT EXISTS "Season_active_idx" ON "Season"("active");
CREATE INDEX IF NOT EXISTS "Season_startDate_endDate_idx" ON "Season"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS "PlayerRating_seasonId_idx" ON "PlayerRating"("seasonId");
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerRating_userId_seasonId_key" ON "PlayerRating"("userId", "seasonId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlayerRating_seasonId_fkey'
  ) THEN
    ALTER TABLE "PlayerRating"
    ADD CONSTRAINT "PlayerRating_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
