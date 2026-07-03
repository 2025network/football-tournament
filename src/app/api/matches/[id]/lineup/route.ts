import { NextRequest, NextResponse } from "next/server";
import { MatchStatus, TeamMemberStatus, type Prisma } from "@/generated/prisma/client";
import { getCompetitionData } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type LineupBody = {
  captainEmail?: string;
  registrationId?: string;
  memberUserIds?: string[];
  representativeUserId?: string;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as LineupBody;
    const validationError = validateBody(body);
    if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        tournament: true,
        homeRegistration: { include: lineupRegistrationInclude },
        awayRegistration: { include: lineupRegistrationInclude },
        playerOneRegistration: { include: lineupRegistrationInclude },
        playerTwoRegistration: { include: lineupRegistrationInclude },
      },
    });

    if (!match) return NextResponse.json({ message: "Match not found." }, { status: 404 });
    if (match.status === MatchStatus.COMPLETED) return NextResponse.json({ message: "Lineup cannot be changed after the match is completed." }, { status: 400 });
    if (match.tournament.registrationType !== "TEAM") return NextResponse.json({ message: "Lineups are only used for team tournaments." }, { status: 400 });

    const registration = [match.homeRegistration, match.awayRegistration, match.playerOneRegistration, match.playerTwoRegistration].find((item) => item?.id === body.registrationId);
    if (!registration?.team) return NextResponse.json({ message: "Selected match side is not a team registration." }, { status: 400 });
    if (registration.team.captain.email.toLowerCase() !== body.captainEmail!.trim().toLowerCase()) return NextResponse.json({ message: "Only the team captain can set this lineup." }, { status: 403 });

    const activeMemberIds = new Set(registration.team.members.filter((member) => member.status === TeamMemberStatus.ACTIVE).map((member) => member.userId));
    const selectedMemberIds = Array.from(new Set(body.memberUserIds!.map((userId) => userId.trim()).filter(Boolean)));
    if (selectedMemberIds.length === 0) return NextResponse.json({ message: "Select at least one active team member." }, { status: 400 });
    if (selectedMemberIds.some((userId) => !activeMemberIds.has(userId))) return NextResponse.json({ message: "Lineup can only include active members of this team." }, { status: 400 });
    if (!selectedMemberIds.includes(body.representativeUserId!)) return NextResponse.json({ message: "Penalty representative must be selected in the match lineup." }, { status: 400 });

    await prisma.teamMatchLineup.upsert({
      where: { matchId_registrationId: { matchId: id, registrationId: registration.id } },
      update: {
        memberUserIds: selectedMemberIds as Prisma.InputJsonValue,
        representativeUserId: body.representativeUserId!,
        submittedByUserId: registration.team.captainId,
      },
      create: {
        matchId: id,
        registrationId: registration.id,
        teamId: registration.team.id,
        memberUserIds: selectedMemberIds as Prisma.InputJsonValue,
        representativeUserId: body.representativeUserId!,
        submittedByUserId: registration.team.captainId,
      },
    });

    const data = await getCompetitionData(match.tournamentId);
    return NextResponse.json({ message: "Team lineup saved.", ...data });
  } catch (error) {
    console.error("Failed to save team lineup", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to save team lineup." }, { status: 500 });
  }
}

const lineupRegistrationInclude = {
  user: true,
  team: {
    include: {
      captain: true,
      members: { include: { user: true } },
    },
  },
} satisfies Prisma.RegistrationInclude;

function validateBody(body: LineupBody) {
  if (!body.captainEmail?.trim()) return "Captain email is required.";
  if (!body.registrationId?.trim()) return "Match side registration is required.";
  if (!Array.isArray(body.memberUserIds)) return "Lineup members are required.";
  if (!body.representativeUserId?.trim()) return "Penalty representative is required.";
  return null;
}
