import { GameTitle, Prisma, TeamMemberStatus, TeamRole } from "@/generated/prisma/client";

export const teamInclude = {
  captain: true,
  members: {
    include: { user: true },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  },
} satisfies Prisma.TeamInclude;

export type TeamWithRelations = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

export const gameLabels: Record<GameTitle, string> = {
  EFOOTBALL_MOBILE: "Football",
  PUBG_MOBILE: "Community Cup",
  COD_MOBILE: "Club Challenge",
  FREE_FIRE: "Street Football Cup",
};

export function normalizeTeamTag(tag: string) {
  return tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function serializeTeam(team: TeamWithRelations) {
  const activeMembers = team.members.filter((member) => member.status === TeamMemberStatus.ACTIVE);

  return {
    id: team.id,
    name: team.name,
    tag: team.tag,
    logoUrl: team.logoUrl,
    captainId: team.captainId,
    captainName: team.captain.fullName,
    captainEmail: team.captain.email,
    game: team.game,
    gameLabel: gameLabels[team.game],
    description: team.description,
    activeMemberCount: activeMembers.length,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    members: team.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      fullName: member.user.fullName,
      email: member.user.email,
      gamerTag: member.user.gamerTag,
      platformId: member.user.platformId,
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt.toISOString(),
    })),
  };
}

export function isCaptain(team: TeamWithRelations, email: string) {
  return team.captain.email.toLowerCase() === email.trim().toLowerCase();
}

export function teamRoleValues() {
  return Object.values(TeamRole);
}
