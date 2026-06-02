import { NextRequest, NextResponse } from "next/server";
import { ApprovalStatus, GameTitle as PrismaGameTitle, PaymentStatus, RegistrationType, TeamMemberStatus, type Prisma } from "@/generated/prisma/client";
import { serializePayment } from "@/lib/payments";
import { isValidEmail, isValidNigerianPhone, normalizePhone, validateGamePlayerId } from "@/lib/player-validation";
import { prisma } from "@/lib/prisma";

type RegistrationRequestBody = {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  gamerTag?: string;
  game?: string;
  tournamentId?: string;
  platformId?: string;
  whatsappNumber?: string;
  agreedToRules?: boolean;
  teamId?: string;
};

const prismaGameToDisplay: Record<PrismaGameTitle, string> = {
  [PrismaGameTitle.EFOOTBALL_MOBILE]: "eFootball Mobile",
  [PrismaGameTitle.PUBG_MOBILE]: "PUBG Mobile",
  [PrismaGameTitle.COD_MOBILE]: "COD Mobile",
  [PrismaGameTitle.FREE_FIRE]: "Free Fire",
};

export async function GET() {
  try {
    const registrations = await prisma.registration.findMany({
      include: {
        user: true,
        tournament: true,
        payments: { include: { registration: { include: { user: true, tournament: true } } }, orderBy: { createdAt: "desc" }, take: 1 },
        team: { include: { captain: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      registrations: registrations.map((registration) => ({
        id: registration.id,
        fullName: registration.user.fullName,
        email: registration.user.email,
        phoneNumber: registration.user.phone ?? registration.user.phoneNumber ?? "",
        gamerTag: registration.user.gamerTag ?? "",
        game: prismaGameToDisplay[registration.tournament.game],
        tournamentId: registration.tournament.id,
        tournamentTitle: registration.tournament.title,
        registrationType: registration.tournament.registrationType,
        teamName: registration.team?.name ?? null,
        teamTag: registration.team?.tag ?? null,
        teamCaptain: registration.team?.captain.fullName ?? null,
        platformId: registration.platformId,
        whatsappNumber: registration.user.whatsapp ?? registration.user.whatsappNumber ?? "",
        paymentStatus: registration.paymentStatus,
        approvalStatus: registration.approvalStatus,
        proofOfPaymentText: registration.proofOfPaymentText ?? "",
        adminNote: registration.adminNote ?? "",
        agreedToRules: registration.agreedToRules,
        submittedAt: registration.createdAt.toISOString(),
        latestPayment: registration.payments[0] ? serializePayment(registration.payments[0]) : null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch registrations", error);
    return NextResponse.json({ message: "Failed to fetch registrations." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegistrationRequestBody;
    const validationError = validateRegistrationBody(body);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const account = await prisma.user.findUnique({ where: { email: body.email!.trim().toLowerCase() } });

    if (!account?.passwordHash) {
      return NextResponse.json({ message: "Create an account first before registering for a tournament." }, { status: 403 });
    }

    if (body.platformId && account.platformId && body.platformId.trim().toUpperCase() === account.platformId.toUpperCase()) {
      return NextResponse.json({ message: "Do not use your Platform ID as your Game Player ID / UID. Enter the ID from inside your selected game." }, { status: 400 });
    }

    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ id: body.tournamentId! }, { slug: body.tournamentId! }] },
    });

    if (!tournament) return NextResponse.json({ message: "Selected tournament was not found." }, { status: 404 });
    if (tournament.status === "CLOSED" || !tournament.registrationOpen) return NextResponse.json({ message: "This tournament is closed for registration." }, { status: 400 });

    const registrationLimit = tournament.registrationLimit ?? tournament.slots;
    if (!tournament.allowUnlimitedRegistration && tournament.registeredPlayers >= registrationLimit) return NextResponse.json({ message: "This tournament has no available slots." }, { status: 400 });

    let team: Prisma.TeamGetPayload<{ include: { captain: true; members: true } }> | null = null;

    if (tournament.registrationType === RegistrationType.TEAM) {
      if (!body.teamId?.trim()) return NextResponse.json({ message: "Choose a team for this team tournament." }, { status: 400 });

      team = await prisma.team.findUnique({ where: { id: body.teamId }, include: { captain: true, members: true } });
      if (!team) return NextResponse.json({ message: "Selected team was not found." }, { status: 404 });
      if (team.game !== tournament.game) return NextResponse.json({ message: "Team game must match the tournament game." }, { status: 400 });
      if (team.captain.email.toLowerCase() !== account.email.toLowerCase()) return NextResponse.json({ message: "Only the team captain can register this team." }, { status: 403 });
      const existingTeamRegistration = await prisma.registration.findFirst({ where: { tournamentId: tournament.id, teamId: team.id } });
      if (existingTeamRegistration) return NextResponse.json({ message: "This team is already registered for this tournament." }, { status: 409 });
      const activeMembers = team.members.filter((member) => member.status === TeamMemberStatus.ACTIVE).length;
      if (tournament.teamSize && activeMembers < tournament.teamSize) return NextResponse.json({ message: `This tournament requires ${tournament.teamSize} active team members.` }, { status: 400 });
    }

    if (tournament.registrationType === RegistrationType.SOLO && body.teamId) return NextResponse.json({ message: "Solo tournaments must be registered as an individual player." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: account.id },
        data: {
          fullName: body.fullName!.trim(),
          phone: normalizePhone(body.phoneNumber!),
          whatsapp: normalizePhone(body.whatsappNumber!),
          phoneNumber: normalizePhone(body.phoneNumber!),
          whatsappNumber: normalizePhone(body.whatsappNumber!),
          gamerTag: body.gamerTag!.trim(),
          defaultGame: body.game as PrismaGameTitle,
          defaultGamePlayerId: body.platformId!.trim(),
        },
      });

      const registration = await tx.registration.create({
        data: {
          userId: user.id,
          tournamentId: tournament.id,
          teamId: tournament.registrationType === RegistrationType.TEAM ? body.teamId : null,
          platformId: body.platformId!.trim(),
          paymentStatus: PaymentStatus.PENDING,
          approvalStatus: ApprovalStatus.PENDING,
          proofOfPaymentText: "",
          agreedToRules: body.agreedToRules!,
        },
        include: { user: true, tournament: true },
      });

      await tx.tournament.update({ where: { id: tournament.id }, data: { registeredPlayers: { increment: 1 } } });
      return registration;
    });

    return NextResponse.json({
      message: "Registration submitted successfully.",
      registration: {
        id: result.id,
        fullName: result.user.fullName,
        email: result.user.email,
        game: prismaGameToDisplay[result.tournament.game],
        tournamentId: result.tournament.id,
        tournamentTitle: result.tournament.title,
        registrationType: result.tournament.registrationType,
        paymentStatus: result.paymentStatus,
        approvalStatus: result.approvalStatus,
        submittedAt: result.createdAt.toISOString(),
        entryFee: result.tournament.entryFee,
      },
    }, { status: 201 });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) return NextResponse.json({ message: "This player is already registered for this tournament." }, { status: 409 });
    console.error("Failed to create registration", error);
    return NextResponse.json({ message: "Failed to submit registration." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.registration.deleteMany();
    await prisma.tournament.updateMany({ data: { registeredPlayers: 0 } });
    return NextResponse.json({ message: "All registrations cleared." });
  } catch (error) {
    console.error("Failed to clear registrations", error);
    return NextResponse.json({ message: "Failed to clear registrations." }, { status: 500 });
  }
}

function validateRegistrationBody(body: RegistrationRequestBody) {
  if (!body.fullName?.trim()) return "Full name is required.";
  if (!body.email || !isValidEmail(body.email)) return "A valid email is required.";
  if (!body.phoneNumber || !isValidNigerianPhone(body.phoneNumber)) return "Phone number must be 11 digits and start with 070, 080, 081, 090, or 091.";
  if (!body.gamerTag?.trim()) return "Gamer tag is required.";
  if (!body.tournamentId?.trim()) return "Tournament is required.";
  const gamePlayerIdError = validateGamePlayerId(body.platformId ?? "");
  if (gamePlayerIdError) return gamePlayerIdError;
  if (!body.whatsappNumber || !isValidNigerianPhone(body.whatsappNumber)) return "WhatsApp number must be 11 digits and start with 070, 080, 081, 090, or 091.";
  if (!body.agreedToRules) return "You must agree to the tournament rules.";
  return null;
}

function isPrismaErrorCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

