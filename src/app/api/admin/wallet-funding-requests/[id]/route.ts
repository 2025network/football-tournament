import { NextRequest, NextResponse } from "next/server";
import { WalletFundingRequestStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { creditWallet } from "@/lib/wallet";

type RouteContext = { params: Promise<{ id: string }> };
type UpdateBody = {
  status?: WalletFundingRequestStatus;
  adminNote?: string;
  adminName?: string;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateBody;
    const adminNote = body.adminNote?.trim() || null;
    const adminName = body.adminName?.trim() || "Admin";

    if (body.status !== WalletFundingRequestStatus.APPROVED && body.status !== WalletFundingRequestStatus.REJECTED) {
      return NextResponse.json({ message: "Funding request status must be APPROVED or REJECTED." }, { status: 400 });
    }

    const existing = await prisma.walletFundingRequest.findUnique({ where: { id }, include: { user: true } });
    if (!existing) return NextResponse.json({ message: "Funding request not found." }, { status: 404 });

    if (existing.status === WalletFundingRequestStatus.APPROVED && existing.creditedTransactionId) {
      return NextResponse.json({ message: "This funding request was already approved and credited." }, { status: 409 });
    }

    if (body.status === WalletFundingRequestStatus.REJECTED) {
      if (existing.status === WalletFundingRequestStatus.APPROVED) {
        return NextResponse.json({ message: "Approved funding requests cannot be rejected after wallet credit." }, { status: 409 });
      }

      const fundingRequest = await prisma.walletFundingRequest.update({
        where: { id },
        data: { status: WalletFundingRequestStatus.REJECTED, adminNote, approvedBy: adminName },
        include: { user: true },
      });

      return NextResponse.json({ message: "Funding request rejected.", request: serializeAdminFundingRequest(fundingRequest) });
    }

    const fundingRequest = await prisma.$transaction(async (tx) => {
      const claimed = await tx.walletFundingRequest.updateMany({
        where: {
          id,
          status: WalletFundingRequestStatus.PENDING,
          creditedTransactionId: null,
        },
        data: {
          status: WalletFundingRequestStatus.APPROVED,
          adminNote,
          approvedBy: adminName,
        },
      });

      if (claimed.count === 0) {
        const current = await tx.walletFundingRequest.findUnique({ where: { id }, include: { user: true } });
        if (!current) throw new Error("Funding request not found.");
        if (current.creditedTransactionId) throw new Error("This funding request has already credited the wallet.");
        throw new Error("Only pending funding requests can be approved.");
      }

      const current = await tx.walletFundingRequest.findUnique({ where: { id }, include: { user: true } });
      if (!current) throw new Error("Funding request not found.");

      const result = await creditWallet({
        userId: current.userId,
        amount: current.amount,
        description: `Wallet funding approved: ${current.paymentMethod}`,
        reference: current.id,
        adminName,
      }, tx);

      return tx.walletFundingRequest.update({
        where: { id },
        data: { creditedTransactionId: result.transaction.id },
        include: { user: true },
      });
    });

    return NextResponse.json({ message: "Funding request approved and wallet credited.", request: serializeAdminFundingRequest(fundingRequest) });
  } catch (error) {
    console.error("Failed to update wallet funding request", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to update funding request." }, { status: 500 });
  }
}

function serializeAdminFundingRequest(request: {
  id: string;
  userId: string;
  user: { fullName: string; gamerTag: string | null; email: string; platformId: string | null };
  amount: number;
  currency: string;
  paymentMethod: string;
  senderName: string;
  receiptUrl: string | null;
  status: WalletFundingRequestStatus;
  adminNote: string | null;
  approvedBy: string | null;
  creditedTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: request.id,
    userId: request.userId,
    playerName: request.user.gamerTag || request.user.fullName,
    playerEmail: request.user.email,
    platformId: request.user.platformId,
    amount: request.amount,
    currency: request.currency,
    paymentMethod: request.paymentMethod,
    senderName: request.senderName,
    receiptUrl: request.receiptUrl,
    status: request.status,
    adminNote: request.adminNote,
    approvedBy: request.approvedBy,
    creditedTransactionId: request.creditedTransactionId,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}
