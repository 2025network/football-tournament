import { NextResponse } from "next/server";
import { MatchLiveStatus, MatchStatus, NotificationType } from "@/generated/prisma/client";
import { updateMatchResult } from "@/lib/competition";
import { notifyRegistrations } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const match = await prisma.match.findUnique({ where: { id } });

    if (!match) {
      return NextResponse.json({ message: "Match not found." }, { status: 404 });
    }

    const homeScore = match.homeRegistrationId || match.awayRegistrationId ? match.liveHomeScore : match.livePlayerOneScore;
    const awayScore = match.homeRegistrationId || match.awayRegistrationId ? match.liveAwayScore : match.livePlayerTwoScore;
    const winnerRegistrationId = getWinnerRegistrationId(match.homeRegistrationId ?? match.playerOneRegistrationId, match.awayRegistrationId ?? match.playerTwoRegistrationId, homeScore, awayScore);

    const data = await updateMatchResult(id, {
      homeScore,
      awayScore,
      playerOneScore: match.livePlayerOneScore,
      playerTwoScore: match.livePlayerTwoScore,
      winnerRegistrationId,
      status: MatchStatus.COMPLETED,
      liveStatus: MatchLiveStatus.COMPLETED,
      liveEndedAt: new Date().toISOString(),
    });

    await notifyRegistrations(getMatchRegistrationIds(match), "Live result finalized", "A referee finalized your match result. Check your dashboard for the updated score and rankings.", NotificationType.RESULT);

    return NextResponse.json({ message: "Live result finalized and applied to tournament standings.", ...data });
  } catch (error) {
    console.error("Failed to finalize live result", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to finalize live result." }, { status: 500 });
  }
}

function getWinnerRegistrationId(homeRegistrationId: string | null, awayRegistrationId: string | null, homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return homeRegistrationId ?? null;
  if (awayScore > homeScore) return awayRegistrationId ?? null;
  return null;
}

function getMatchRegistrationIds(match: { playerOneRegistrationId: string | null; playerTwoRegistrationId: string | null; homeRegistrationId: string | null; awayRegistrationId: string | null }) {
  return Array.from(new Set([match.playerOneRegistrationId, match.playerTwoRegistrationId, match.homeRegistrationId, match.awayRegistrationId].filter(Boolean))) as string[];
}

