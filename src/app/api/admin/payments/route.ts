import { NextResponse } from "next/server";
import { paymentInclude, serializePayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      include: paymentInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payments: payments.map(serializePayment) });
  } catch (error) {
    console.error("Failed to fetch admin payments", error);
    return NextResponse.json({ message: "Failed to fetch payments." }, { status: 500 });
  }
}
