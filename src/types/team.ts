import type { PublicGameTitle } from "@/types/public-tournament";

export type TeamMemberStatus = "ACTIVE" | "INVITED" | "REMOVED";
export type TeamRole = "CAPTAIN" | "MEMBER";

export type PublicTeamMember = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  gamerTag: string | null;
  role: TeamRole;
  status: TeamMemberStatus;
  joinedAt: string;
};

export type PublicTeam = {
  id: string;
  name: string;
  tag: string;
  logoUrl: string | null;
  captainId: string;
  captainName: string;
  captainEmail: string;
  game: PublicGameTitle;
  gameLabel: string;
  description: string | null;
  activeMemberCount: number;
  createdAt: string;
  updatedAt: string;
  members: PublicTeamMember[];
};

export type TeamsResponse = {
  teams: PublicTeam[];
  message?: string;
};

export type TeamResponse = {
  team?: PublicTeam;
  message?: string;
};