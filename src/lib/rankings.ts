import { CompetitionFormat, GameTitle, MatchStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const WIN_POINTS = 3;
const DRAW_POINTS = 1;
const TOURNAMENT_WINNER_BONUS = 10;
const GROUP_STAGE_WINNER_BONUS = 15;

type PlayerStats = {
  points: number;
  wins: number;
  losses: number;
  draws: number;
  tournamentIds: Set<string>;
  tournamentWins: number;
  gameCounts: Map<GameTitle, number>;
  undefeatedTournamentIds: Set<string>;
};

const defaultAchievements = [
  { name: "First Win", description: "Win your first completed match.", icon: "1W" },
  { name: "10 Wins", description: "Win 10 completed matches.", icon: "10W" },
  { name: "League Champion", description: "Finish as champion in a league tournament.", icon: "LC" },
  { name: "Group Stage Winner", description: "Win a Group Stage format tournament.", icon: "GS" },
  { name: "Undefeated Season", description: "Complete a tournament without losing a match.", icon: "US" },
];

export async function recalculateGlobalRankings() {
  await seedAchievements();

  const [users, registrations, matches, activeSeason] = await Promise.all([
    prisma.user.findMany({ where: { role: "PLAYER" }, select: { id: true } }),
    prisma.registration.findMany({ include: { tournament: true } }),
    prisma.match.findMany({ where: { status: MatchStatus.COMPLETED }, include: { tournament: true } }),
    prisma.leaderboardSeason.findFirst({ where: { active: true }, orderBy: { startDate: "desc" } }),
  ]);

  const stats = new Map<string, PlayerStats>();
  const registrationToUser = new Map<string, string>();

  for (const user of users) {
    stats.set(user.id, emptyStats());
  }

  for (const registration of registrations) {
    registrationToUser.set(registration.id, registration.userId);
    const userStats = getStats(stats, registration.userId);
    userStats.tournamentIds.add(registration.tournamentId);
    userStats.gameCounts.set(registration.tournament.game, (userStats.gameCounts.get(registration.tournament.game) ?? 0) + 1);
  }

  for (const match of matches) {
    const homeId = match.homeRegistrationId ?? match.playerOneRegistrationId;
    const awayId = match.awayRegistrationId ?? match.playerTwoRegistrationId;
    const homeScore = match.homeScore ?? match.playerOneScore;
    const awayScore = match.awayScore ?? match.playerTwoScore;

    if (!homeId || !awayId || homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
      continue;
    }

    const homeUserId = registrationToUser.get(homeId);
    const awayUserId = registrationToUser.get(awayId);

    if (!homeUserId || !awayUserId) continue;

    applyMatchStats(getStats(stats, homeUserId), getStats(stats, awayUserId), homeScore, awayScore);
  }

  const tournamentWinners = getTournamentWinners(matches, registrationToUser);

  for (const winner of tournamentWinners) {
    const userStats = getStats(stats, winner.userId);
    userStats.tournamentWins += 1;
    userStats.points += winner.competitionFormat === CompetitionFormat.CHAMPIONS_LEAGUE ? GROUP_STAGE_WINNER_BONUS : TOURNAMENT_WINNER_BONUS;
  }

  const undefeatedMap = getUndefeatedTournamentPlayers(matches, registrations, registrationToUser);
  for (const [userId, tournamentIds] of undefeatedMap.entries()) {
    const userStats = getStats(stats, userId);
    tournamentIds.forEach((id) => userStats.undefeatedTournamentIds.add(id));
  }

  const rankedUsers = Array.from(stats.entries()).sort(([, a], [, b]) => b.points - a.points || b.wins - a.wins || a.losses - b.losses);

  for (let index = 0; index < rankedUsers.length; index += 1) {
    const [userId, userStats] = rankedUsers[index];
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: userStats.points,
        totalWins: userStats.wins,
        totalLosses: userStats.losses,
        totalDraws: userStats.draws,
        tournamentsPlayed: userStats.tournamentIds.size,
        tournamentsWon: userStats.tournamentWins,
        currentRank: index + 1,
        favoriteGame: getFavoriteGame(userStats.gameCounts),
      },
    });

    await prisma.rankingHistory.create({
      data: {
        userId,
        seasonId: activeSeason?.id,
        points: userStats.points,
        wins: userStats.wins,
        losses: userStats.losses,
        draws: userStats.draws,
      },
    });

    await unlockAchievements(userId, userStats, tournamentWinners);
  }
}

export async function seedAchievements() {
  for (const achievement of defaultAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: achievement,
      create: achievement,
    });
  }
}

function emptyStats(): PlayerStats {
  return { points: 0, wins: 0, losses: 0, draws: 0, tournamentIds: new Set(), tournamentWins: 0, gameCounts: new Map(), undefeatedTournamentIds: new Set() };
}

function getStats(stats: Map<string, PlayerStats>, userId: string) {
  const existing = stats.get(userId);
  if (existing) return existing;
  const created = emptyStats();
  stats.set(userId, created);
  return created;
}

function applyMatchStats(home: PlayerStats, away: PlayerStats, homeScore: number, awayScore: number) {
  if (homeScore > awayScore) {
    home.wins += 1;
    home.points += WIN_POINTS;
    away.losses += 1;
    return;
  }

  if (awayScore > homeScore) {
    away.wins += 1;
    away.points += WIN_POINTS;
    home.losses += 1;
    return;
  }

  home.draws += 1;
  away.draws += 1;
  home.points += DRAW_POINTS;
  away.points += DRAW_POINTS;
}

type CompletedMatch = Prisma.MatchGetPayload<{ include: { tournament: true } }>;

function getTournamentWinners(matches: CompletedMatch[], registrationToUser: Map<string, string>) {
  const byTournament = new Map<string, CompletedMatch[]>();

  for (const match of matches) {
    const list = byTournament.get(match.tournamentId) ?? [];
    list.push(match);
    byTournament.set(match.tournamentId, list);
  }

  const winners: { userId: string; tournamentId: string; competitionFormat: CompetitionFormat }[] = [];

  for (const [tournamentId, tournamentMatches] of byTournament.entries()) {
    const tournament = tournamentMatches[0]?.tournament;
    if (!tournament) continue;

    let winnerRegistrationId: string | null | undefined;

    if (tournament.competitionFormat === CompetitionFormat.OPEN_KNOCKOUT) {
      const finalMatch = [...tournamentMatches].sort((a, b) => b.round - a.round)[0];
      winnerRegistrationId = finalMatch.aggregateWinnerRegistrationId ?? finalMatch.winnerRegistrationId ?? inferWinnerRegistration(finalMatch);
    } else {
      const table = new Map<string, { points: number; wins: number; losses: number }>();
      for (const match of tournamentMatches) {
        const homeId = match.homeRegistrationId ?? match.playerOneRegistrationId;
        const awayId = match.awayRegistrationId ?? match.playerTwoRegistrationId;
        const homeScore = match.homeScore ?? match.playerOneScore;
        const awayScore = match.awayScore ?? match.playerTwoScore;
        if (!homeId || !awayId || homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) continue;
        const home = table.get(homeId) ?? { points: 0, wins: 0, losses: 0 };
        const away = table.get(awayId) ?? { points: 0, wins: 0, losses: 0 };
        if (homeScore > awayScore) { home.points += 3; home.wins += 1; away.losses += 1; }
        else if (awayScore > homeScore) { away.points += 3; away.wins += 1; home.losses += 1; }
        else { home.points += 1; away.points += 1; }
        table.set(homeId, home);
        table.set(awayId, away);
      }
      winnerRegistrationId = [...table.entries()].sort(([, a], [, b]) => b.points - a.points || b.wins - a.wins || a.losses - b.losses)[0]?.[0];
    }

    const userId = winnerRegistrationId ? registrationToUser.get(winnerRegistrationId) : null;
    if (userId) winners.push({ userId, tournamentId, competitionFormat: tournament.competitionFormat });
  }

  return winners;
}

function inferWinnerRegistration(match: CompletedMatch) {
  const homeId = match.homeRegistrationId ?? match.playerOneRegistrationId;
  const awayId = match.awayRegistrationId ?? match.playerTwoRegistrationId;
  const homeScore = match.homeScore ?? match.playerOneScore;
  const awayScore = match.awayScore ?? match.playerTwoScore;
  if (!homeId || !awayId || homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined || homeScore === awayScore) return null;
  return homeScore > awayScore ? homeId : awayId;
}

function getUndefeatedTournamentPlayers(matches: CompletedMatch[], registrations: Prisma.RegistrationGetPayload<{ include: { tournament: true } }>[], registrationToUser: Map<string, string>) {
  const lossesByTournamentUser = new Set<string>();
  const playedByTournamentUser = new Map<string, Set<string>>();

  for (const match of matches) {
    const homeId = match.homeRegistrationId ?? match.playerOneRegistrationId;
    const awayId = match.awayRegistrationId ?? match.playerTwoRegistrationId;
    const homeScore = match.homeScore ?? match.playerOneScore;
    const awayScore = match.awayScore ?? match.playerTwoScore;
    if (!homeId || !awayId || homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) continue;
    const homeUserId = registrationToUser.get(homeId);
    const awayUserId = registrationToUser.get(awayId);
    if (!homeUserId || !awayUserId) continue;
    const played = playedByTournamentUser.get(match.tournamentId) ?? new Set<string>();
    played.add(homeUserId);
    played.add(awayUserId);
    playedByTournamentUser.set(match.tournamentId, played);
    if (homeScore > awayScore) lossesByTournamentUser.add(`${match.tournamentId}:${awayUserId}`);
    if (awayScore > homeScore) lossesByTournamentUser.add(`${match.tournamentId}:${homeUserId}`);
  }

  const result = new Map<string, Set<string>>();
  for (const registration of registrations) {
    const played = playedByTournamentUser.get(registration.tournamentId);
    if (!played?.has(registration.userId)) continue;
    if (lossesByTournamentUser.has(`${registration.tournamentId}:${registration.userId}`)) continue;
    const tournaments = result.get(registration.userId) ?? new Set<string>();
    tournaments.add(registration.tournamentId);
    result.set(registration.userId, tournaments);
  }
  return result;
}

function getFavoriteGame(gameCounts: Map<GameTitle, number>) {
  return [...gameCounts.entries()].sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
}

async function unlockAchievements(userId: string, stats: PlayerStats, tournamentWinners: { userId: string; competitionFormat: CompetitionFormat }[]) {
  const names = new Set<string>();
  if (stats.wins >= 1) names.add("First Win");
  if (stats.wins >= 10) names.add("10 Wins");
  if (tournamentWinners.some((winner) => winner.userId === userId && winner.competitionFormat === CompetitionFormat.LEAGUE)) names.add("League Champion");
  if (tournamentWinners.some((winner) => winner.userId === userId && winner.competitionFormat === CompetitionFormat.CHAMPIONS_LEAGUE)) names.add("Group Stage Winner");
  if (stats.undefeatedTournamentIds.size > 0) names.add("Undefeated Season");

  for (const name of names) {
    const achievement = await prisma.achievement.findUnique({ where: { name } });
    if (!achievement) continue;
    await prisma.playerAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      update: {},
      create: { userId, achievementId: achievement.id },
    });
  }
}
