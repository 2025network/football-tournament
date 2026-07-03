import { ApprovalStatus, CompetitionFormat, MatchLiveStatus, MatchStatus, MatchStreamMode, NotificationType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyRegistrations } from "@/lib/notifications";
import { recalculateGlobalRankings } from "@/lib/rankings";

export const registrationInclude = {
  user: true,
  team: { include: { captain: true } },
  tournament: true,
} satisfies Prisma.RegistrationInclude;

export const matchInclude = {
  playerOneRegistration: { include: { user: true, team: { include: { members: { include: { user: true } } } } } },
  playerTwoRegistration: { include: { user: true, team: { include: { members: { include: { user: true } } } } } },
  winnerRegistration: { include: { user: true, team: true } },
  homeRegistration: { include: { user: true, team: { include: { members: { include: { user: true } } } } } },
  awayRegistration: { include: { user: true, team: { include: { members: { include: { user: true } } } } } },
  aggregateWinnerRegistration: { include: { user: true, team: true } },
  teamLineups: { include: { team: { include: { members: { include: { user: true } } } } } },
  referee: true,
  resultSubmissions: {
    include: { registration: { include: { user: true, team: true } } },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.MatchInclude;

export const standingInclude = {
  registration: { include: { user: true, team: true } },
} satisfies Prisma.LeagueStandingInclude;

export type MatchWithPlayers = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;
export type StandingWithPlayer = Prisma.LeagueStandingGetPayload<{ include: typeof standingInclude }>;

type ApprovedRegistration = Prisma.RegistrationGetPayload<{ include: { user: true; team: { include: { captain: true } } } }>;

export async function getApprovedRegistrations(tournamentId: string) {
  return prisma.registration.findMany({
    where: { tournamentId, approvalStatus: ApprovalStatus.APPROVED },
    include: { user: true, team: { include: { captain: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function clearCompetitionData(tournamentId: string) {
  await prisma.match.deleteMany({ where: { tournamentId } });
  await prisma.leagueStanding.deleteMany({ where: { tournamentId } });
}

export async function generateKnockout(tournamentId: string, options: { notifyPlayers?: boolean } = {}) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

  if (!tournament) {
    throw new Error("Tournament not found.");
  }

  const registrations = await getApprovedRegistrations(tournamentId);

  if (registrations.length < 2) {
    throw new Error("At least two approved players are required to generate knockout matches.");
  }

  await clearCompetitionData(tournamentId);

  const createdMatchPlayerIds: string[] = [];

  for (let index = 0; index < registrations.length - 1; index += 2) {
    const playerA = registrations[index];
    const playerB = registrations[index + 1];

    createdMatchPlayerIds.push(playerA.id, playerB.id);

    if (tournament.useHomeAndAway) {
      await createTwoLegPair(tournamentId, 1, null, playerA.id, playerB.id);
    } else {
      await prisma.match.create({
        data: {
          tournamentId,
          round: 1,
          playerOneRegistrationId: playerA.id,
          playerTwoRegistrationId: playerB.id,
          homeRegistrationId: playerA.id,
          awayRegistrationId: playerB.id,
        },
      });
    }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { competitionFormat: CompetitionFormat.OPEN_KNOCKOUT, registrationOpen: false },
  });

  if (options.notifyPlayers ?? true) {
    await notifyRegistrations(createdMatchPlayerIds, "Knockout match generated", "A knockout match has been scheduled for your tournament.", NotificationType.MATCH);
  }

  return getCompetitionData(tournamentId);
}

export async function generateLeague(tournamentId: string, options: { notifyPlayers?: boolean } = {}) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

  if (!tournament) {
    throw new Error("Tournament not found.");
  }

  const registrations = await getApprovedRegistrations(tournamentId);

  if (registrations.length < 2) {
    throw new Error("At least two approved players are required to generate league fixtures.");
  }

  await clearCompetitionData(tournamentId);
  await createStandings(tournamentId, registrations, null);
  await createRoundRobinFixtures(tournamentId, registrations, null, tournament.useHomeAndAway);
  if (options.notifyPlayers ?? true) {
    await notifyRegistrations(registrations.map((registration) => registration.id), "League fixtures generated", "Your league match schedule is now available.", NotificationType.MATCH);
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { competitionFormat: CompetitionFormat.LEAGUE, registrationOpen: false },
  });

  return getCompetitionData(tournamentId);
}

export async function generateChampionsLeague(tournamentId: string, options: { notifyPlayers?: boolean } = {}) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

  if (!tournament) {
    throw new Error("Tournament not found.");
  }

  const registrations = await getApprovedRegistrations(tournamentId);

  if (registrations.length < 4) {
    throw new Error("At least four approved players are recommended for group-stage fixtures.");
  }

  await clearCompetitionData(tournamentId);
  const groups = createGroups(registrations);

  for (const [groupName, groupRegistrations] of groups.entries()) {
    await createStandings(tournamentId, groupRegistrations, groupName);
    await createRoundRobinFixtures(tournamentId, groupRegistrations, groupName, tournament.useHomeAndAway);
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { competitionFormat: CompetitionFormat.CHAMPIONS_LEAGUE, registrationOpen: false },
  });

  if (options.notifyPlayers ?? true) {
    await notifyRegistrations(registrations.map((registration) => registration.id), "Group Stage fixtures generated", "Your group-stage schedule is now available.", NotificationType.MATCH);
  }

  return getCompetitionData(tournamentId);
}

export async function getCompetitionData(tournamentId: string) {
  const [tournament, approvedPlayers, matches, standings] = await Promise.all([
    prisma.tournament.findUnique({ where: { id: tournamentId } }),
    getApprovedRegistrations(tournamentId),
    prisma.match.findMany({
      where: { tournamentId },
      include: matchInclude,
      orderBy: [{ round: "asc" }, { groupName: "asc" }, { createdAt: "asc" }],
    }),
    prisma.leagueStanding.findMany({
      where: { tournamentId },
      include: standingInclude,
      orderBy: [{ groupName: "asc" }, { points: "desc" }, { goalDifference: "desc" }, { goalsFor: "desc" }],
    }),
  ]);

  if (!tournament) {
    throw new Error("Tournament not found.");
  }

  return {
    tournament,
    approvedPlayers: approvedPlayers.map(serializeRegistration),
    matches: matches.map(serializeMatch),
    standings: standings.map(serializeStanding),
  };
}

export async function updateMatchResult(matchId: string, body: UpdateMatchResultBody) {
  const currentMatch = await prisma.match.findUnique({ where: { id: matchId } });

  if (!currentMatch) {
    throw new Error("Match not found.");
  }

  const data: Prisma.MatchUpdateInput = {
    status: body.status ?? MatchStatus.COMPLETED,
  };

  if (body.playerOneScore !== undefined) data.playerOneScore = body.playerOneScore;
  if (body.playerTwoScore !== undefined) data.playerTwoScore = body.playerTwoScore;
  if (body.homeScore !== undefined) data.homeScore = body.homeScore;
  if (body.awayScore !== undefined) data.awayScore = body.awayScore;
  if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (body.liveStatus !== undefined) data.liveStatus = body.liveStatus;
  if (body.livePlayerOneScore !== undefined) data.livePlayerOneScore = body.livePlayerOneScore;
  if (body.livePlayerTwoScore !== undefined) data.livePlayerTwoScore = body.livePlayerTwoScore;
  if (body.liveHomeScore !== undefined) data.liveHomeScore = body.liveHomeScore;
  if (body.liveAwayScore !== undefined) data.liveAwayScore = body.liveAwayScore;
  if (body.liveStartedAt !== undefined) data.liveStartedAt = body.liveStartedAt ? new Date(body.liveStartedAt) : null;
  if (body.liveEndedAt !== undefined) data.liveEndedAt = body.liveEndedAt ? new Date(body.liveEndedAt) : null;  if (body.livestreamUrl !== undefined) data.livestreamUrl = body.livestreamUrl?.trim() || null;
  if (body.streamMode !== undefined) data.streamMode = body.streamMode;
  if (body.playerStreamUrl !== undefined) data.playerStreamUrl = body.playerStreamUrl?.trim() || null;
  if (body.officialStreamUrl !== undefined) data.officialStreamUrl = body.officialStreamUrl?.trim() || null;
  if (body.featuredLive !== undefined) data.featuredLive = body.featuredLive;
  if (body.roomCode !== undefined) data.roomCode = body.roomCode?.trim() || null;
  if (body.roomPassword !== undefined) data.roomPassword = body.roomPassword?.trim() || null;
  if (body.spectatorNote !== undefined) data.spectatorNote = body.spectatorNote?.trim() || null;

  if (body.winnerRegistrationId !== undefined) {
    data.winnerRegistration = body.winnerRegistrationId ? { connect: { id: body.winnerRegistrationId } } : { disconnect: true };
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data,
    include: matchInclude,
  });

  await refreshAggregateWinner(updated);

  if (updated.status === MatchStatus.COMPLETED && !updated.legNumber) {
    await applyLeagueStandingUpdate(updated);
  }

  if (updated.status === MatchStatus.COMPLETED && updated.legNumber && updated.groupName) {
    await applyLeagueStandingUpdate(updated);
  }

  if (updated.status === MatchStatus.COMPLETED) {
    await recalculateGlobalRankings();
  }

  return getCompetitionData(updated.tournamentId);
}

export type UpdateMatchResultBody = {
  playerOneScore?: number;
  playerTwoScore?: number;
  homeScore?: number;
  awayScore?: number;
  winnerRegistrationId?: string | null;
  status?: MatchStatus;
  scheduledAt?: string | null;
  liveStatus?: MatchLiveStatus;
  livePlayerOneScore?: number;
  livePlayerTwoScore?: number;
  liveHomeScore?: number;
  liveAwayScore?: number;
  liveStartedAt?: string | null;
  liveEndedAt?: string | null;  livestreamUrl?: string | null;
  streamMode?: MatchStreamMode;
  playerStreamUrl?: string | null;
  officialStreamUrl?: string | null;
  featuredLive?: boolean;
  roomCode?: string | null;
  roomPassword?: string | null;
  spectatorNote?: string | null;
};

async function createTwoLegPair(tournamentId: string, round: number, groupName: string | null, playerAId: string, playerBId: string) {
  const legOne = await prisma.match.create({
    data: {
      tournamentId,
      round,
      groupName,
      playerOneRegistrationId: playerAId,
      playerTwoRegistrationId: playerBId,
      homeRegistrationId: playerAId,
      awayRegistrationId: playerBId,
      legNumber: 1,
    },
  });

  await prisma.match.create({
    data: {
      tournamentId,
      round,
      groupName,
      playerOneRegistrationId: playerAId,
      playerTwoRegistrationId: playerBId,
      homeRegistrationId: playerBId,
      awayRegistrationId: playerAId,
      legNumber: 2,
      aggregateMatchId: legOne.id,
    },
  });
}

async function createRoundRobinFixtures(tournamentId: string, registrations: ApprovedRegistration[], groupName: string | null, useHomeAndAway: boolean) {
  let round = 1;

  for (let i = 0; i < registrations.length; i += 1) {
    for (let j = i + 1; j < registrations.length; j += 1) {
      const playerA = registrations[i];
      const playerB = registrations[j];

      if (useHomeAndAway) {
        await createTwoLegPair(tournamentId, round, groupName, playerA.id, playerB.id);
      } else {
        await prisma.match.create({
          data: {
            tournamentId,
            round,
            groupName,
            playerOneRegistrationId: playerA.id,
            playerTwoRegistrationId: playerB.id,
            homeRegistrationId: playerA.id,
            awayRegistrationId: playerB.id,
          },
        });
      }

      round += 1;
    }
  }
}

async function createStandings(tournamentId: string, registrations: ApprovedRegistration[], groupName: string | null) {
  await prisma.leagueStanding.createMany({
    data: registrations.map((registration) => ({
      tournamentId,
      registrationId: registration.id,
      groupName,
    })),
    skipDuplicates: true,
  });
}

function createGroups(registrations: ApprovedRegistration[]) {
  const groupCount = Math.max(1, Math.ceil(registrations.length / 4));
  const groups = new Map<string, ApprovedRegistration[]>();

  registrations.forEach((registration, index) => {
    const groupName = `Group ${String.fromCharCode(65 + (index % groupCount))}`;
    const group = groups.get(groupName) ?? [];
    group.push(registration);
    groups.set(groupName, group);
  });

  return groups;
}

async function refreshAggregateWinner(match: MatchWithPlayers) {
  if (!match.legNumber) return;

  const tournament = await prisma.tournament.findUnique({ where: { id: match.tournamentId } });
  if (!tournament || tournament.competitionFormat !== CompetitionFormat.OPEN_KNOCKOUT) return;

  const aggregateKey = match.aggregateMatchId ?? match.id;
  const legs = await prisma.match.findMany({
    where: { OR: [{ id: aggregateKey }, { aggregateMatchId: aggregateKey }] },
  });

  if (legs.length < 2 || legs.some((leg) => leg.status !== MatchStatus.COMPLETED || leg.homeScore === null || leg.awayScore === null)) {
    return;
  }

  const firstLeg = legs.find((leg) => leg.legNumber === 1) ?? legs[0];
  const playerAId = firstLeg.playerOneRegistrationId;
  const playerBId = firstLeg.playerTwoRegistrationId;

  if (!playerAId || !playerBId) return;

  let playerAGoals = 0;
  let playerBGoals = 0;

  legs.forEach((leg) => {
    if (leg.homeRegistrationId === playerAId) playerAGoals += leg.homeScore ?? 0;
    if (leg.awayRegistrationId === playerAId) playerAGoals += leg.awayScore ?? 0;
    if (leg.homeRegistrationId === playerBId) playerBGoals += leg.homeScore ?? 0;
    if (leg.awayRegistrationId === playerBId) playerBGoals += leg.awayScore ?? 0;
  });

  const manualWinner = legs.find((leg) => leg.winnerRegistrationId)?.winnerRegistrationId;
  const winnerId = playerAGoals > playerBGoals ? playerAId : playerBGoals > playerAGoals ? playerBId : manualWinner;
  const status = winnerId ? MatchStatus.COMPLETED : MatchStatus.DISPUTED;

  await prisma.match.updateMany({
    where: { OR: [{ id: aggregateKey }, { aggregateMatchId: aggregateKey }] },
    data: {
      aggregateWinnerRegistrationId: winnerId ?? null,
      status,
    },
  });
}

async function applyLeagueStandingUpdate(match: MatchWithPlayers) {
  if (match.homeRegistrationId === null || match.awayRegistrationId === null || match.homeScore === null || match.awayScore === null) {
    return;
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: match.tournamentId } });

  if (!tournament || tournament.competitionFormat === CompetitionFormat.OPEN_KNOCKOUT) {
    return;
  }

  await recalculateStandings(match.tournamentId, match.groupName);
}

async function recalculateStandings(tournamentId: string, groupName: string | null) {
  const standings = await prisma.leagueStanding.findMany({ where: { tournamentId, groupName } });
  const totals = new Map<string, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }>();

  standings.forEach((standing) => {
    totals.set(standing.registrationId, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
  });

  const matches = await prisma.match.findMany({
    where: { tournamentId, groupName, status: MatchStatus.COMPLETED },
  });

  matches.forEach((match) => {
    if (!match.homeRegistrationId || !match.awayRegistrationId || match.homeScore === null || match.awayScore === null) return;
    const home = totals.get(match.homeRegistrationId);
    const away = totals.get(match.awayRegistrationId);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.awayScore > match.homeScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  for (const standing of standings) {
    const total = totals.get(standing.registrationId);
    if (!total) continue;

    await prisma.leagueStanding.update({
      where: { id: standing.id },
      data: {
        ...total,
        goalDifference: total.goalsFor - total.goalsAgainst,
      },
    });
  }
}

export function serializeMatch(match: MatchWithPlayers) {
  return {
    id: match.id,
    tournamentId: match.tournamentId,
    round: match.round,
    groupName: match.groupName,
    playerOneRegistrationId: match.playerOneRegistrationId,
    playerTwoRegistrationId: match.playerTwoRegistrationId,
    playerOneName: getRegistrationDisplayName(match.playerOneRegistration),
    playerTwoName: getRegistrationDisplayName(match.playerTwoRegistration),
    playerOneScore: match.playerOneScore,
    playerTwoScore: match.playerTwoScore,
    winnerRegistrationId: match.winnerRegistrationId,
    winnerName: getRegistrationDisplayName(match.winnerRegistration, null),
    status: match.status,
    liveStatus: match.liveStatus,
    refereeId: match.refereeId,
    refereeName: match.referee?.fullName ?? null,
    refereeEmail: match.referee?.email ?? null,
    livePlayerOneScore: match.livePlayerOneScore,
    livePlayerTwoScore: match.livePlayerTwoScore,
    liveHomeScore: match.liveHomeScore,
    liveAwayScore: match.liveAwayScore,
    liveStartedAt: match.liveStartedAt?.toISOString() ?? null,
    liveEndedAt: match.liveEndedAt?.toISOString() ?? null,
    scheduledAt: match.scheduledAt?.toISOString() ?? null,
    livestreamUrl: match.livestreamUrl,
    streamMode: match.streamMode,
    playerStreamUrl: match.playerStreamUrl,
    officialStreamUrl: match.officialStreamUrl,
    featuredLive: match.featuredLive,
    roomCode: match.roomCode,
    roomPassword: match.roomPassword,
    spectatorNote: match.spectatorNote,
    legNumber: match.legNumber,
    homeRegistrationId: match.homeRegistrationId,
    awayRegistrationId: match.awayRegistrationId,
    homeName: getRegistrationDisplayName(match.homeRegistration),
    awayName: getRegistrationDisplayName(match.awayRegistration),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    aggregateMatchId: match.aggregateMatchId,
    aggregateWinnerRegistrationId: match.aggregateWinnerRegistrationId,
    aggregateWinnerName: getRegistrationDisplayName(match.aggregateWinnerRegistration, null),
    submissions: match.resultSubmissions.map((submission) => ({
      id: submission.id,
      matchId: submission.matchId,
      registrationId: submission.registrationId,
      playerName: getRegistrationDisplayName(submission.registration),
      submittedScore: submission.submittedScore,
      screenshotUrl: submission.screenshotUrl,
      note: submission.note,
      status: submission.status,
      adminNote: submission.adminNote,
      opponentConfirmed: submission.opponentConfirmed,
      opponentDisputed: submission.opponentDisputed,
      opponentNote: submission.opponentNote,
      autoApproved: submission.autoApproved,
      createdAt: submission.createdAt.toISOString(),
    })),
    lineups: match.teamLineups.map((lineup) => serializeLineup(lineup)),
  };
}

export function serializeStanding(standing: StandingWithPlayer) {
  return {
    id: standing.id,
    tournamentId: standing.tournamentId,
    registrationId: standing.registrationId,
    playerName: getRegistrationDisplayName(standing.registration),
    groupName: standing.groupName,
    played: standing.played,
    won: standing.won,
    drawn: standing.drawn,
    lost: standing.lost,
    goalsFor: standing.goalsFor,
    goalsAgainst: standing.goalsAgainst,
    goalDifference: standing.goalDifference,
    points: standing.points,
  };
}

function serializeRegistration(registration: ApprovedRegistration) {
  return {
    id: registration.id,
    fullName: registration.user.fullName,
    displayName: getRegistrationDisplayName(registration),
    teamName: registration.team?.name ?? null,
    teamTag: registration.team?.tag ?? null,
    email: registration.user.email,
    gamerTag: registration.user.gamerTag ?? "",
    approvalStatus: registration.approvalStatus,
    paymentStatus: registration.paymentStatus,
  };
}

function getRegistrationDisplayName(registration: { user: { fullName: string }; team?: { name: string; tag: string } | null } | null, fallback: string | null = "TBD") {
  if (!registration) return fallback;
  return registration.team ? `[${registration.team.tag}] ${registration.team.name}` : registration.user.fullName;
}

function serializeLineup(lineup: MatchWithPlayers["teamLineups"][number]) {
  const memberUserIds = Array.isArray(lineup.memberUserIds) ? lineup.memberUserIds.filter((value): value is string => typeof value === "string") : [];
  const teamMembers = lineup.team.members.map((member) => ({
    userId: member.userId,
    fullName: member.user.fullName,
    gamerTag: member.user.gamerTag,
    platformId: member.user.platformId,
  }));
  const selectedMembers = memberUserIds.flatMap((userId) => {
    const member = teamMembers.find((item) => item.userId === userId);
    return member ? [member] : [];
  });
  const representative = teamMembers.find((member) => member.userId === lineup.representativeUserId) ?? null;

  return {
    id: lineup.id,
    matchId: lineup.matchId,
    registrationId: lineup.registrationId,
    teamId: lineup.teamId,
    teamName: lineup.team.name,
    teamTag: lineup.team.tag,
    memberUserIds,
    members: selectedMembers,
    representativeUserId: lineup.representativeUserId,
    representativeName: representative?.gamerTag || representative?.fullName || "Selected representative",
    submittedByUserId: lineup.submittedByUserId,
    updatedAt: lineup.updatedAt.toISOString(),
  };
}

