import { NextRequest, NextResponse } from "next/server";
import { MatchStatus, PenaltyShootoutAdminActionType } from "@/generated/prisma/client";
import { updateMatchResult, type UpdateMatchResultBody } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { applyPenaltyRatingsForMatch } from "@/lib/player-ratings";

type AdminPenaltyActionBody = {
  actionType?: "MANUAL_WINNER" | "RESET_RESULT";
  resultId?: string;
  adminName?: string;
  reason?: string;
};

export async function GET() {
  try {
    const [results, actions] = await Promise.all([
      prisma.penaltyShootoutResult.findMany({
        include: {
          user: true,
          match: { include: { tournament: true, homeRegistration: { include: { user: true, team: true } }, awayRegistration: { include: { user: true, team: true } }, winnerRegistration: { include: { user: true, team: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.penaltyShootoutAdminAction.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    ]);

    return NextResponse.json({
      results: results.map((result) => ({
        id: result.id,
        playerName: result.user.gamerTag || result.user.fullName,
        playerEmail: result.user.email,
        platformId: result.user.platformId,
        score: result.score,
        suddenDeathScore: result.suddenDeathScore,
        totalShots: result.totalShots,
        shots: result.shotsJson,
        suddenDeathShots: result.suddenDeathShotsJson,
        isWinner: result.isWinner,
        auditVersion: result.auditVersion,
        matchId: result.matchId,
        tournamentTitle: result.match?.tournament.title ?? null,
        homeName: result.match?.homeRegistration?.team?.name ?? result.match?.homeRegistration?.user.fullName ?? null,
        awayName: result.match?.awayRegistration?.team?.name ?? result.match?.awayRegistration?.user.fullName ?? null,
        winnerName: result.match?.winnerRegistration?.team?.name ?? result.match?.winnerRegistration?.user.fullName ?? (result.isWinner ? result.user.gamerTag || result.user.fullName : null),
        matchStatus: result.match?.status ?? null,
        adminActions: actions.filter((action) => action.matchId === result.matchId || action.resultId === result.id).map(serializeAction),
        createdAt: result.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch penalty shootout results", error);
    return NextResponse.json({ message: "Failed to fetch penalty shootout results." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminPenaltyActionBody;
    const validationError = validateActionBody(body);
    if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

    if (body.actionType === "MANUAL_WINNER") {
      return markManualWinner(body.resultId!, body.adminName!.trim(), body.reason!.trim());
    }

    return resetPenaltyResult(body.resultId!, body.adminName!.trim(), body.reason!.trim());
  } catch (error) {
    console.error("Failed to run penalty admin action", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to run penalty admin action." }, { status: 500 });
  }
}

async function markManualWinner(resultId: string, adminName: string, reason: string) {
  const result = await prisma.penaltyShootoutResult.findUnique({
    where: { id: resultId },
    include: { match: { include: { homeRegistration: true, awayRegistration: true, playerOneRegistration: true, playerTwoRegistration: true } } },
  });

  if (!result || !result.match) return NextResponse.json({ message: "Penalty result or linked match was not found." }, { status: 404 });
  if (result.match.status !== MatchStatus.DISPUTED) return NextResponse.json({ message: "Manual winner can only be set for disputed penalty matches." }, { status: 400 });

  const side = getResultSide(result.userId, result.match);
  if (!side.winnerRegistrationId) return NextResponse.json({ message: "Could not match this result to a player side." }, { status: 400 });

  const homeResult = await prisma.penaltyShootoutResult.findFirst({ where: { matchId: result.matchId, userId: side.homeUserId ?? undefined } });
  const awayResult = await prisma.penaltyShootoutResult.findFirst({ where: { matchId: result.matchId, userId: side.awayUserId ?? undefined } });
  const homeScore = (homeResult?.score ?? result.match.homeScore ?? 0) + (homeResult?.suddenDeathScore ?? 0);
  const awayScore = (awayResult?.score ?? result.match.awayScore ?? 0) + (awayResult?.suddenDeathScore ?? 0);

  const updateBody: UpdateMatchResultBody = {
    homeScore,
    awayScore,
    playerOneScore: homeScore,
    playerTwoScore: awayScore,
    winnerRegistrationId: side.winnerRegistrationId,
    status: MatchStatus.COMPLETED,
  };

  await prisma.$transaction(async (tx) => {
    await tx.penaltyShootoutResult.updateMany({ where: { matchId: result.matchId }, data: { isWinner: false } });
    await tx.penaltyShootoutResult.update({ where: { id: result.id }, data: { isWinner: true } });
    await tx.penaltyShootoutAdminAction.create({ data: { matchId: result.matchId!, resultId: result.id, actionType: PenaltyShootoutAdminActionType.MANUAL_WINNER, adminName, reason } });
  });

  await updateMatchResult(result.matchId!, updateBody);
  await applyPenaltyRatingsForMatch(result.matchId!);
  return NextResponse.json({ message: "Manual penalty winner saved and player ratings updated." });
}

async function resetPenaltyResult(resultId: string, adminName: string, reason: string) {
  const result = await prisma.penaltyShootoutResult.findUnique({
    where: { id: resultId },
    include: { match: { include: { homeRegistration: true, awayRegistration: true, playerOneRegistration: true, playerTwoRegistration: true } } },
  });

  if (!result || !result.match) return NextResponse.json({ message: "Penalty result or linked match was not found." }, { status: 404 });
  if (result.match.status !== MatchStatus.DISPUTED) return NextResponse.json({ message: "Reset is only allowed for disputed penalty matches." }, { status: 400 });

  const side = getResultSide(result.userId, result.match);
  const resetData = side.isHome
    ? { homeScore: null, playerOneScore: null, winnerRegistrationId: null, status: MatchStatus.PENDING }
    : { awayScore: null, playerTwoScore: null, winnerRegistrationId: null, status: MatchStatus.PENDING };

  await prisma.$transaction(async (tx) => {
    await tx.penaltyShootoutAdminAction.create({ data: { matchId: result.matchId!, resultId: result.id, actionType: PenaltyShootoutAdminActionType.RESET_RESULT, adminName, reason } });
    await tx.penaltyShootoutResult.delete({ where: { id: result.id } });
    await tx.match.update({ where: { id: result.matchId! }, data: resetData });
  });

  return NextResponse.json({ message: "Penalty result reset. Player can replay this disputed match attempt." });
}

function getResultSide(userId: string, match: { homeRegistrationId: string | null; awayRegistrationId: string | null; playerOneRegistrationId: string | null; playerTwoRegistrationId: string | null; homeRegistration: { userId: string } | null; awayRegistration: { userId: string } | null; playerOneRegistration: { userId: string } | null; playerTwoRegistration: { userId: string } | null }) {
  const homeUserId = match.homeRegistration?.userId ?? match.playerOneRegistration?.userId ?? null;
  const awayUserId = match.awayRegistration?.userId ?? match.playerTwoRegistration?.userId ?? null;
  const isHome = homeUserId === userId;
  const isAway = awayUserId === userId;
  return {
    homeUserId,
    awayUserId,
    isHome,
    isAway,
    winnerRegistrationId: isHome ? match.homeRegistrationId ?? match.playerOneRegistrationId : isAway ? match.awayRegistrationId ?? match.playerTwoRegistrationId : null,
  };
}

function validateActionBody(body: AdminPenaltyActionBody) {
  if (body.actionType !== "MANUAL_WINNER" && body.actionType !== "RESET_RESULT") return "Valid action type is required.";
  if (!body.resultId?.trim()) return "Penalty result is required.";
  if (!body.adminName?.trim()) return "Admin name is required.";
  if (!body.reason?.trim()) return "Reason is required before this admin action can be saved.";
  if (body.reason.trim().length < 5) return "Reason must be at least 5 characters.";
  return null;
}

function serializeAction(action: { id: string; matchId: string; resultId: string | null; actionType: PenaltyShootoutAdminActionType; adminName: string; reason: string; createdAt: Date }) {
  return {
    id: action.id,
    matchId: action.matchId,
    resultId: action.resultId,
    actionType: action.actionType,
    adminName: action.adminName,
    reason: action.reason,
    createdAt: action.createdAt.toISOString(),
  };
}
