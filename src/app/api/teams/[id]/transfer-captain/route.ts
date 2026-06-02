import { NextRequest, NextResponse } from "next/server";
import { TeamMemberStatus, TeamRole } from "@/generated/prisma/client";
import { isCaptain, serializeTeam, teamInclude } from "@/lib/teams";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type TransferBody = { captainEmail?: string; memberId?: string };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as TransferBody;
    const team = await prisma.team.findUnique({ where: { id }, include: teamInclude });
    if (!team) return NextResponse.json({ message: "Team not found." }, { status: 404 });
    if (!body.captainEmail || !isCaptain(team, body.captainEmail)) return NextResponse.json({ message: "Only the current captain can transfer captain role." }, { status: 403 });
    if (!body.memberId) return NextResponse.json({ message: "New captain member ID is required." }, { status: 400 });

    const newCaptain = team.members.find((member) => member.id === body.memberId);
    const currentCaptain = team.members.find((member) => member.userId === team.captainId);
    if (!newCaptain) return NextResponse.json({ message: "Team member not found." }, { status: 404 });
    if (newCaptain.status !== TeamMemberStatus.ACTIVE) return NextResponse.json({ message: "Captain can only be transferred to an active member." }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      if (currentCaptain) {
        await tx.teamMember.update({ where: { id: currentCaptain.id }, data: { role: TeamRole.MEMBER } });
      }
      await tx.teamMember.update({ where: { id: newCaptain.id }, data: { role: TeamRole.CAPTAIN, status: TeamMemberStatus.ACTIVE } });
      await tx.team.update({ where: { id }, data: { captainId: newCaptain.userId } });
    });

    const updatedTeam = await prisma.team.findUniqueOrThrow({ where: { id }, include: teamInclude });
    return NextResponse.json({ message: "Captain role transferred successfully.", team: serializeTeam(updatedTeam) });
  } catch (error) {
    console.error("Failed to transfer captain", error);
    return NextResponse.json({ message: "Failed to transfer captain role." }, { status: 500 });
  }
}
