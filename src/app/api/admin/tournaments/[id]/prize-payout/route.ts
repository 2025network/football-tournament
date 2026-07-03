import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type PrizePayoutBody = { paid?: boolean; note?: string };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as PrizePayoutBody;
    if (typeof body.paid !== "boolean") return NextResponse.json({ message: "paid must be true or false." }, { status: 400 });

    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        prizePayoutPaid: body.paid,
        prizePayoutPaidAt: body.paid ? new Date() : null,
        prizePayoutNote: body.note?.trim() || null,
      },
    });

    return NextResponse.json({
      message: body.paid ? "Prize payout marked as paid." : "Prize payout marked as unpaid.",
      tournament,
    });
  } catch (error) {
    console.error("Failed to update prize payout", error);
    return NextResponse.json({ message: "Failed to update prize payout." }, { status: 500 });
  }
}
