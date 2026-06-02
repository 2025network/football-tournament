import Link from "next/link";
import { CompetitionFormat, GameTitle } from "@/generated/prisma/client";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";

const gameLabels: Record<GameTitle, string> = {
  EFOOTBALL_MOBILE: "eFootball Mobile",
  PUBG_MOBILE: "PUBG Mobile",
  COD_MOBILE: "COD Mobile",
  FREE_FIRE: "Free Fire",
};

const formatLabels: Record<CompetitionFormat, string> = {
  OPEN_KNOCKOUT: "Open Knockout",
  DOUBLE_ELIMINATION: "Double Elimination",
  LEAGUE: "League",
  CHAMPIONS_LEAGUE: "Champions League",
  SWISS_SYSTEM: "Swiss System",
};

type LeaderboardPageProps = {
  searchParams: Promise<{ game?: string; season?: string; format?: string }>;
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const params = await searchParams;
  const game = Object.values(GameTitle).includes(params.game as GameTitle) ? (params.game as GameTitle) : "All";
  const format = Object.values(CompetitionFormat).includes(params.format as CompetitionFormat) ? (params.format as CompetitionFormat) : "All";
  const seasonId = params.season?.trim() || "All";

  const [seasons, players] = await Promise.all([
    prisma.leaderboardSeason.findMany({ orderBy: { startDate: "desc" } }),
    prisma.user.findMany({
      where: {
        role: "PLAYER",
        ...(game !== "All" ? { favoriteGame: game } : {}),
        ...(format !== "All" ? { registrations: { some: { tournament: { competitionFormat: format } } } } : {}),
      },
      include: {
        achievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" } },
        rankingHistory: seasonId === "All" ? false : { where: { seasonId }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ totalPoints: "desc" }, { totalWins: "desc" }, { totalLosses: "asc" }],
      take: 50,
    }),
  ]);

  const rankedPlayers = players
    .map((player) => {
      const seasonHistory = "rankingHistory" in player && Array.isArray(player.rankingHistory) ? player.rankingHistory[0] : null;
      return {
        ...player,
        displayPoints: seasonHistory?.points ?? player.totalPoints,
        displayWins: seasonHistory?.wins ?? player.totalWins,
        displayLosses: seasonHistory?.losses ?? player.totalLosses,
        displayDraws: seasonHistory?.draws ?? player.totalDraws,
      };
    })
    .sort((a, b) => b.displayPoints - a.displayPoints || b.displayWins - a.displayWins || a.displayLosses - b.displayLosses);

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="border-b border-white/10 pb-8">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Global leaderboard</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Player Rankings</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Wins give 3 points, draws give 1 point, and tournament champions earn bonus points.</p>
        </div>

        <form className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
          <Filter name="game" label="Game" value={game} options={["All", ...Object.values(GameTitle)]} labels={{ All: "All Games", ...gameLabels }} />
          <Filter name="season" label="Season" value={seasonId} options={["All", ...seasons.map((season) => season.id)]} labels={{ All: "All Seasons", ...Object.fromEntries(seasons.map((season) => [season.id, season.name])) }} />
          <Filter name="format" label="Format" value={format} options={["All", ...Object.values(CompetitionFormat)]} labels={{ All: "All Formats", ...formatLabels }} />
          <button className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white md:col-span-3" type="submit">Apply Filters</button>
        </form>

        <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="hidden grid-cols-[0.5fr_1.5fr_repeat(6,1fr)] gap-4 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 lg:grid">
            <span>Rank</span><span>Player</span><span>Points</span><span>Wins</span><span>Losses</span><span>Draws</span><span>Trophies</span><span>Game</span>
          </div>
          {rankedPlayers.length === 0 ? (
            <div className="p-8 text-center text-slate-300">No ranked players found yet.</div>
          ) : rankedPlayers.map((player, index) => (
            <Link key={player.id} href={`/players/${player.id}`} className="grid gap-3 border-b border-white/10 px-5 py-5 transition hover:bg-cyan-300/5 lg:grid-cols-[0.5fr_1.5fr_repeat(6,1fr)] lg:items-center">
              <p className="text-2xl font-black text-cyan-200">#{index + 1}</p>
              <div><p className="font-black text-white">{player.gamerTag || player.fullName}</p><p className="text-xs text-slate-400">{player.fullName}</p></div>
              <Metric label="Points" value={player.displayPoints} />
              <Metric label="Wins" value={player.displayWins} />
              <Metric label="Losses" value={player.displayLosses} />
              <Metric label="Draws" value={player.displayDraws} />
              <Metric label="Trophies" value={player.tournamentsWon} />
              <span className="text-sm text-slate-200">{player.favoriteGame ? gameLabels[player.favoriteGame] : "Not set"}</span>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Filter({ name, label, value, options, labels }: { name: string; label: string; value: string; options: string[]; labels: Record<string, string> }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <select name={name} defaultValue={value} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300">
        {options.map((option) => <option key={option} value={option}>{labels[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <span className="text-sm text-slate-200"><span className="text-xs font-bold uppercase text-slate-500 lg:hidden">{label}: </span>{value}</span>;
}

