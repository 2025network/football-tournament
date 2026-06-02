import { NextRequest, NextResponse } from "next/server";
import { getCompetitionData } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type AssignRefereeBody = { email?: string };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as AssignRefereeBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Referee email is required." }, { status: 400 });
    }

    const referee = await prisma.user.findUnique({ where: { email } });

    if (!referee) {
      return NextResponse.json({ message: "No player/admin account was found with that email." }, { status: 404 });
    }

    const match = await prisma.match.update({
      where: { id },
      data: { refereeId: referee.id },
      select: { tournamentId: true },
    });

    const data = await getCompetitionData(match.tournamentId);
    return NextResponse.json({ message: `${referee.fullName} has been assigned as referee.`, ...data });
  } catch (error) {
    console.error("Failed to assign referee", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to assign referee." }, { status: 500 });
  }
}

