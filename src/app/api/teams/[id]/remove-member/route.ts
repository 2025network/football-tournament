import { NextRequest, NextResponse } from "next/server";
import { TeamMemberStatus, TeamRole } from "@/generated/prisma/client";
import { isCaptain, serializeTeam, teamInclude } from "@/lib/teams";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type RemoveBody = { captainEmail?: string; memberId?: string };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as RemoveBody;
    const team = await prisma.team.findUnique({ where: { id }, include: teamInclude });
    if (!team) return NextResponse.json({ message: "Team not found." }, { status: 404 });
    if (!body.captainEmail || !isCaptain(team, body.captainEmail)) return NextResponse.json({ message: "Only the captain can remove members." }, { status: 403 });
    if (!body.memberId) return NextResponse.json({ message: "Member ID is required." }, { status: 400 });

    const member = team.members.find((item) => item.id === body.memberId);
    if (!member) return NextResponse.json({ message: "Team member not found." }, { status: 404 });
    if (member.role === TeamRole.CAPTAIN) return NextResponse.json({ message: "Captain cannot be removed from their own team." }, { status: 400 });

    await prisma.teamMember.update({ where: { id: body.memberId }, data: { status: TeamMemberStatus.REMOVED } });
    const updatedTeam = await prisma.team.findUniqueOrThrow({ where: { id }, include: teamInclude });
    return NextResponse.json({ message: "Member removed successfully.", team: serializeTeam(updatedTeam) });
  } catch (error) {
    console.error("Failed to remove team member", error);
    return NextResponse.json({ message: "Failed to remove team member." }, { status: 500 });
  }
}