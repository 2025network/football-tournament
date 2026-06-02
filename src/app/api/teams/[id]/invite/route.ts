import { NextRequest, NextResponse } from "next/server";
import { TeamMemberStatus, TeamRole } from "@/generated/prisma/client";
import { isCaptain, serializeTeam, teamInclude } from "@/lib/teams";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type InviteBody = { captainEmail?: string; email?: string };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as InviteBody;
    const team = await prisma.team.findUnique({ where: { id }, include: teamInclude });
    if (!team) return NextResponse.json({ message: "Team not found." }, { status: 404 });
    if (!body.captainEmail || !isCaptain(team, body.captainEmail)) return NextResponse.json({ message: "Only the captain can invite members." }, { status: 403 });
    if (!body.email?.trim()) return NextResponse.json({ message: "Player email is required." }, { status: 400 });

    const email = body.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return NextResponse.json({ message: "Player account not found. Ask them to sign up first." }, { status: 404 });

    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: id, userId: user.id } },
      update: { status: TeamMemberStatus.INVITED, role: TeamRole.MEMBER },
      create: { teamId: id, userId: user.id, role: TeamRole.MEMBER, status: TeamMemberStatus.INVITED },
    });

    const updatedTeam = await prisma.team.findUniqueOrThrow({ where: { id }, include: teamInclude });
    return NextResponse.json({ message: "Player invited successfully.", team: serializeTeam(updatedTeam) });
  } catch (error) {
    console.error("Failed to invite team member", error);
    return NextResponse.json({ message: "Failed to invite team member." }, { status: 500 });
  }
}