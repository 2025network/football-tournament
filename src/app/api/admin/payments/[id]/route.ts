import { NextRequest, NextResponse } from "next/server";
import { PaymentRecordStatus } from "@/generated/prisma/client";
import { markPaymentRejected, markPaymentSuccess, paymentInclude, serializePayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type UpdateBody = { status?: PaymentRecordStatus; adminNote?: string };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateBody;

    if (!body.status || !Object.values(PaymentRecordStatus).includes(body.status)) {
      return NextResponse.json({ message: "Valid payment status is required." }, { status: 400 });
    }

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: "Payment not found." }, { status: 404 });

    const payment = body.status === PaymentRecordStatus.SUCCESS
      ? await markPaymentSuccess(id, body.adminNote)
      : body.status === PaymentRecordStatus.REJECTED || body.status === PaymentRecordStatus.FAILED
        ? await markPaymentRejected(id, body.status, body.adminNote)
        : await prisma.payment.update({
            where: { id },
            data: { status: body.status, adminNote: body.adminNote?.trim() || null },
            include: paymentInclude,
          });

    return NextResponse.json({ message: "Payment updated successfully.", payment: serializePayment(payment) });
  } catch (error) {
    console.error("Failed to update admin payment", error);
    return NextResponse.json({ message: "Failed to update payment." }, { status: 500 });
  }
}
