import { NextRequest, NextResponse } from "next/server";
import { TeamMemberStatus } from "@/generated/prisma/client";
import { serializeTeam, teamInclude } from "@/lib/teams";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type RejectBody = { email?: string };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as RejectBody;
    if (!body.email?.trim()) return NextResponse.json({ message: "Player email is required." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } });
    if (!user?.passwordHash) return NextResponse.json({ message: "Player account not found." }, { status: 404 });

    const membership = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId: user.id } } });
    if (!membership || membership.status !== TeamMemberStatus.INVITED) return NextResponse.json({ message: "No pending invite was found for this team." }, { status: 404 });

    await prisma.teamMember.update({ where: { id: membership.id }, data: { status: TeamMemberStatus.REMOVED } });
    const team = await prisma.team.findUniqueOrThrow({ where: { id }, include: teamInclude });
    return NextResponse.json({ message: "Invite rejected.", team: serializeTeam(team) });
  } catch (error) {
    console.error("Failed to reject team invite", error);
    return NextResponse.json({ message: "Failed to reject invite." }, { status: 500 });
  }
}
