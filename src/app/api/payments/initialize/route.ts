import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod, PaymentProvider, PaymentRecordStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type InitializeBody = { registrationId?: string };

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InitializeBody;

    if (!body.registrationId) {
      return NextResponse.json({ message: "Registration ID is required." }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (!secretKey) {
      return NextResponse.json({ message: "PAYSTACK_SECRET_KEY is not configured." }, { status: 500 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id: body.registrationId },
      include: { user: true, tournament: true },
    });

    if (!registration) {
      return NextResponse.json({ message: "Registration not found." }, { status: 404 });
    }

    if (registration.tournament.entryFee <= 0) {
      return NextResponse.json({ message: "This tournament is free." }, { status: 400 });
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: registration.user.email,
        amount: registration.tournament.entryFee * 100,
        currency: "NGN",
        callback_url: `${appUrl}/payment/callback`,
        metadata: {
          registrationId: registration.id,
          tournamentId: registration.tournament.id,
          playerName: registration.user.fullName,
        },
      }),
    });

    const paystack = (await response.json()) as PaystackInitializeResponse;

    if (!response.ok || !paystack.status || !paystack.data) {
      return NextResponse.json({ message: paystack.message || "Paystack initialization failed." }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        registrationId: registration.id,
        amount: registration.tournament.entryFee,
        currency: "NGN",
        method: PaymentMethod.PAYSTACK,
        provider: PaymentProvider.PAYSTACK,
        reference: paystack.data.reference,
        status: PaymentRecordStatus.PENDING,
        providerResponse: JSON.stringify(paystack),
      },
    });

    return NextResponse.json({
      message: "Paystack payment initialized.",
      authorization_url: paystack.data.authorization_url,
      reference: paystack.data.reference,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("Failed to initialize Paystack payment", error);
    return NextResponse.json({ message: "Failed to initialize Paystack payment." }, { status: 500 });
  }
}
