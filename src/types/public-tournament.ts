export type PublicGameTitle = "EFOOTBALL_MOBILE" | "PUBG_MOBILE" | "COD_MOBILE" | "FREE_FIRE";

export type PublicTournamentStatus = "UPCOMING" | "OPEN" | "CLOSED";
export type PublicCompetitionFormat = "OPEN_KNOCKOUT" | "DOUBLE_ELIMINATION" | "LEAGUE" | "CHAMPIONS_LEAGUE" | "SWISS_SYSTEM";
export type PublicRegistrationType = "SOLO" | "TEAM";
export type PublicStreamPlatform = "YOUTUBE" | "FACEBOOK" | "TWITCH" | "TIKTOK" | "OTHER";
export type PublicMatchStreamMode = "NONE" | "PLAYER_STREAM" | "OFFICIAL_STREAM";
export type PublicMatchStatus = "PENDING" | "COMPLETED" | "DISPUTED";
export type PublicMatchLiveStatus = "NOT_STARTED" | "LIVE" | "PAUSED" | "COMPLETED";

export type PublicTournament = {
  id: string;
  slug: string;
  title: string;
  game: PublicGameTitle;
  prizePool: number;
  calculatedPrizePool?: number;
  prizePayoutPaid?: boolean;
  prizePayoutPaidAt?: string | null;
  prizePayoutNote?: string | null;
  entryFee: number;
  slots: number;
  registeredPlayers: number;
  startDate: string;
  status: PublicTournamentStatus;
  format: string;
  competitionFormat: PublicCompetitionFormat;
  registrationLimit: number | null;
  allowUnlimitedRegistration: boolean;
  registrationOpen: boolean;
  useHomeAndAway: boolean;
  registrationType: PublicRegistrationType;
  teamSize: number | null;
  livestreamUrl: string | null;
  streamPlatform: PublicStreamPlatform | null;
  description: string;
  rules: string[];
};

export type PublicMatch = {
  id: string;
  round: number;
  groupName: string | null;
  playerOneName: string;
  playerTwoName: string;
  winnerName: string | null;
  status: PublicMatchStatus;
  liveStatus: PublicMatchLiveStatus;
  livePlayerOneScore: number;
  livePlayerTwoScore: number;
  liveHomeScore: number;
  liveAwayScore: number;
  liveStartedAt?: string | null;
  liveEndedAt?: string | null;
  legNumber: number | null;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  aggregateMatchId: string | null;
  aggregateWinnerName: string | null;
  scheduledAt?: string | null;
  livestreamUrl?: string | null;
  streamMode?: PublicMatchStreamMode;
  playerStreamUrl?: string | null;
  officialStreamUrl?: string | null;
  featuredLive?: boolean;
  roomCode?: string | null;
  spectatorNote?: string | null;
};

export type PublicStanding = {
  id: string;
  registrationId: string;
  playerName: string;
  groupName: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type PublicTournamentsResponse = {
  tournaments: PublicTournament[];
  message?: string;
};

export type PublicTournamentResponse = {
  tournament?: PublicTournament;
  message?: string;
};

export type PublicCompetitionResponse = {
  tournament: PublicTournament;
  matches: PublicMatch[];
  standings: PublicStanding[];
  message?: string;
};

export const publicGameOptions = [
  { label: "All", value: "All" },
  { label: "Football", value: "EFOOTBALL_MOBILE" },
] as const;

export function formatGame(game: PublicGameTitle) {
  const labels: Record<PublicGameTitle, string> = {
    EFOOTBALL_MOBILE: "Football",
    PUBG_MOBILE: "Community Cup",
    COD_MOBILE: "Club Challenge",
    FREE_FIRE: "Street Football Cup",
  };

  return labels[game];
}

export function formatStatus(status: PublicTournamentStatus) {
  const labels: Record<PublicTournamentStatus, string> = {
    UPCOMING: "Upcoming",
    OPEN: "Open",
    CLOSED: "Closed",
  };

  return labels[status];
}

export function formatRegistrationType(type: PublicRegistrationType) {
  return type === "TEAM" ? "Team" : "Solo";
}

export function formatCompetition(format: PublicCompetitionFormat) {
  const labels: Record<PublicCompetitionFormat, string> = {
    OPEN_KNOCKOUT: "Open Knockout",
    DOUBLE_ELIMINATION: "Cup Format",
    LEAGUE: "League Format",
    CHAMPIONS_LEAGUE: "Group Stage",
    SWISS_SYSTEM: "Community Cup",
  };

  return labels[format];
}

export function formatMoney(value: number) {
  return `NGN ${value.toLocaleString()}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function getAvailableSlots(tournament: PublicTournament) {
  if (tournament.allowUnlimitedRegistration) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max((tournament.registrationLimit ?? tournament.slots) - tournament.registeredPlayers, 0);
}





