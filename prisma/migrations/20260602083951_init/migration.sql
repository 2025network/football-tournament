-- AlterTable
ALTER TABLE "MatchResultSubmission" ADD COLUMN     "autoApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opponentConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opponentDisputed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opponentNote" TEXT;
