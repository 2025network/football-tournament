import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";

type LeaderboardPageProps = {
  searchParams?: Promise<{ season?: string }>;
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const params = await searchParams;
  const seasons = await prisma.season.findMany({ orderBy: [{ active: "desc" }, { startDate: "desc" }] });
  const activeSeason = seasons.find((season) => season.active) ?? seasons[0] ?? null;
  const selectedSeason = seasons.find((season) => season.id === params?.season) ?? activeSeason;

  const ratings = selectedSeason ? await prisma.playerRating.findMany({
    where: { seasonId: selectedSeason.id },
    include: { user: { include: { achievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" }, take: 3 } } } },
    orderBy: [{ currentRating: "desc" }, { wins: "desc" }, { losses: "asc" }],
    take: 100,
  }) : [];

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="border-b border-white/10 pb-8">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Penalty leaderboard</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Player Ratings</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Completed penalty matches update the active season automatically. Winners gain points, losers lose points, and disputed matches wait until resolved.</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {seasons.length === 0 ? (
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-100">No seasons created yet</span>
          ) : seasons.map((season) => (
            <Link key={season.id} href={`/leaderboard?season=${season.id}`} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${selectedSeason?.id === season.id ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300 hover:text-cyan-100"}`}>
              {season.name}{season.active ? " · Active" : ""}
            </Link>
          ))}
        </div>

        {selectedSeason ? (
          <p className="mt-4 text-sm text-slate-400">Showing {selectedSeason.name}: {formatDate(selectedSeason.startDate)} - {formatDate(selectedSeason.endDate)}</p>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="hidden grid-cols-[0.5fr_2fr_repeat(4,1fr)] gap-4 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 lg:grid">
            <span>Rank</span><span>Player</span><span>Rating</span><span>Wins</span><span>Losses</span><span>Win %</span>
          </div>
          {ratings.length === 0 ? (
            <div className="p-8 text-center text-slate-300">No rated players yet. Ratings appear after completed penalty matches.</div>
          ) : ratings.map((rating, index) => (
            <Link key={rating.id} href={`/players/${rating.userId}`} className="grid gap-3 border-b border-white/10 px-5 py-5 transition hover:bg-cyan-300/5 lg:grid-cols-[0.5fr_2fr_repeat(4,1fr)] lg:items-center">
              <p className="text-2xl font-black text-cyan-200">#{index + 1}</p>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-white">{rating.user.gamerTag || rating.user.fullName}</p>
                  {rating.user.achievements.map((item) => (
                    <span key={item.id} title={item.achievement.name} className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">
                      {item.achievement.icon ?? item.achievement.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400">{rating.user.platformId ?? rating.user.email}</p>
              </div>
              <Metric label="Rating" value={rating.currentRating} highlight />
              <Metric label="Wins" value={rating.wins} />
              <Metric label="Losses" value={rating.losses} />
              <span className="text-sm text-slate-200"><span className="text-xs font-bold uppercase text-slate-500 lg:hidden">Win %: </span>{formatWinPercentage(rating.wins, rating.matchesPlayed)}</span>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return <span className={`text-sm ${highlight ? "font-black text-cyan-200" : "text-slate-200"}`}><span className="text-xs font-bold uppercase text-slate-500 lg:hidden">{label}: </span>{value}</span>;
}

function formatWinPercentage(wins: number, matchesPlayed: number) {
  if (matchesPlayed === 0) return "0%";
  return `${Math.round((wins / matchesPlayed) * 100)}%`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(value);
}
