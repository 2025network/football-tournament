import { WalletTransactionType, type Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type WalletTx = Pick<PrismaClient, "wallet" | "walletTransaction">;

type WalletTransactionInput = {
  userId: string;
  amount: number;
  description: string;
  reference?: string | null;
  registrationId?: string | null;
  tournamentId?: string | null;
  adminName?: string | null;
};

export async function getOrCreateWallet(userId: string, client: WalletTx = prisma) {
  return client.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function creditWallet(input: WalletTransactionInput, client: WalletTx = prisma) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error("Credit amount must be greater than zero.");

  const wallet = await getOrCreateWallet(input.userId, client);
  const updatedWallet = await client.wallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: input.amount } },
  });

  const transaction = await client.walletTransaction.create({
    data: buildTransactionData(updatedWallet.id, input, WalletTransactionType.CREDIT, updatedWallet.balance),
  });

  return { wallet: updatedWallet, transaction };
}

export async function debitWallet(input: WalletTransactionInput, client: WalletTx = prisma) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error("Debit amount must be greater than zero.");

  const wallet = await getOrCreateWallet(input.userId, client);
  if (wallet.balance < input.amount) throw new Error("Insufficient wallet balance.");

  const updatedWallet = await client.wallet.update({
    where: { id: wallet.id },
    data: { balance: { decrement: input.amount } },
  });

  const transaction = await client.walletTransaction.create({
    data: buildTransactionData(updatedWallet.id, input, WalletTransactionType.DEBIT, updatedWallet.balance),
  });

  return { wallet: updatedWallet, transaction };
}

function buildTransactionData(walletId: string, input: WalletTransactionInput, type: WalletTransactionType, balanceAfter: number): Prisma.WalletTransactionCreateInput {
  return {
    wallet: { connect: { id: walletId } },
    user: { connect: { id: input.userId } },
    type,
    amount: input.amount,
    balanceAfter,
    description: input.description,
    reference: input.reference ?? null,
    registrationId: input.registrationId ?? null,
    tournamentId: input.tournamentId ?? null,
    adminName: input.adminName ?? null,
  };
}

export function serializeWalletTransaction(transaction: { id: string; type: WalletTransactionType; amount: number; balanceAfter: number; description: string; reference: string | null; registrationId: string | null; tournamentId: string | null; adminName: string | null; createdAt: Date }) {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    balanceAfter: transaction.balanceAfter,
    description: transaction.description,
    reference: transaction.reference,
    registrationId: transaction.registrationId,
    tournamentId: transaction.tournamentId,
    adminName: transaction.adminName,
    createdAt: transaction.createdAt.toISOString(),
  };
}
