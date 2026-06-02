import { NextRequest, NextResponse } from "next/server";
import { GameTitle, MatchStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { serializePayment } from "@/lib/payments";

const gameToDisplay: Record<GameTitle, string> = {
  EFOOTBALL_MOBILE: "eFootball Mobile",
  PUBG_MOBILE: "PUBG Mobile",
  COD_MOBILE: "COD Mobile",
  FREE_FIRE: "Free Fire",
};

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Player email is required." }, { status: 400 });
    }

    const player = await prisma.user.findUnique({
      where: { email },
      include: {
        achievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" } },
        registrations: {
          include: { tournament: true, payments: { include: { registration: { include: { user: true, tournament: true } } }, orderBy: { createdAt: "desc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!player?.passwordHash) {
      return NextResponse.json({ message: "Player account not found." }, { status: 404 });
    }

    const registrationIds = player.registrations.map((registration) => registration.id);
    const recentMatches = registrationIds.length === 0 ? [] : await prisma.match.findMany({
      where: {
        status: MatchStatus.COMPLETED,
        OR: [
          { playerOneRegistrationId: { in: registrationIds } },
          { playerTwoRegistrationId: { in: registrationIds } },
          { homeRegistrationId: { in: registrationIds } },
          { awayRegistrationId: { in: registrationIds } },
        ],
      },
      include: {
        tournament: true,
        homeRegistration: { include: { user: true } },
        awayRegistration: { include: { user: true } },
        playerOneRegistration: { include: { user: true } },
        playerTwoRegistration: { include: { user: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      player: {
        id: player.id,
        fullName: player.fullName,
        email: player.email,
        phone: player.phoneNumber ?? "",
        currentRank: player.currentRank,
        totalPoints: player.totalPoints,
        totalWins: player.totalWins,
        totalLosses: player.totalLosses,
        totalDraws: player.totalDraws,
        tournamentsPlayed: player.tournamentsPlayed,
        tournamentsWon: player.tournamentsWon,
        favoriteGame: player.favoriteGame ? gameToDisplay[player.favoriteGame] : "Not set",
      },
      achievements: player.achievements.map((item) => ({
        id: item.id,
        name: item.achievement.name,
        description: item.achievement.description,
        icon: item.achievement.icon,
        unlockedAt: item.unlockedAt.toISOString(),
      })),
      recentMatches: recentMatches.map((match) => ({
        id: match.id,
        tournamentTitle: match.tournament.title,
        round: match.round,
        groupName: match.groupName,
        score: `${match.homeRegistration?.user.gamerTag || match.homeRegistration?.user.fullName || match.playerOneRegistration?.user.fullName || "Player"} ${match.homeScore ?? match.playerOneScore ?? 0} - ${match.awayScore ?? match.playerTwoScore ?? 0} ${match.awayRegistration?.user.gamerTag || match.awayRegistration?.user.fullName || match.playerTwoRegistration?.user.fullName || "Player"}`,
      })),
      registrations: player.registrations.map((registration) => ({
        id: registration.id,
        tournamentId: registration.tournament.id,
        tournamentTitle: registration.tournament.title,
        game: gameToDisplay[registration.tournament.game],
        startDate: registration.tournament.startDate.toISOString(),
        paymentStatus: registration.paymentStatus,
        approvalStatus: registration.approvalStatus,
        registeredAt: registration.createdAt.toISOString(),
        entryFee: registration.tournament.entryFee,
        latestPayment: registration.payments[0] ? serializePayment(registration.payments[0]) : null,
      })),
    });
  } catch (error) {
    console.error("Failed to load player dashboard", error);
    return NextResponse.json({ message: "Failed to load player dashboard." }, { status: 500 });
  }
}