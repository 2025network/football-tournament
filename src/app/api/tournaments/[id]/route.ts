import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApprovalStatus, CompetitionFormat, GameTitle, PaymentStatus, RegistrationType, StreamPlatform, TournamentStatus } from "@/generated/prisma/client";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TournamentRequestBody = {
  title?: string;
  game?: GameTitle;
  prizePool?: number | string;
  entryFee?: number | string;
  slots?: number | string;
  startDate?: string;
  status?: TournamentStatus;
  format?: string;
  competitionFormat?: CompetitionFormat;
  registrationLimit?: number | string | null;
  allowUnlimitedRegistration?: boolean;
  registrationOpen?: boolean;
  useHomeAndAway?: boolean;
  registrationType?: RegistrationType;
  teamSize?: number | string | null;
  livestreamUrl?: string | null;
  streamPlatform?: StreamPlatform | null;
  description?: string;
  rules?: string[] | string;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { registrations: { where: { approvalStatus: ApprovalStatus.APPROVED, paymentStatus: PaymentStatus.PAID }, select: { id: true } } },
    });

    if (!tournament) {
      return NextResponse.json({ message: "Tournament not found." }, { status: 404 });
    }

    return NextResponse.json({
      tournament: {
        ...tournament,
        calculatedPrizePool: tournament.entryFee * tournament.registrations.length,
        registrations: undefined,
      },
    });
  } catch (error) {
    console.error("Failed to fetch tournament", error);
    return NextResponse.json({ message: "Failed to fetch tournament." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as TournamentRequestBody;
    const validationError = validateTournamentBody(body);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        title: body.title!.trim(),
        game: body.game!,
        prizePool: Number(body.prizePool),
        entryFee: Number(body.entryFee),
        slots: Number(body.slots),
        startDate: new Date(body.startDate!),
        status: body.status!,
        format: body.format!.trim(),
        competitionFormat: body.competitionFormat ?? CompetitionFormat.OPEN_KNOCKOUT,
        registrationLimit: normalizeOptionalNumber(body.registrationLimit),
        allowUnlimitedRegistration: Boolean(body.allowUnlimitedRegistration),
        registrationOpen: body.registrationOpen ?? true,
        useHomeAndAway: Boolean(body.useHomeAndAway),
        registrationType: body.registrationType ?? RegistrationType.SOLO,
        teamSize: (body.registrationType ?? RegistrationType.SOLO) === RegistrationType.TEAM ? normalizeOptionalNumber(body.teamSize) : null,
        livestreamUrl: body.livestreamUrl?.trim() || null,
        streamPlatform: body.streamPlatform || null,
        description: body.description!.trim(),
        rules: normalizeRules(body.rules),
      },
    });

    return NextResponse.json({ message: "Tournament updated successfully.", tournament });
  } catch (error) {
    console.error("Failed to update tournament", error);
    return NextResponse.json({ message: "Failed to update tournament." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    await prisma.tournament.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Tournament deleted successfully." });
  } catch (error) {
    console.error("Failed to delete tournament", error);
    return NextResponse.json({ message: "Failed to delete tournament." }, { status: 500 });
  }
}

function validateTournamentBody(body: TournamentRequestBody) {
  if (!body.title?.trim()) return "Title is required.";
  if (!body.game || !Object.values(GameTitle).includes(body.game)) return "Valid football category is required.";
  if (!isPositiveNumber(body.prizePool)) return "Prize pool must be a positive number.";
  if (!isNonNegativeNumber(body.entryFee)) return "Entry fee must be zero or greater.";
  if (!isPositiveNumber(body.slots)) return "Slots must be a positive number.";
  if (!body.startDate || Number.isNaN(new Date(body.startDate).getTime())) return "Valid start date is required.";
  if (!body.status || !Object.values(TournamentStatus).includes(body.status)) return "Valid status is required.";
  if (!body.format?.trim()) return "Format is required.";
  if (body.competitionFormat && !Object.values(CompetitionFormat).includes(body.competitionFormat)) return "Valid competition format is required.";
  if (body.registrationLimit !== undefined && body.registrationLimit !== null && !isPositiveNumber(body.registrationLimit)) return "Registration limit must be a positive number.";
  if (body.allowUnlimitedRegistration !== undefined && typeof body.allowUnlimitedRegistration !== "boolean") return "Allow unlimited registration must be true or false.";
  if (body.registrationOpen !== undefined && typeof body.registrationOpen !== "boolean") return "Registration open must be true or false.";
  if (body.useHomeAndAway !== undefined && typeof body.useHomeAndAway !== "boolean") return "Use home and away must be true or false.";
  if (body.registrationType && !Object.values(RegistrationType).includes(body.registrationType)) return "Valid registration type is required.";
  if (body.teamSize !== undefined && body.teamSize !== null && body.teamSize !== "" && !isPositiveNumber(body.teamSize)) return "Team size must be a positive number.";
  if ((body.registrationType ?? RegistrationType.SOLO) === RegistrationType.TEAM && (!body.teamSize || Number(body.teamSize) < 2)) return "Team tournaments need a team size of at least 2.";
  if ((body.registrationType ?? RegistrationType.SOLO) === RegistrationType.SOLO && body.teamSize) return "Solo tournaments should not include a team size.";
  if (body.streamPlatform && !Object.values(StreamPlatform).includes(body.streamPlatform)) return "Valid stream platform is required.";
  if (!body.description?.trim()) return "Description is required.";
  if (normalizeRules(body.rules).length === 0) return "At least one rule is required.";

  return null;
}

function isPositiveNumber(value: unknown) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function isNonNegativeNumber(value: unknown) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function normalizeOptionalNumber(value: TournamentRequestBody["registrationLimit"]) {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
}

function normalizeRules(rules: TournamentRequestBody["rules"]) {
  if (Array.isArray(rules)) {
    return rules.map((rule) => rule.trim()).filter(Boolean);
  }

  return String(rules ?? "")
    .split(/\r?\n/)
    .map((rule) => rule.trim())
    .filter(Boolean);
}



