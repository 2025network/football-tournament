import { NextResponse } from "next/server";
import { ensureDefaultAchievements } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureDefaultAchievements();

    const [achievements, awarded] = await Promise.all([
      prisma.achievement.findMany({
        include: { _count: { select: { players: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.playerAchievement.findMany({
        include: { achievement: true, user: true },
        orderBy: { unlockedAt: "desc" },
        take: 200,
      }),
    ]);

    return NextResponse.json({
      achievements: achievements.map((achievement) => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        awardedCount: achievement._count.players,
      })),
      awarded: awarded.map((item) => ({
        id: item.id,
        playerName: item.user.gamerTag || item.user.fullName,
        playerEmail: item.user.email,
        platformId: item.user.platformId,
        achievementName: item.achievement.name,
        achievementIcon: item.achievement.icon,
        unlockedAt: item.unlockedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to load admin achievements", error);
    return NextResponse.json({ message: "Failed to load achievements." }, { status: 500 });
  }
}
