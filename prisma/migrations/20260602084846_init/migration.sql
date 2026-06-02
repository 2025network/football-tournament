-- CreateTable
CREATE TABLE "TournamentAutomationSetting" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "autoApprovePaidPlayers" BOOLEAN NOT NULL DEFAULT false,
    "autoCloseRegistration" BOOLEAN NOT NULL DEFAULT false,
    "autoGenerateFixtures" BOOLEAN NOT NULL DEFAULT false,
    "autoNotifyPlayers" BOOLEAN NOT NULL DEFAULT true,
    "autoFeatureFinals" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentAutomationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentAutomationSetting_tournamentId_key" ON "TournamentAutomationSetting"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentAutomationSetting_tournamentId_idx" ON "TournamentAutomationSetting"("tournamentId");

-- AddForeignKey
ALTER TABLE "TournamentAutomationSetting" ADD CONSTRAINT "TournamentAutomationSetting_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
