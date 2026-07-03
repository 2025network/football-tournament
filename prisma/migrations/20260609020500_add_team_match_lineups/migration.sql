CREATE TABLE IF NOT EXISTS "TeamMatchLineup" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "memberUserIds" JSONB NOT NULL,
  "representativeUserId" TEXT NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamMatchLineup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamMatchLineup_matchId_registrationId_key" ON "TeamMatchLineup"("matchId", "registrationId");
CREATE INDEX IF NOT EXISTS "TeamMatchLineup_matchId_idx" ON "TeamMatchLineup"("matchId");
CREATE INDEX IF NOT EXISTS "TeamMatchLineup_registrationId_idx" ON "TeamMatchLineup"("registrationId");
CREATE INDEX IF NOT EXISTS "TeamMatchLineup_teamId_idx" ON "TeamMatchLineup"("teamId");
CREATE INDEX IF NOT EXISTS "TeamMatchLineup_representativeUserId_idx" ON "TeamMatchLineup"("representativeUserId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamMatchLineup_matchId_fkey') THEN
    ALTER TABLE "TeamMatchLineup" ADD CONSTRAINT "TeamMatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamMatchLineup_registrationId_fkey') THEN
    ALTER TABLE "TeamMatchLineup" ADD CONSTRAINT "TeamMatchLineup_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamMatchLineup_teamId_fkey') THEN
    ALTER TABLE "TeamMatchLineup" ADD CONSTRAINT "TeamMatchLineup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
