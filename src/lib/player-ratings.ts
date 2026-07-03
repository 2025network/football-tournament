import { MatchStatus } from "@/generated/prisma/client";
import { awardAchievementsForRatingUpdate } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";

const WINNER_GAIN = 25;
const LOSER_LOSS = 15;

export async function applyPenaltyRatingsForMatch(matchId: string) {
  const [match, activeSeason] = await Promise.all([
    prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeRegistration: { include: { user: true } },
        awayRegistration: { include: { user: true } },
        playerOneRegistration: { include: { user: true } },
        playerTwoRegistration: { include: { user: true } },
        winnerRegistration: { include: { user: true } },
      },
    }),
    prisma.season.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  if (!match || !activeSeason || match.status !== MatchStatus.COMPLETED || match.penaltyRatingApplied || !match.winnerRegistrationId) {
    return null;
  }

  const homeRegistration = match.homeRegistration ?? match.playerOneRegistration;
  const awayRegistration = match.awayRegistration ?? match.playerTwoRegistration;
  if (!homeRegistration || !awayRegistration) return null;

  const winnerRegistration = match.winnerRegistrationId === homeRegistration.id ? homeRegistration : match.winnerRegistrationId === awayRegistration.id ? awayRegistration : null;
  const loserRegistration = winnerRegistration?.id === homeRegistration.id ? awayRegistration : winnerRegistration?.id === awayRegistration.id ? homeRegistration : null;
  if (!winnerRegistration || !loserRegistration) return null;

  const homeScore = match.homeScore ?? match.playerOneScore ?? 0;
  const awayScore = match.awayScore ?? match.playerTwoScore ?? 0;
  const winnerGoals = winnerRegistration.id === homeRegistration.id ? homeScore : awayScore;
  const loserGoals = loserRegistration.id === homeRegistration.id ? homeScore : awayScore;

  const [winnerRating, loserRating] = await prisma.$transaction(async (tx) => {
    const currentWinner = await tx.playerRating.upsert({
      where: { userId_seasonId: { userId: winnerRegistration.userId, seasonId: activeSeason.id } },
      update: {},
      create: { userId: winnerRegistration.userId, seasonId: activeSeason.id },
    });
    await tx.playerRating.upsert({
      where: { userId_seasonId: { userId: loserRegistration.userId, seasonId: activeSeason.id } },
      update: {},
      create: { userId: loserRegistration.userId, seasonId: activeSeason.id },
    });

    const nextWinnerRating = currentWinner.currentRating + WINNER_GAIN;

    const updatedWinner = await tx.playerRating.update({
      where: { userId_seasonId: { userId: winnerRegistration.userId, seasonId: activeSeason.id } },
      data: {
        matchesPlayed: { increment: 1 },
        wins: { increment: 1 },
        goalsScored: { increment: winnerGoals },
        goalsConceded: { increment: loserGoals },
        currentRating: { increment: WINNER_GAIN },
        highestRating: Math.max(currentWinner.highestRating, nextWinnerRating),
      },
    });

    const updatedLoser = await tx.playerRating.update({
      where: { userId_seasonId: { userId: loserRegistration.userId, seasonId: activeSeason.id } },
      data: {
        matchesPlayed: { increment: 1 },
        losses: { increment: 1 },
        goalsScored: { increment: loserGoals },
        goalsConceded: { increment: winnerGoals },
        currentRating: { decrement: LOSER_LOSS },
      },
    });

    await tx.match.update({ where: { id: matchId }, data: { penaltyRatingApplied: true } });
    return [updatedWinner, updatedLoser];
  });

  await Promise.all([
    awardAchievementsForRatingUpdate(winnerRegistration.userId, activeSeason.id),
    awardAchievementsForRatingUpdate(loserRegistration.userId, activeSeason.id),
  ]);

  return { winnerRating, loserRating };
}
