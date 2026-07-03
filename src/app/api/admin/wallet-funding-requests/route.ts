import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const requests = await prisma.walletFundingRequest.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      requests: requests.map((request) => ({
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
      })),
    });
  } catch (error) {
    console.error("Failed to load wallet funding requests", error);
    return NextResponse.json({ message: "Failed to load wallet funding requests." }, { status: 500 });
  }
}
