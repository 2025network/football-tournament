import { NextRequest, NextResponse } from "next/server";
import { GameTitle } from "@/generated/prisma/client";
import { isCaptain, normalizeTeamTag, serializeTeam, teamInclude } from "@/lib/teams";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type UpdateTeamBody = {
  name?: string;
  tag?: string;
  logoUrl?: string | null;
  captainEmail?: string;
  game?: GameTitle;
  description?: string | null;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const team = await prisma.team.findUnique({ where: { id }, include: teamInclude });
    if (!team) return NextResponse.json({ message: "Team not found." }, { status: 404 });
    return NextResponse.json({ team: serializeTeam(team) });
  } catch (error) {
    console.error("Failed to fetch team", error);
    return NextResponse.json({ message: "Failed to fetch team." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateTeamBody;
    const currentTeam = await prisma.team.findUnique({ where: { id }, include: teamInclude });
    if (!currentTeam) return NextResponse.json({ message: "Team not found." }, { status: 404 });
    if (!body.captainEmail || !isCaptain(currentTeam, body.captainEmail)) {
      return NextResponse.json({ message: "Only the team captain can edit this team." }, { status: 403 });
    }

    if (!body.name?.trim()) return NextResponse.json({ message: "Team name is required." }, { status: 400 });
    if (!body.game || !Object.values(GameTitle).includes(body.game)) return NextResponse.json({ message: "Valid game is required." }, { status: 400 });

    const team = await prisma.team.update({
      where: { id },
      data: {
        name: body.name.trim(),
        tag: body.tag ? normalizeTeamTag(body.tag) : currentTeam.tag,
        logoUrl: body.logoUrl?.trim() || null,
        game: body.game,
        description: body.description?.trim() || null,
      },
      include: teamInclude,
    });

    return NextResponse.json({ message: "Team updated successfully.", team: serializeTeam(team) });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json({ message: "Team tag is already taken." }, { status: 409 });
    }
    console.error("Failed to update team", error);
    return NextResponse.json({ message: "Failed to update team." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const captainEmail = request.nextUrl.searchParams.get("captainEmail")?.trim().toLowerCase();
    const team = await prisma.team.findUnique({ where: { id }, include: teamInclude });
    if (!team) return NextResponse.json({ message: "Team not found." }, { status: 404 });
    if (!captainEmail || !isCaptain(team, captainEmail)) {
      return NextResponse.json({ message: "Only the team captain can delete this team." }, { status: 403 });
    }

    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ message: "Team deleted successfully." });
  } catch (error) {
    console.error("Failed to delete team", error);
    return NextResponse.json({ message: "Failed to delete team." }, { status: 500 });
  }
}

function isPrismaErrorCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}