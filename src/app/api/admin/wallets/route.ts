import { NextRequest, NextResponse } from "next/server";
import { WalletTransactionType } from "@/generated/prisma/client";
import { creditWallet, debitWallet, serializeWalletTransaction } from "@/lib/wallet";
import { prisma } from "@/lib/prisma";

type WalletBody = {
  emailOrPlatformId?: string;
  type?: WalletTransactionType;
  amount?: number;
  description?: string;
  adminName?: string;
};

export async function GET() {
  try {
    const wallets = await prisma.wallet.findMany({
      include: { user: true, transactions: { orderBy: { createdAt: "desc" }, take: 5 } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      wallets: wallets.map((wallet) => ({
        id: wallet.id,
        userId: wallet.userId,
        playerName: wallet.user.gamerTag || wallet.user.fullName,
        playerEmail: wallet.user.email,
        platformId: wallet.user.platformId,
        balance: wallet.balance,
        currency: wallet.currency,
        transactions: wallet.transactions.map(serializeWalletTransaction),
      })),
    });
  } catch (error) {
    console.error("Failed to load wallets", error);
    return NextResponse.json({ message: "Failed to load wallets." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WalletBody;
    const validationError = validateBody(body);
    if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

    const target = body.emailOrPlatformId!.trim();
    const user = target.includes("@")
      ? await prisma.user.findUnique({ where: { email: target.toLowerCase() } })
      : await prisma.user.findUnique({ where: { platformId: target.toUpperCase() } });

    if (!user?.passwordHash) return NextResponse.json({ message: "Player account not found." }, { status: 404 });

    const result = body.type === WalletTransactionType.CREDIT
      ? await creditWallet({ userId: user.id, amount: body.amount!, description: body.description!.trim(), adminName: body.adminName?.trim() || "Admin manual credit" })
      : await debitWallet({ userId: user.id, amount: body.amount!, description: body.description!.trim(), adminName: body.adminName?.trim() || "Admin manual debit" });

    return NextResponse.json({
      message: body.type === WalletTransactionType.CREDIT ? "Wallet credited successfully." : "Wallet debited successfully.",
      wallet: { balance: result.wallet.balance, currency: result.wallet.currency },
      transaction: serializeWalletTransaction(result.transaction),
    });
  } catch (error) {
    console.error("Failed to update wallet", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to update wallet." }, { status: 500 });
  }
}

function validateBody(body: WalletBody) {
  if (!body.emailOrPlatformId?.trim()) return "Player email or Platform ID is required.";
  if (body.type !== WalletTransactionType.CREDIT && body.type !== WalletTransactionType.DEBIT) return "Transaction type must be CREDIT or DEBIT.";
  const amount = body.amount;
  if (amount === undefined || !Number.isInteger(amount) || amount <= 0) return "Amount must be a positive whole number.";
  if (!body.description?.trim()) return "Description is required.";
  return null;
}
