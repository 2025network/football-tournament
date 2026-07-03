import { NextRequest, NextResponse } from "next/server";
import { TeamMemberStatus } from "@/generated/prisma/client";
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
      include: {
        registrations: true,
        teamMemberships: {
          where: { status: TeamMemberStatus.ACTIVE },
          include: { team: { include: { registrations: true, members: { where: { status: TeamMemberStatus.ACTIVE }, include: { user: true } } } } },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ message: "Player account not found." }, { status: 404 });
    }

    const ownRegistrationIds = player.registrations.map((registration) => registration.id);
    const teamRegistrationIds = player.teamMemberships.flatMap((membership) => membership.team.registrations.map((registration) => registration.id));
    const registrationIds = Array.from(new Set([...ownRegistrationIds, ...teamRegistrationIds]));

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
            penaltyShootoutResults: { orderBy: { createdAt: "desc" } },
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
      matches: matches.map((match) => {
        const currentPlayerRegistrationId = registrationIds.find((id) => [match.playerOneRegistrationId, match.playerTwoRegistrationId, match.homeRegistrationId, match.awayRegistrationId].includes(id)) ?? null;
        const currentTeamMembership = player.teamMemberships.find((membership) => membership.team.registrations.some((registration) => registration.id === currentPlayerRegistrationId));
        const currentLineup = match.teamLineups.find((lineup) => lineup.registrationId === currentPlayerRegistrationId) ?? null;

        return {
          ...serializeMatch(match),
          tournamentTitle: match.tournament.title,
          tournamentId: match.tournament.id,
          scheduledAt: match.scheduledAt?.toISOString() ?? null,
          currentPlayerRegistrationId,
          canManageLineup: Boolean(currentTeamMembership && currentTeamMembership.team.captainId === player.id && match.status !== "COMPLETED"),
          currentTeamMembers: currentTeamMembership?.team.members.map((member) => ({
            userId: member.userId,
            fullName: member.user.fullName,
            gamerTag: member.user.gamerTag,
            platformId: member.user.platformId,
          })) ?? [],
          currentLineupId: currentLineup?.id ?? null,
          side: registrationIds.includes(match.homeRegistrationId ?? "") ? "HOME" : registrationIds.includes(match.awayRegistrationId ?? "") ? "AWAY" : "PLAYER",
          penaltyShootout: buildPenaltyShootoutStatus(match, registrationIds, player.id),
        };
      }),
    });
  } catch (error) {
    console.error("Failed to fetch player matches", error);
    return NextResponse.json({ message: "Failed to fetch player matches." }, { status: 500 });
  }
}
function buildPenaltyShootoutStatus(match: { status: string; homeRegistrationId: string | null; awayRegistrationId: string | null; playerOneRegistrationId: string | null; playerTwoRegistrationId: string | null; homeScore: number | null; awayScore: number | null; playerOneScore: number | null; playerTwoScore: number | null; teamLineups?: { registrationId: string; representativeUserId: string }[]; penaltyShootoutResults?: { id: string; userId: string; score: number; suddenDeathScore: number; totalShots: number; suddenDeathShotsJson: unknown; isWinner: boolean; createdAt: Date }[] }, registrationIds: string[], currentUserId: string) {
  const belongsToMatch = registrationIds.some((id) => [match.playerOneRegistrationId, match.playerTwoRegistrationId, match.homeRegistrationId, match.awayRegistrationId].includes(id));
  const currentRegistrationId = registrationIds.find((id) => [match.playerOneRegistrationId, match.playerTwoRegistrationId, match.homeRegistrationId, match.awayRegistrationId].includes(id)) ?? null;
  const currentLineup = match.teamLineups?.find((lineup) => lineup.registrationId === currentRegistrationId) ?? null;
  const representativeAllowed = !currentLineup || currentLineup.representativeUserId === currentUserId;
  const playerIsHome = registrationIds.includes(match.homeRegistrationId ?? "") || registrationIds.includes(match.playerOneRegistrationId ?? "");
  const playerScore = playerIsHome ? match.homeScore ?? match.playerOneScore : match.awayScore ?? match.playerTwoScore;
  const opponentScore = playerIsHome ? match.awayScore ?? match.playerTwoScore : match.homeScore ?? match.playerOneScore;
  const currentPlayerResult = match.penaltyShootoutResults?.find((result) => result.userId === currentUserId) ?? null;
  const hasSuddenDeath = (currentPlayerResult?.suddenDeathScore ?? 0) > 0 || (Array.isArray(currentPlayerResult?.suddenDeathShotsJson) && currentPlayerResult.suddenDeathShotsJson.length > 0);
  const normalTie = playerScore !== null && playerScore !== undefined && opponentScore !== null && opponentScore !== undefined && playerScore === opponentScore;

  let status: "NOT_PLAYED" | "PLAYED" | "WAITING_FOR_OPPONENT" | "COMPLETED" | "DISPUTED" | "SUDDEN_DEATH_REQUIRED" = "NOT_PLAYED";

  if (match.status === "COMPLETED") status = "COMPLETED";
  else if (match.status === "DISPUTED" && normalTie) status = hasSuddenDeath ? "WAITING_FOR_OPPONENT" : "SUDDEN_DEATH_REQUIRED";
  else if (match.status === "DISPUTED") status = "DISPUTED";
  else if (playerScore !== null && playerScore !== undefined && (opponentScore === null || opponentScore === undefined)) status = "WAITING_FOR_OPPONENT";
  else if (playerScore !== null && playerScore !== undefined) status = "PLAYED";
  else if (currentPlayerResult) status = "WAITING_FOR_OPPONENT";

  return {
    belongsToMatch,
    status,
    latestScore: currentPlayerResult?.score ?? playerScore ?? null,
    suddenDeathScore: currentPlayerResult?.suddenDeathScore ?? 0,
    totalShots: currentPlayerResult?.totalShots ?? 5,
    playedAt: currentPlayerResult?.createdAt.toISOString() ?? null,
    canPlay: belongsToMatch && representativeAllowed && match.status !== "COMPLETED" && (Boolean(currentPlayerResult) || playerScore === null || playerScore === undefined),
  };
}
