import { NextRequest, NextResponse } from "next/server";
import { ApprovalStatus, PaymentMethod, PaymentProvider, PaymentRecordStatus, PaymentStatus } from "@/generated/prisma/client";
import { debitWallet } from "@/lib/wallet";
import { paymentInclude, serializePayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

type WalletPaymentBody = { registrationId?: string; email?: string };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WalletPaymentBody;
    if (!body.registrationId?.trim()) return NextResponse.json({ message: "Registration ID is required." }, { status: 400 });
    if (!body.email?.trim()) return NextResponse.json({ message: "Player email is required." }, { status: 400 });

    const registration = await prisma.registration.findUnique({
      where: { id: body.registrationId },
      include: { user: true, tournament: true },
    });

    if (!registration) return NextResponse.json({ message: "Registration not found." }, { status: 404 });
    if (registration.user.email.toLowerCase() !== body.email.trim().toLowerCase()) return NextResponse.json({ message: "You can only pay for your own registration." }, { status: 403 });
    if (registration.paymentStatus === PaymentStatus.PAID) return NextResponse.json({ message: "This registration is already paid." }, { status: 409 });
    if (registration.tournament.entryFee <= 0) return NextResponse.json({ message: "This tournament is free." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const walletResult = await debitWallet({
        userId: registration.userId,
        amount: registration.tournament.entryFee,
        description: `Tournament entry fee: ${registration.tournament.title}`,
        registrationId: registration.id,
        tournamentId: registration.tournamentId,
      }, tx);

      const payment = await tx.payment.create({
        data: {
          registrationId: registration.id,
          amount: registration.tournament.entryFee,
          currency: "NGN",
          method: PaymentMethod.WALLET,
          provider: PaymentProvider.WALLET,
          reference: `WALLET-${registration.id}-${Date.now()}`,
          status: PaymentRecordStatus.SUCCESS,
          adminNote: "Paid from wallet balance.",
        },
        include: paymentInclude,
      });

      await tx.registration.update({
        where: { id: registration.id },
        data: { paymentStatus: PaymentStatus.PAID, approvalStatus: registration.approvalStatus === ApprovalStatus.REJECTED ? ApprovalStatus.PENDING : registration.approvalStatus },
      });

      return { wallet: walletResult.wallet, payment };
    });

    return NextResponse.json({
      message: "Entry fee paid from wallet.",
      walletBalance: result.wallet.balance,
      payment: serializePayment(result.payment),
    });
  } catch (error) {
    console.error("Failed to pay from wallet", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to pay from wallet." }, { status: 500 });
  }
}
