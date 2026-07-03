import { NextRequest, NextResponse } from "next/server";
import { MatchStatus, TeamMemberStatus, type Prisma } from "@/generated/prisma/client";
import { updateMatchResult, type UpdateMatchResultBody } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { applyPenaltyRatingsForMatch } from "@/lib/player-ratings";

type Direction = "LEFT" | "CENTER" | "RIGHT";
type PenaltyMode = "NORMAL" | "SUDDEN_DEATH";

type ShotResult = {
  shotDirection?: Direction;
  keeperDirection?: Direction;
  goal?: boolean;
};

type NormalizedShot = {
  shotNumber: number;
  shotDirection: Direction;
  keeperDirection: Direction;
  goal: boolean;
  roundNumber?: number;
  result?: "GOAL" | "SAVED";
  takenAt?: string;
  error?: string;
};

type PenaltyShootoutRequest = {
  email?: string;
  matchId?: string | null;
  mode?: PenaltyMode;
  shots?: ShotResult[];
  suddenDeathShot?: ShotResult;
};

type PenaltyResultRecord = {
  id: string;
  userId: string;
  matchId: string | null;
  score: number;
  suddenDeathScore: number;
  totalShots: number;
  shotsJson: Prisma.JsonValue;
  suddenDeathShotsJson: Prisma.JsonValue;
  isWinner: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const directions: Direction[] = ["LEFT", "CENTER", "RIGHT"];

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    const matchId = request.nextUrl.searchParams.get("matchId")?.trim();

    if (!email) return NextResponse.json({ message: "Player email is required." }, { status: 400 });
    if (!matchId) return NextResponse.json({ result: null, penaltyMatch: null });

    const player = await prisma.user.findUnique({ where: { email } });
    if (!player?.passwordHash) return NextResponse.json({ message: "Login with a player account before playing penalty shootout." }, { status: 403 });

    await assertPlayerCanUseMatch(matchId, player.id);

    const penaltyMatch = await getPenaltyMatchState(matchId, player.id);
    const existingResult = penaltyMatch.currentPlayerResult;

    return NextResponse.json({ result: existingResult ? serializePenaltyResult(existingResult) : null, penaltyMatch });
  } catch (error) {
    console.error("Failed to fetch penalty shootout result", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to fetch penalty shootout result." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PenaltyShootoutRequest;
    const mode = body.mode ?? "NORMAL";
    const email = body.email?.trim().toLowerCase();
    const matchId = body.matchId?.trim() || null;

    if (!email) return NextResponse.json({ message: "Player email is required." }, { status: 400 });

    const player = await prisma.user.findUnique({ where: { email } });
    if (!player?.passwordHash) return NextResponse.json({ message: "Login with a player account before playing penalty shootout." }, { status: 403 });

    if (mode === "SUDDEN_DEATH") {
      if (!matchId) return NextResponse.json({ message: "Sudden death requires a linked match." }, { status: 400 });
      return submitSuddenDeathShot(player.id, matchId, body.suddenDeathShot);
    }

    if (!Array.isArray(body.shots) || body.shots.length !== 5) return NextResponse.json({ message: "Penalty shootout must contain exactly 5 shots." }, { status: 400 });

    const shots = body.shots.map((shot, index) => normalizeShot(shot, index));
    const invalidShot = shots.find((shot) => shot.error);
    if (invalidShot?.error) return NextResponse.json({ message: invalidShot.error }, { status: 400 });

    if (matchId) {
      await assertPlayerCanUseMatch(matchId, player.id);
      const existingResult = (await getPenaltyMatchState(matchId, player.id)).currentPlayerResult;
      if (existingResult) {
        return NextResponse.json({
          message: existingResult.userId === player.id ? "You have already played the normal penalty round for this match." : "A team representative has already played the normal penalty round for your team.",
          result: serializePenaltyResult(existingResult),
          penaltyMatch: await getPenaltyMatchState(matchId, player.id),
        }, { status: 409 });
      }
    }

    const score = shots.filter((shot) => shot.goal).length;
    const shotPayload = toShotPayload(shots, "NORMAL");

    const savedResult = await prisma.penaltyShootoutResult.create({
      data: {
        userId: player.id,
        matchId,
        score,
        totalShots: 5,
        shotsJson: shotPayload as Prisma.InputJsonValue,
      },
    });

    const matchUpdate = matchId ? await evaluatePenaltyMatch(matchId, player.id) : null;

    return NextResponse.json({
      message: matchUpdate?.suddenDeathRequired ? "Normal round tied. Sudden death is required." : "Penalty shootout score saved successfully.",
      result: serializePenaltyResult(savedResult),
      penaltyMatch: matchId ? await getPenaltyMatchState(matchId, player.id) : null,
      matchUpdate,
    }, { status: 201 });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json({ message: "You have already played the normal penalty round for this match." }, { status: 409 });
    }

    console.error("Failed to save penalty shootout result", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to save penalty shootout result." }, { status: 500 });
  }
}

async function submitSuddenDeathShot(userId: string, matchId: string, shot: ShotResult | undefined) {
  await assertPlayerCanUseMatch(matchId, userId);

  const normalizedShot = normalizeShot(shot ?? {}, 0);
  if (normalizedShot.error) return NextResponse.json({ message: normalizedShot.error }, { status: 400 });

  const state = await getPenaltyMatchState(matchId, userId);
  if (!state.currentPlayerResult) return NextResponse.json({ message: "Complete the normal 5-shot round before sudden death." }, { status: 400 });
  if (!state.opponentResult) return NextResponse.json({ message: "Waiting for opponent to complete the normal round." }, { status: 400 });
  if (!state.suddenDeathRequired) return NextResponse.json({ message: "Sudden death is only available when both normal scores are tied." }, { status: 400 });
  if (state.completed) return NextResponse.json({ message: "This penalty shootout already has a winner." }, { status: 409 });
  if (!state.canTakeSuddenDeathShot) return NextResponse.json({ message: "Waiting for opponent before you can take another sudden death shot." }, { status: 409 });

  const currentShots = normalizeSavedShots(state.currentPlayerResult.suddenDeathShotsJson);
  const nextShot = { ...normalizedShot, shotNumber: currentShots.length + 1 };
  const nextShots = [...currentShots, nextShot];

  const updatedResult = await prisma.penaltyShootoutResult.update({
    where: { id: state.currentPlayerResult.id },
    data: {
      suddenDeathScore: nextShots.filter((item) => item.goal).length,
      suddenDeathShotsJson: toShotPayload(nextShots, "SUDDEN_DEATH") as Prisma.InputJsonValue,
    },
  });

  const matchUpdate = await evaluatePenaltyMatch(matchId, userId);

  return NextResponse.json({
    message: matchUpdate.completed ? "Sudden death completed. Winner decided." : "Sudden death shot saved. Waiting for the next round.",
    result: serializePenaltyResult(updatedResult),
    penaltyMatch: await getPenaltyMatchState(matchId, userId),
    matchUpdate,
  });
}

function normalizeShot(shot: ShotResult, index: number): NormalizedShot {
  if (!shot.shotDirection || !directions.includes(shot.shotDirection)) return { shotNumber: index + 1, shotDirection: "LEFT", keeperDirection: "LEFT", goal: false, error: `Shot ${index + 1} has an invalid player direction.` };
  if (!shot.keeperDirection || !directions.includes(shot.keeperDirection)) return { shotNumber: index + 1, shotDirection: "LEFT", keeperDirection: "LEFT", goal: false, error: `Shot ${index + 1} has an invalid goalkeeper direction.` };
  return { shotNumber: index + 1, shotDirection: shot.shotDirection, keeperDirection: shot.keeperDirection, goal: shot.shotDirection !== shot.keeperDirection };
}

async function assertPlayerCanUseMatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: penaltyMatchSideInclude });
  if (!match) throw new Error("The selected match was not found.");
  const registrationUserIds = [
    ...getRegistrationRepresentativeUserIds(match.homeRegistration ?? match.playerOneRegistration, match.teamLineups),
    ...getRegistrationRepresentativeUserIds(match.awayRegistration ?? match.playerTwoRegistration, match.teamLineups),
  ];
  if (!registrationUserIds.includes(userId)) throw new Error("Only the selected lineup representative can play penalty shootout for this team match.");
}

async function evaluatePenaltyMatch(matchId: string, currentUserId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeRegistration: true,
      awayRegistration: true,
      playerOneRegistration: true,
      playerTwoRegistration: true,
      penaltyShootoutResults: true,
    },
  });

  if (!match) throw new Error("The selected match was not found.");

  const homeId = match.homeRegistrationId ?? match.playerOneRegistrationId;
  const awayId = match.awayRegistrationId ?? match.playerTwoRegistrationId;
  const sideMatch = await prisma.match.findUnique({ where: { id: matchId }, include: penaltyMatchSideInclude });
  if (!sideMatch) throw new Error("The selected match was not found.");
  const homeUserIds = getRegistrationRepresentativeUserIds(sideMatch.homeRegistration ?? sideMatch.playerOneRegistration, sideMatch.teamLineups);
  const awayUserIds = getRegistrationRepresentativeUserIds(sideMatch.awayRegistration ?? sideMatch.playerTwoRegistration, sideMatch.teamLineups);
  const homeResult = match.penaltyShootoutResults.find((result) => homeUserIds.includes(result.userId)) ?? null;
  const awayResult = match.penaltyShootoutResults.find((result) => awayUserIds.includes(result.userId)) ?? null;

  if (!homeResult && !awayResult) return { connected: false, completed: false, suddenDeathRequired: false };

  const currentResult = match.penaltyShootoutResults.find((result) => result.userId === currentUserId);
  const isHomePlayer = homeUserIds.includes(currentUserId);

  if (!homeResult || !awayResult) {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: homeResult?.score ?? match.homeScore,
        awayScore: awayResult?.score ?? match.awayScore,
        playerOneScore: homeResult?.score ?? match.playerOneScore,
        playerTwoScore: awayResult?.score ?? match.playerTwoScore,
      },
    });

    return { connected: true, side: isHomePlayer ? "HOME" : "AWAY", score: currentResult?.score ?? null, completed: false, suddenDeathRequired: false };
  }

  const suddenDeathWinner = getSuddenDeathWinner(homeResult, awayResult);
  const suddenDeathRequired = homeResult.score === awayResult.score;
  const winnerRegistrationId = homeResult.score > awayResult.score ? homeId : awayResult.score > homeResult.score ? awayId : suddenDeathWinner === "HOME" ? homeId : suddenDeathWinner === "AWAY" ? awayId : null;
  const completed = Boolean(winnerRegistrationId);
  const homeTotal = homeResult.score + homeResult.suddenDeathScore;
  const awayTotal = awayResult.score + awayResult.suddenDeathScore;

  if (completed) {
    const updateBody: UpdateMatchResultBody = {
      homeScore: homeTotal,
      awayScore: awayTotal,
      playerOneScore: homeTotal,
      playerTwoScore: awayTotal,
      winnerRegistrationId,
      status: MatchStatus.COMPLETED,
    };
    await updateMatchResult(matchId, updateBody);
    await applyPenaltyRatingsForMatch(matchId);
  } else {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: homeTotal,
        awayScore: awayTotal,
        playerOneScore: homeTotal,
        playerTwoScore: awayTotal,
        status: suddenDeathRequired ? MatchStatus.DISPUTED : MatchStatus.PENDING,
        winnerRegistrationId: null,
      },
    });
  }

  await prisma.penaltyShootoutResult.updateMany({ where: { matchId }, data: { isWinner: false } });
  if (winnerRegistrationId && homeId && awayId) {
    const winningResult = winnerRegistrationId === homeId ? homeResult : awayResult;
    if (winningResult) {
      await prisma.penaltyShootoutResult.update({ where: { id: winningResult.id }, data: { isWinner: true } });
    }
  }

  return { connected: true, side: isHomePlayer ? "HOME" : "AWAY", score: currentResult?.score ?? null, completed, suddenDeathRequired };
}

async function getPenaltyMatchState(matchId: string, currentUserId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeRegistration: { include: { user: true } },
      awayRegistration: { include: { user: true } },
      playerOneRegistration: { include: { user: true } },
      playerTwoRegistration: { include: { user: true } },
      winnerRegistration: { include: { user: true } },
      penaltyShootoutResults: true,
    },
  });

  if (!match) throw new Error("The selected match was not found.");

  const sideMatch = await prisma.match.findUnique({ where: { id: matchId }, include: penaltyMatchSideInclude });
  if (!sideMatch) throw new Error("The selected match was not found.");
  const homeUserIds = getRegistrationRepresentativeUserIds(sideMatch.homeRegistration ?? sideMatch.playerOneRegistration, sideMatch.teamLineups);
  const awayUserIds = getRegistrationRepresentativeUserIds(sideMatch.awayRegistration ?? sideMatch.playerTwoRegistration, sideMatch.teamLineups);
  const currentSideUserIds = homeUserIds.includes(currentUserId) ? homeUserIds : awayUserIds.includes(currentUserId) ? awayUserIds : [];
  const opponentSideUserIds = currentSideUserIds === homeUserIds ? awayUserIds : homeUserIds;
  const homeResult = match.penaltyShootoutResults.find((result) => homeUserIds.includes(result.userId)) ?? null;
  const awayResult = match.penaltyShootoutResults.find((result) => awayUserIds.includes(result.userId)) ?? null;
  const currentPlayerResult = match.penaltyShootoutResults.find((result) => currentSideUserIds.includes(result.userId)) ?? null;
  const opponentResult = match.penaltyShootoutResults.find((result) => opponentSideUserIds.includes(result.userId)) ?? null;
  const currentSuddenDeathShots = currentPlayerResult ? normalizeSavedShots(currentPlayerResult.suddenDeathShotsJson) : [];
  const opponentSuddenDeathShots = opponentResult ? normalizeSavedShots(opponentResult.suddenDeathShotsJson) : [];
  const suddenDeathRequired = Boolean(homeResult && awayResult && homeResult.score === awayResult.score);
  const winnerName = match.winnerRegistration?.user.fullName ?? (homeResult?.isWinner ? match.homeRegistration?.user.fullName ?? match.playerOneRegistration?.user.fullName : awayResult?.isWinner ? match.awayRegistration?.user.fullName ?? match.playerTwoRegistration?.user.fullName : null);

  return {
    matchStatus: match.status,
    suddenDeathRequired,
    completed: match.status === MatchStatus.COMPLETED,
    winnerName,
    currentPlayerResult,
    opponentResult,
    canTakeSuddenDeathShot: suddenDeathRequired && match.status !== MatchStatus.COMPLETED && currentSuddenDeathShots.length <= opponentSuddenDeathShots.length,
    waitingForOpponent: suddenDeathRequired && currentSuddenDeathShots.length > opponentSuddenDeathShots.length,
    currentSuddenDeathRounds: currentSuddenDeathShots.length,
    opponentSuddenDeathRounds: opponentSuddenDeathShots.length,
  };
}

function getSuddenDeathWinner(homeResult: PenaltyResultRecord, awayResult: PenaltyResultRecord) {
  const homeShots = normalizeSavedShots(homeResult.suddenDeathShotsJson);
  const awayShots = normalizeSavedShots(awayResult.suddenDeathShotsJson);
  const completedRounds = Math.min(homeShots.length, awayShots.length);

  for (let index = 0; index < completedRounds; index += 1) {
    if (homeShots[index].goal !== awayShots[index].goal) return homeShots[index].goal ? "HOME" : "AWAY";
  }

  return null;
}

function normalizeSavedShots(value: Prisma.JsonValue): NormalizedShot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const keeperDirection = record.keeperDirection ?? record.goalkeeperDirection;
    if (!directions.includes(record.shotDirection as Direction) || !directions.includes(keeperDirection as Direction) || typeof record.goal !== "boolean") return [];
    return [{
      shotNumber: typeof record.shotNumber === "number" ? record.shotNumber : index + 1,
      roundNumber: typeof record.roundNumber === "number" ? record.roundNumber : index + 1,
      shotDirection: record.shotDirection as Direction,
      keeperDirection: keeperDirection as Direction,
      result: record.result === "GOAL" || record.result === "SAVED" ? record.result : record.goal ? "GOAL" : "SAVED",
      takenAt: typeof record.takenAt === "string" ? record.takenAt : undefined,
      goal: record.goal,
    }];
  });
}

function toShotPayload(shots: NormalizedShot[], mode: PenaltyMode) {
  const savedAt = new Date();
  return shots.map((shot, index) => ({
    shotNumber: shot.shotNumber,
    roundNumber: mode === "NORMAL" ? shot.shotNumber : index + 1,
    roundType: mode,
    shotDirection: shot.shotDirection,
    goalkeeperDirection: shot.keeperDirection,
    keeperDirection: shot.keeperDirection,
    result: shot.goal ? "GOAL" : "SAVED",
    goal: shot.goal,
    takenAt: shot.takenAt ?? new Date(savedAt.getTime() + index).toISOString(),
  }));
}

const penaltyMatchSideInclude = {
  homeRegistration: { include: { team: { include: { members: { where: { status: TeamMemberStatus.ACTIVE } } } } } },
  awayRegistration: { include: { team: { include: { members: { where: { status: TeamMemberStatus.ACTIVE } } } } } },
  playerOneRegistration: { include: { team: { include: { members: { where: { status: TeamMemberStatus.ACTIVE } } } } } },
  playerTwoRegistration: { include: { team: { include: { members: { where: { status: TeamMemberStatus.ACTIVE } } } } } },
  teamLineups: true,
} satisfies Prisma.MatchInclude;

type PenaltyRegistrationSide = Prisma.RegistrationGetPayload<{
  include: { team: { include: { members: true } } };
}>;

function getRegistrationRepresentativeUserIds(registration: PenaltyRegistrationSide | null, lineups: { registrationId: string; representativeUserId: string }[]) {
  if (!registration) return [];
  if (!registration.team) return [registration.userId];
  const lineup = lineups.find((item) => item.registrationId === registration.id);
  return lineup ? [lineup.representativeUserId] : [];
}

function serializePenaltyResult(result: PenaltyResultRecord) {
  return {
    id: result.id,
    score: result.score,
    suddenDeathScore: result.suddenDeathScore,
    totalShots: result.totalShots,
    matchId: result.matchId,
    shots: result.shotsJson,
    suddenDeathShots: result.suddenDeathShotsJson,
    isWinner: result.isWinner,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}

function isPrismaErrorCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
