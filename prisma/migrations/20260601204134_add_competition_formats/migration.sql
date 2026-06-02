-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('OPEN_KNOCKOUT', 'LEAGUE', 'CHAMPIONS_LEAGUE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'COMPLETED', 'DISPUTED');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "allowUnlimitedRegistration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "competitionFormat" "CompetitionFormat" NOT NULL DEFAULT 'OPEN_KNOCKOUT',
ADD COLUMN     "registrationLimit" INTEGER,
ADD COLUMN     "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "useHomeAndAway" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "groupName" TEXT,
    "playerOneRegistrationId" TEXT,
    "playerTwoRegistrationId" TEXT,
    "playerOneScore" INTEGER,
    "playerTwoScore" INTEGER,
    "winnerRegistrationId" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "legNumber" INTEGER,
    "homeRegistrationId" TEXT,
    "awayRegistrationId" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "aggregateMatchId" TEXT,
    "aggregateWinnerRegistrationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueStanding" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "groupName" TEXT,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "goalDifference" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueStanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_aggregateMatchId_idx" ON "Match"("aggregateMatchId");

-- CreateIndex
CREATE INDEX "Match_round_idx" ON "Match"("round");

-- CreateIndex
CREATE INDEX "Match_groupName_idx" ON "Match"("groupName");

-- CreateIndex
CREATE INDEX "LeagueStanding_tournamentId_idx" ON "LeagueStanding"("tournamentId");

-- CreateIndex
CREATE INDEX "LeagueStanding_groupName_idx" ON "LeagueStanding"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueStanding_tournamentId_registrationId_groupName_key" ON "LeagueStanding"("tournamentId", "registrationId", "groupName");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerOneRegistrationId_fkey" FOREIGN KEY ("playerOneRegistrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerTwoRegistrationId_fkey" FOREIGN KEY ("playerTwoRegistrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerRegistrationId_fkey" FOREIGN KEY ("winnerRegistrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeRegistrationId_fkey" FOREIGN KEY ("homeRegistrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayRegistrationId_fkey" FOREIGN KEY ("awayRegistrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_aggregateMatchId_fkey" FOREIGN KEY ("aggregateMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_aggregateWinnerRegistrationId_fkey" FOREIGN KEY ("aggregateWinnerRegistrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueStanding" ADD CONSTRAINT "LeagueStanding_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueStanding" ADD CONSTRAINT "LeagueStanding_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
