import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    if (!email) return NextResponse.json({ message: "Player email is required." }, { status: 400 });

    const player = await prisma.user.findUnique({ where: { email } });
    if (!player?.passwordHash) return NextResponse.json({ message: "Player account not found." }, { status: 404 });

    const requests = await prisma.walletFundingRequest.findMany({
      where: { userId: player.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ requests: requests.map(serializeFundingRequest) });
  } catch (error) {
    console.error("Failed to load wallet funding requests", error);
    return NextResponse.json({ message: "Failed to load wallet funding requests." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const amount = Number(formData.get("amount"));
    const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
    const senderName = String(formData.get("senderName") ?? "").trim();
    const receipt = formData.get("receipt");

    if (!email) return NextResponse.json({ message: "Player email is required." }, { status: 400 });
    if (!Number.isInteger(amount) || amount <= 0) return NextResponse.json({ message: "Amount must be a positive whole number." }, { status: 400 });
    if (!paymentMethod) return NextResponse.json({ message: "Payment method is required." }, { status: 400 });
    if (!senderName) return NextResponse.json({ message: "Sender name is required." }, { status: 400 });
    if (!(receipt instanceof File) || receipt.size === 0) return NextResponse.json({ message: "Receipt upload is required." }, { status: 400 });

    const player = await prisma.user.findUnique({ where: { email } });
    if (!player?.passwordHash) return NextResponse.json({ message: "Player account not found." }, { status: 404 });

    const receiptUrl = await saveReceipt(receipt);
    const fundingRequest = await prisma.walletFundingRequest.create({
      data: {
        userId: player.id,
        amount,
        paymentMethod,
        senderName,
        receiptUrl,
      },
    });

    return NextResponse.json({
      message: "Wallet funding request submitted for admin review.",
      request: serializeFundingRequest(fundingRequest),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create wallet funding request", error);
    return NextResponse.json({ message: "Failed to submit wallet funding request." }, { status: 500 });
  }
}

async function saveReceipt(file: File) {
  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "wallet-funding");
  await mkdir(uploadDirectory, { recursive: true });
  const extension = getSafeExtension(file.name);
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const filePath = path.join(uploadDirectory, fileName);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  return `/uploads/wallet-funding/${fileName}`;
}

function getSafeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".pdf"].includes(extension) ? extension : ".png";
}

function serializeFundingRequest(request: {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  senderName: string;
  receiptUrl: string | null;
  status: string;
  adminNote: string | null;
  approvedBy: string | null;
  creditedTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: request.id,
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
