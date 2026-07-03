CREATE TYPE "WalletFundingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "WalletFundingRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "paymentMethod" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "receiptUrl" TEXT,
  "status" "WalletFundingRequestStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "approvedBy" TEXT,
  "creditedTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WalletFundingRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletFundingRequest_creditedTransactionId_key" ON "WalletFundingRequest"("creditedTransactionId");
CREATE INDEX "WalletFundingRequest_userId_idx" ON "WalletFundingRequest"("userId");
CREATE INDEX "WalletFundingRequest_status_idx" ON "WalletFundingRequest"("status");
CREATE INDEX "WalletFundingRequest_createdAt_idx" ON "WalletFundingRequest"("createdAt");

ALTER TABLE "WalletFundingRequest"
  ADD CONSTRAINT "WalletFundingRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
