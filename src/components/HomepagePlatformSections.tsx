import Link from "next/link";
import { MatchStatus, TournamentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatGame, formatMoney, getAvailableSlots, type PublicTournament } from "@/types/public-tournament";

export async function HomepagePlatformSections() {
  const [registeredPlayers, activeTournaments, matchesPlayed, prizeAggregate, featuredTournaments, activeSeason] = await Promise.all([
    prisma.user.count({ where: { role: "PLAYER" } }),
    prisma.tournament.count({ where: { status: TournamentStatus.OPEN, registrationOpen: true } }),
    prisma.match.count({ where: { status: MatchStatus.COMPLETED } }),
    prisma.tournament.aggregate({ _sum: { prizePool: true }, where: { status: TournamentStatus.CLOSED } }),
    prisma.tournament.findMany({
      where: { status: TournamentStatus.OPEN, registrationOpen: true },
      orderBy: [{ prizePool: "desc" }, { startDate: "asc" }],
      take: 3,
    }),
    prisma.season.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  const topRatings = activeSeason ? await prisma.playerRating.findMany({ where: { seasonId: activeSeason.id }, include: { user: true }, orderBy: [{ currentRating: "desc" }, { wins: "desc" }], take: 5 }) : [];

  const stats = [
    { label: "Registered Players", value: registeredPlayers.toLocaleString(), detail: "verified platform accounts" },
    { label: "Active Tournaments", value: activeTournaments.toLocaleString(), detail: "open for registration" },
    { label: "Matches Played", value: matchesPlayed.toLocaleString(), detail: "completed fixtures" },
    { label: "Total Prize Money Paid", value: formatMoney(prizeAggregate._sum.prizePool ?? 0), detail: "closed tournament pools" },
  ];

  return (
    <>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-cyan-300/15 bg-white/[0.035] p-5 shadow-[0_0_30px_rgba(14,165,233,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
              <p className="mt-3 text-3xl font-black text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-cyan-200">{stat.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/45 px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Featured tournaments</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Compete across Africa</h2>
            </div>
            <Link href="/tournaments" className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-center text-sm font-black text-cyan-100 transition hover:-translate-y-1 hover:bg-cyan-300 hover:text-slate-950">View All Tournaments</Link>
          </div>

          {featuredTournaments.length === 0 ? (
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300">No featured tournaments are open yet. Please check back soon.</div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featuredTournaments.map((tournament) => <FeaturedTournamentCard key={tournament.id} tournament={serializeTournament(tournament)} />)}
            </div>
          )}
        </div>
      </section>

      <section className="px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-cyan-300/15 bg-white/[0.035] p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Leaderboard preview</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Top AfriKick competitors</h2>
              <p className="mt-2 text-sm text-slate-400">{activeSeason ? activeSeason.name : "Create an active season to start rating players."}</p>
            </div>
            <Link href="/leaderboard" className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-center text-sm font-black text-cyan-100 transition hover:-translate-y-1 hover:bg-cyan-300 hover:text-slate-950">Full Leaderboard</Link>
          </div>
          {topRatings.length === 0 ? <p className="mt-6 text-sm text-slate-400">Ratings will appear after completed penalty matches.</p> : (
            <div className="mt-6 grid gap-3 md:grid-cols-5">
              {topRatings.map((rating, index) => (
                <div key={rating.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">#{index + 1}</p>
                  <p className="mt-2 truncate font-black text-white">{rating.user.gamerTag || rating.user.fullName}</p>
                  <p className="mt-2 text-2xl font-black text-cyan-200">{rating.currentRating}</p>
                  <p className="text-xs text-slate-500">{rating.wins}W / {rating.losses}L</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function FeaturedTournamentCard({ tournament }: { tournament: PublicTournament }) {
  const slots = getAvailableSlots(tournament);
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)] transition hover:-translate-y-1 hover:border-cyan-300/50">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{formatGame(tournament.game)}</p>
      <h3 className="mt-3 text-2xl font-black text-white">{tournament.title}</h3>
      <dl className="mt-5 grid gap-3 text-sm">
        <Info label="Prize pool" value={formatMoney(tournament.calculatedPrizePool ?? tournament.prizePool)} highlight />
        <Info label="Entry fee" value={formatMoney(tournament.entryFee)} />
        <Info label="Slots remaining" value={Number.isFinite(slots) ? String(slots) : "Unlimited"} />
      </dl>
      <Link href={`/register?tournament=${tournament.id}`} className="mt-5 block rounded-lg bg-cyan-300 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-white">Join Tournament</Link>
    </article>
  );
}

function Info({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className="flex justify-between gap-4 rounded-lg bg-white/[0.04] px-4 py-3"><dt className="text-slate-400">{label}</dt><dd className={`text-right font-black ${highlight ? "text-emerald-300" : "text-white"}`}>{value}</dd></div>;
}

function serializeTournament(tournament: Awaited<ReturnType<typeof prisma.tournament.findMany>>[number]): PublicTournament {
  return {
    id: tournament.id,
    slug: tournament.slug,
    title: tournament.title,
    game: tournament.game,
    prizePool: tournament.prizePool,
    calculatedPrizePool: "calculatedPrizePool" in tournament && typeof tournament.calculatedPrizePool === "number" ? tournament.calculatedPrizePool : undefined,
    prizePayoutPaid: "prizePayoutPaid" in tournament && typeof tournament.prizePayoutPaid === "boolean" ? tournament.prizePayoutPaid : undefined,
    prizePayoutPaidAt: "prizePayoutPaidAt" in tournament && tournament.prizePayoutPaidAt instanceof Date ? tournament.prizePayoutPaidAt.toISOString() : null,
    prizePayoutNote: "prizePayoutNote" in tournament && typeof tournament.prizePayoutNote === "string" ? tournament.prizePayoutNote : null,
    entryFee: tournament.entryFee,
    slots: tournament.slots,
    registeredPlayers: tournament.registeredPlayers,
    startDate: tournament.startDate.toISOString(),
    status: tournament.status,
    format: tournament.format,
    competitionFormat: tournament.competitionFormat,
    registrationLimit: tournament.registrationLimit,
    allowUnlimitedRegistration: tournament.allowUnlimitedRegistration,
    registrationOpen: tournament.registrationOpen,
    useHomeAndAway: tournament.useHomeAndAway,
    registrationType: tournament.registrationType,
    teamSize: tournament.teamSize,
    livestreamUrl: tournament.livestreamUrl,
    streamPlatform: tournament.streamPlatform,
    description: tournament.description,
    rules: tournament.rules,
  };
}
