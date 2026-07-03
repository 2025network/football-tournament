import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const defaultAchievements = [
  { name: "First Match Played", description: "Complete your first rated penalty match.", icon: "PLAY" },
  { name: "First Win", description: "Win your first rated penalty match.", icon: "WIN" },
  { name: "3 Wins", description: "Win 3 rated penalty matches.", icon: "3W" },
  { name: "5 Wins", description: "Win 5 rated penalty matches.", icon: "5W" },
  { name: "10 Wins", description: "Win 10 rated penalty matches.", icon: "10W" },
  { name: "Top 10 Player", description: "Reach the top 10 on a season leaderboard.", icon: "TOP10" },
  { name: "Season Champion", description: "Hold the number 1 position in a season leaderboard.", icon: "CHAMP" },
  { name: "Penalty King", description: "Score at least 15 goals in rated penalty matches.", icon: "KING" },
] as const;

type AchievementTx = Pick<PrismaClient, "achievement" | "playerAchievement" | "playerRating">;

export async function ensureDefaultAchievements(client: AchievementTx = prisma) {
  await Promise.all(
    defaultAchievements.map((achievement) =>
      client.achievement.upsert({
        where: { name: achievement.name },
        update: { description: achievement.description, icon: achievement.icon },
        create: achievement,
      }),
    ),
  );
}

export async function awardAchievementsForRatingUpdate(userId: string, seasonId: string, client: AchievementTx = prisma) {
  await ensureDefaultAchievements(client);

  const rating = await client.playerRating.findUnique({
    where: { userId_seasonId: { userId, seasonId } },
  });

  if (!rating) return;

  const seasonRanks = await client.playerRating.findMany({
    where: { seasonId },
    orderBy: [{ currentRating: "desc" }, { wins: "desc" }, { losses: "asc" }],
    select: { userId: true },
    take: 10,
  });
  const rank = seasonRanks.findIndex((entry) => entry.userId === userId) + 1;

  const unlockedNames = [
    rating.matchesPlayed >= 1 ? "First Match Played" : null,
    rating.wins >= 1 ? "First Win" : null,
    rating.wins >= 3 ? "3 Wins" : null,
    rating.wins >= 5 ? "5 Wins" : null,
    rating.wins >= 10 ? "10 Wins" : null,
    rank > 0 && rank <= 10 ? "Top 10 Player" : null,
    rank === 1 && rating.matchesPlayed > 0 ? "Season Champion" : null,
    rating.goalsScored >= 15 ? "Penalty King" : null,
  ].filter((name): name is string => Boolean(name));

  if (unlockedNames.length === 0) return;

  const achievements = await client.achievement.findMany({ where: { name: { in: unlockedNames } } });
  await Promise.all(
    achievements.map((achievement) =>
      client.playerAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
        update: {},
        create: { userId, achievementId: achievement.id },
      }),
    ),
  );
}
