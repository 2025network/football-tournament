import { NextRequest, NextResponse } from "next/server";
import { MatchLiveStatus } from "@/generated/prisma/client";
import { getCompetitionData } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type LiveScoreBody = {
  liveStatus?: MatchLiveStatus;
  livePlayerOneScore?: number;
  livePlayerTwoScore?: number;
  liveHomeScore?: number;
  liveAwayScore?: number;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as LiveScoreBody;
    const validationError = validateBody(body);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const currentMatch = await prisma.match.findUnique({ where: { id } });

    if (!currentMatch) {
      return NextResponse.json({ message: "Match not found." }, { status: 404 });
    }

    const liveStatus = body.liveStatus ?? currentMatch.liveStatus;

    const match = await prisma.match.update({
      where: { id },
      data: {
        liveStatus,
        livePlayerOneScore: body.livePlayerOneScore ?? currentMatch.livePlayerOneScore,
        livePlayerTwoScore: body.livePlayerTwoScore ?? currentMatch.livePlayerTwoScore,
        liveHomeScore: body.liveHomeScore ?? currentMatch.liveHomeScore,
        liveAwayScore: body.liveAwayScore ?? currentMatch.liveAwayScore,
        liveStartedAt: liveStatus === MatchLiveStatus.LIVE && !currentMatch.liveStartedAt ? new Date() : currentMatch.liveStartedAt,
      },
      select: { tournamentId: true },
    });

    const data = await getCompetitionData(match.tournamentId);
    return NextResponse.json({ message: "Live score updated.", ...data });
  } catch (error) {
    console.error("Failed to update live score", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to update live score." }, { status: 500 });
  }
}

function validateBody(body: LiveScoreBody) {
  if (body.liveStatus && !Object.values(MatchLiveStatus).includes(body.liveStatus)) {
    return "Valid live match status is required.";
  }

  const scoreFields = [body.livePlayerOneScore, body.livePlayerTwoScore, body.liveHomeScore, body.liveAwayScore];
  if (scoreFields.some((value) => value !== undefined && (!Number.isInteger(value) || value < 0))) {
    return "Live scores must be zero or positive whole numbers.";
  }

  return null;
}

