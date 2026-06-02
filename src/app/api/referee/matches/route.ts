import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Referee email is required." }, { status: 400 });
    }

    const referee = await prisma.user.findUnique({ where: { email } });

    if (!referee) {
      return NextResponse.json({ message: "Referee account not found." }, { status: 404 });
    }

    const matches = await prisma.match.findMany({
      where: { refereeId: referee.id },
      include: {
        tournament: true,
        homeRegistration: { include: { user: true, team: true } },
        awayRegistration: { include: { user: true, team: true } },
        playerOneRegistration: { include: { user: true, team: true } },
        playerTwoRegistration: { include: { user: true, team: true } },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      referee: { id: referee.id, fullName: referee.fullName, email: referee.email },
      matches: matches.map((match) => {
        const home = match.homeRegistration ?? match.playerOneRegistration;
        const away = match.awayRegistration ?? match.playerTwoRegistration;

        return {
          id: match.id,
          tournamentId: match.tournamentId,
          tournamentTitle: match.tournament.title,
          game: match.tournament.game,
          round: match.round,
          groupName: match.groupName,
          status: match.status,
          liveStatus: match.liveStatus,
          scheduledAt: match.scheduledAt?.toISOString() ?? null,
          legNumber: match.legNumber,
          homeName: getRegistrationName(home),
          awayName: getRegistrationName(away),
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          liveHomeScore: match.liveHomeScore,
          liveAwayScore: match.liveAwayScore,
          livePlayerOneScore: match.livePlayerOneScore,
          livePlayerTwoScore: match.livePlayerTwoScore,
          liveStartedAt: match.liveStartedAt?.toISOString() ?? null,
          liveEndedAt: match.liveEndedAt?.toISOString() ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to load referee matches", error);
    return NextResponse.json({ message: "Failed to load referee matches." }, { status: 500 });
  }
}

function getRegistrationName(registration: { user: { gamerTag: string | null; fullName: string }; team?: { tag: string; name: string } | null } | null) {
  if (!registration) return "TBD";
  if (registration.team) return `[${registration.team.tag}] ${registration.team.name}`;
  return registration.user.gamerTag || registration.user.fullName;
}
