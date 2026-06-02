import { NextResponse } from "next/server";
import { MatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [totalMatchesPlayed, topPlayer, prizeAggregate, activeTournaments] = await Promise.all([
      prisma.match.count({ where: { status: MatchStatus.COMPLETED } }),
      prisma.user.findFirst({ where: { role: "PLAYER" }, orderBy: [{ totalPoints: "desc" }, { totalWins: "desc" }] }),
      prisma.tournament.aggregate({ _sum: { prizePool: true } }),
      prisma.tournament.count({ where: { registrationOpen: true } }),
    ]);

    return NextResponse.json({
      totalMatchesPlayed,
      topRankedPlayer: topPlayer ? { id: topPlayer.id, name: topPlayer.gamerTag || topPlayer.fullName, points: topPlayer.totalPoints } : null,
      totalPrizePools: prizeAggregate._sum.prizePool ?? 0,
      activeTournaments,
    });
  } catch (error) {
    console.error("Failed to load admin stats", error);
    return NextResponse.json({ message: "Failed to load admin stats." }, { status: 500 });
  }
}