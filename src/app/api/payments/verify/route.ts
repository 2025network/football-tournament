import { NextRequest, NextResponse } from "next/server";
import { PaymentRecordStatus } from "@/generated/prisma/client";
import { markPaymentRejected, markPaymentSuccess, paymentInclude, serializePayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    gateway_response?: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get("reference")?.trim();

    if (!reference) {
      return NextResponse.json({ message: "Payment reference is required." }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ message: "PAYSTACK_SECRET_KEY is not configured." }, { status: 500 });
    }

    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: paymentInclude,
    });

    if (!payment) {
      return NextResponse.json({ message: "Payment record not found." }, { status: 404 });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const paystack = (await response.json()) as PaystackVerifyResponse;

    const isSuccessful = response.ok && paystack.status && paystack.data?.status === "success";

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerResponse: JSON.stringify(paystack),
        status: isSuccessful ? PaymentRecordStatus.SUCCESS : PaymentRecordStatus.FAILED,
      },
    });

    const finalPayment = isSuccessful
      ? await markPaymentSuccess(payment.id)
      : await markPaymentRejected(payment.id, PaymentRecordStatus.FAILED, paystack.message);

    return NextResponse.json({
      message: isSuccessful ? "Payment verified successfully." : "Payment verification failed.",
      success: isSuccessful,
      payment: serializePayment(finalPayment),
    });
  } catch (error) {
    console.error("Failed to verify Paystack payment", error);
    return NextResponse.json({ message: "Failed to verify Paystack payment." }, { status: 500 });
  }
}
