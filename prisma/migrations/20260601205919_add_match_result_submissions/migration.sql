-- CreateEnum
CREATE TYPE "ResultSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "MatchResultSubmission" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "submittedScore" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "note" TEXT,
    "status" "ResultSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchResultSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchResultSubmission_matchId_idx" ON "MatchResultSubmission"("matchId");

-- CreateIndex
CREATE INDEX "MatchResultSubmission_registrationId_idx" ON "MatchResultSubmission"("registrationId");

-- CreateIndex
CREATE INDEX "MatchResultSubmission_status_idx" ON "MatchResultSubmission"("status");

-- AddForeignKey
ALTER TABLE "MatchResultSubmission" ADD CONSTRAINT "MatchResultSubmission_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResultSubmission" ADD CONSTRAINT "MatchResultSubmission_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
