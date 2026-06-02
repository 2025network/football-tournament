import { NextRequest, NextResponse } from "next/server";
import { GameTitle, TeamMemberStatus, TeamRole } from "@/generated/prisma/client";
import { normalizeTeamTag, serializeTeam, teamInclude } from "@/lib/teams";
import { prisma } from "@/lib/prisma";

type CreateTeamBody = {
  name?: string;
  tag?: string;
  logoUrl?: string;
  captainEmail?: string;
  game?: GameTitle;
  description?: string;
};

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    const captainOnly = request.nextUrl.searchParams.get("captainOnly") === "true";
    const game = request.nextUrl.searchParams.get("game") as GameTitle | null;

    const teams = await prisma.team.findMany({
      where: {
        ...(game && Object.values(GameTitle).includes(game) ? { game } : {}),
        ...(email
          ? captainOnly
            ? { captain: { email } }
            : { members: { some: { user: { email }, status: TeamMemberStatus.ACTIVE } } }
          : {}),
      },
      include: teamInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ teams: teams.map(serializeTeam) });
  } catch (error) {
    console.error("Failed to fetch teams", error);
    return NextResponse.json({ message: "Failed to fetch teams." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateTeamBody;
    const validationError = validateBody(body);
    if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

    const email = body.captainEmail!.trim().toLowerCase();
    const tag = normalizeTeamTag(body.tag!);

    const captain = await prisma.user.findUnique({ where: { email } });
    if (!captain?.passwordHash) {
      return NextResponse.json({ message: "Captain must be a logged-in player account." }, { status: 404 });
    }

    const team = await prisma.team.create({
      data: {
        name: body.name!.trim(),
        tag,
        logoUrl: body.logoUrl?.trim() || null,
        captainId: captain.id,
        game: body.game!,
        description: body.description?.trim() || null,
        members: {
          create: {
            userId: captain.id,
            role: TeamRole.CAPTAIN,
            status: TeamMemberStatus.ACTIVE,
          },
        },
      },
      include: teamInclude,
    });

    return NextResponse.json({ message: "Team created successfully.", team: serializeTeam(team) }, { status: 201 });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json({ message: "Team tag is already taken. Choose another tag." }, { status: 409 });
    }
    console.error("Failed to create team", error);
    return NextResponse.json({ message: "Failed to create team." }, { status: 500 });
  }
}

function validateBody(body: CreateTeamBody) {
  if (!body.name?.trim()) return "Team name is required.";
  if (!body.tag?.trim() || normalizeTeamTag(body.tag).length < 2) return "Team tag must be at least 2 letters or numbers.";
  if (!body.captainEmail?.trim()) return "Captain email is required.";
  if (!body.game || !Object.values(GameTitle).includes(body.game)) return "Valid team game is required.";
  return null;
}

function isPrismaErrorCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}