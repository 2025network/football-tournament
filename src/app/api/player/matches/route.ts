import { NextRequest, NextResponse } from "next/server";
import { matchInclude, serializeMatch } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Player email is required." }, { status: 400 });
    }

    const player = await prisma.user.findUnique({
      where: { email },
      include: { registrations: true },
    });

    if (!player) {
      return NextResponse.json({ message: "Player account not found." }, { status: 404 });
    }

    const registrationIds = player.registrations.map((registration) => registration.id);

    const matches = registrationIds.length === 0
      ? []
      : await prisma.match.findMany({
          where: {
            OR: [
              { playerOneRegistrationId: { in: registrationIds } },
              { playerTwoRegistrationId: { in: registrationIds } },
              { homeRegistrationId: { in: registrationIds } },
              { awayRegistrationId: { in: registrationIds } },
            ],
          },
          include: {
            ...matchInclude,
            tournament: true,
          },
          orderBy: [{ tournament: { startDate: "asc" } }, { round: "asc" }, { createdAt: "asc" }],
        });

    return NextResponse.json({
      player: {
        id: player.id,
        fullName: player.fullName,
        email: player.email,
        phone: player.phoneNumber ?? "",
      },
      matches: matches.map((match) => ({
        ...serializeMatch(match),
        tournamentTitle: match.tournament.title,
        tournamentId: match.tournament.id,
        scheduledAt: match.scheduledAt?.toISOString() ?? null,
        currentPlayerRegistrationId: registrationIds.find((id) => [match.playerOneRegistrationId, match.playerTwoRegistrationId, match.homeRegistrationId, match.awayRegistrationId].includes(id)) ?? null,
        side: registrationIds.includes(match.homeRegistrationId ?? "") ? "HOME" : registrationIds.includes(match.awayRegistrationId ?? "") ? "AWAY" : "PLAYER",
      })),
    });
  } catch (error) {
    console.error("Failed to fetch player matches", error);
    return NextResponse.json({ message: "Failed to fetch player matches." }, { status: 500 });
  }
}
