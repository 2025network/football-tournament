import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { NotificationType, PaymentMethod, PaymentProvider, PaymentRecordStatus, PaymentStatus } from "@/generated/prisma/client";
import { createNotification } from "@/lib/notifications";
import { paymentInclude, serializePayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const senderName = String(formData.get("senderName") ?? "").trim();
    const senderBank = String(formData.get("senderBank") ?? "").trim();
    const transferNote = String(formData.get("transferNote") ?? "").trim();
    const receipt = formData.get("receipt");

    if (!registrationId) return NextResponse.json({ message: "Registration ID is required." }, { status: 400 });
    if (!senderName) return NextResponse.json({ message: "Sender name is required." }, { status: 400 });
    if (!senderBank) return NextResponse.json({ message: "Sender bank is required." }, { status: 400 });
    if (!(receipt instanceof File) || receipt.size === 0) return NextResponse.json({ message: "Receipt image is required." }, { status: 400 });

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { user: true, tournament: true },
    });

    if (!registration) return NextResponse.json({ message: "Registration not found." }, { status: 404 });

    const receiptUrl = await saveReceipt(receipt);

    const payment = await prisma.payment.create({
      data: {
        registrationId,
        amount: registration.tournament.entryFee,
        currency: "NGN",
        method: PaymentMethod.BANK_TRANSFER,
        provider: PaymentProvider.MANUAL,
        receiptUrl,
        senderName,
        senderBank,
        transferNote: transferNote || null,
        status: PaymentRecordStatus.UNDER_REVIEW,
      },
      include: paymentInclude,
    });

    await prisma.registration.update({
      where: { id: registrationId },
      data: { paymentStatus: PaymentStatus.PENDING },
    });

    await createNotification({
      userId: registration.userId,
      title: "Bank transfer receipt received",
      message: `Your bank transfer receipt for ${registration.tournament.title} is under review.`,
      type: NotificationType.PAYMENT,
    });

    return NextResponse.json({
      message: "Bank transfer receipt submitted for review.",
      payment: serializePayment(payment),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit bank transfer", error);
    return NextResponse.json({ message: "Failed to submit bank transfer receipt." }, { status: 500 });
  }
}

async function saveReceipt(file: File) {
  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "payment-receipts");
  await mkdir(uploadDirectory, { recursive: true });
  const extension = getSafeExtension(file.name);
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const filePath = path.join(uploadDirectory, fileName);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  return `/uploads/payment-receipts/${fileName}`;
}

function getSafeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".pdf"].includes(extension) ? extension : ".png";
}
