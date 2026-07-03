CREATE TYPE "PenaltyShootoutAdminActionType" AS ENUM ('MANUAL_WINNER', 'RESET_RESULT');

CREATE TABLE "PenaltyShootoutAdminAction" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "resultId" TEXT,
  "actionType" "PenaltyShootoutAdminActionType" NOT NULL,
  "adminName" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PenaltyShootoutAdminAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PenaltyShootoutAdminAction_matchId_idx" ON "PenaltyShootoutAdminAction"("matchId");
CREATE INDEX "PenaltyShootoutAdminAction_resultId_idx" ON "PenaltyShootoutAdminAction"("resultId");
CREATE INDEX "PenaltyShootoutAdminAction_actionType_idx" ON "PenaltyShootoutAdminAction"("actionType");
CREATE INDEX "PenaltyShootoutAdminAction_createdAt_idx" ON "PenaltyShootoutAdminAction"("createdAt");