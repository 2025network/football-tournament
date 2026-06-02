import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyRegistration } from "@/lib/notifications";
import { paymentInclude, serializePayment } from "@/lib/payments";
import { ApprovalStatus, GameTitle, NotificationType, PaymentMethod, PaymentProvider, PaymentRecordStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateRegistrationBody = {
  paymentStatus?: PaymentStatus;
  approvalStatus?: ApprovalStatus;
  adminNote?: string;
};

const gameToDisplay: Record<GameTitle, string> = {
  EFOOTBALL_MOBILE: "eFootball Mobile",
  PUBG_MOBILE: "PUBG Mobile",
  COD_MOBILE: "COD Mobile",
  FREE_FIRE: "Free Fire",
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { user: true, tournament: true, team: { include: { captain: true } }, payments: { include: paymentInclude, orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!registration) {
      return NextResponse.json({ message: "Registration not found." }, { status: 404 });
    }

    return NextResponse.json({ registration: serializeRegistration(registration) });
  } catch (error) {
    console.error("Failed to fetch registration", error);
    return NextResponse.json({ message: "Failed to fetch registration." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateRegistrationBody;
    const validationError = validateUpdateBody(body);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const previousRegistration = await prisma.registration.findUnique({ where: { id } });

    const registration = await prisma.registration.update({
      where: { id },
      data: {
        ...(body.paymentStatus ? { paymentStatus: body.paymentStatus } : {}),
        ...(body.approvalStatus ? { approvalStatus: body.approvalStatus } : {}),
        ...(body.adminNote !== undefined ? { adminNote: body.adminNote.trim() || null } : {}),
      },
      include: { user: true, tournament: true, team: { include: { captain: true } }, payments: { include: paymentInclude, orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (previousRegistration && body.approvalStatus === ApprovalStatus.APPROVED && previousRegistration.approvalStatus !== ApprovalStatus.APPROVED) {
      await notifyRegistration(id, "Registration approved", "Your tournament registration has been approved by admin.", NotificationType.APPROVAL);
    }

    if (previousRegistration && body.paymentStatus === PaymentStatus.PAID && previousRegistration.paymentStatus !== PaymentStatus.PAID) {
      await prisma.payment.create({
        data: {
          registrationId: id,
          amount: registration.tournament.entryFee,
          currency: "NGN",
          method: PaymentMethod.MANUAL_ADMIN,
          provider: PaymentProvider.MANUAL,
          status: PaymentRecordStatus.SUCCESS,
          adminNote: body.adminNote?.trim() || "Marked paid manually by admin.",
        },
      });
      await notifyRegistration(id, "Payment confirmed", "Your tournament payment has been marked as PAID.", NotificationType.PAYMENT);
    }

    return NextResponse.json({
      message: "Registration updated successfully.",
      registration: serializeRegistration(registration),
    });
  } catch (error) {
    console.error("Failed to update registration", error);
    return NextResponse.json({ message: "Failed to update registration." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const registration = await prisma.registration.delete({
      where: { id },
      select: { tournamentId: true },
    });

    await prisma.tournament.update({
      where: { id: registration.tournamentId },
      data: {
        registeredPlayers: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({ message: "Registration deleted successfully." });
  } catch (error) {
    console.error("Failed to delete registration", error);
    return NextResponse.json({ message: "Failed to delete registration." }, { status: 500 });
  }
}

function validateUpdateBody(body: UpdateRegistrationBody) {
  if (body.paymentStatus && !Object.values(PaymentStatus).includes(body.paymentStatus)) {
    return "Valid payment status is required.";
  }

  if (body.approvalStatus && !Object.values(ApprovalStatus).includes(body.approvalStatus)) {
    return "Valid approval status is required.";
  }

  return null;
}

type RegistrationWithRelations = Prisma.RegistrationGetPayload<{
  include: { user: true; tournament: true; team: { include: { captain: true } }; payments: { include: typeof paymentInclude; orderBy: { createdAt: "desc" }; take: 1 } };
}>;

function serializeRegistration(registration: RegistrationWithRelations) {
  return {
    id: registration.id,
    fullName: registration.user.fullName,
    email: registration.user.email,
    phoneNumber: registration.user.phoneNumber ?? "",
    gamerTag: registration.user.gamerTag ?? "",
    game: gameToDisplay[registration.tournament.game],
    tournamentId: registration.tournament.id,
    tournamentTitle: registration.tournament.title,
    registrationType: registration.tournament.registrationType,
    teamName: registration.team?.name ?? null,
    teamTag: registration.team?.tag ?? null,
    teamCaptain: registration.team?.captain.fullName ?? null,
    platformId: registration.platformId,
    whatsappNumber: registration.user.whatsappNumber ?? "",
    paymentStatus: registration.paymentStatus,
    approvalStatus: registration.approvalStatus,
    proofOfPaymentText: registration.proofOfPaymentText ?? "",
    adminNote: registration.adminNote ?? "",
    agreedToRules: registration.agreedToRules,
    submittedAt: registration.createdAt.toISOString(),
    latestPayment: registration.payments[0] ? serializePayment(registration.payments[0]) : null,
  };
}

