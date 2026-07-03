import Link from "next/link";
import { headers } from "next/headers";
import { Footer } from "@/components/Footer";
import { LivestreamEmbed } from "@/components/LivestreamEmbed";
import { Navbar } from "@/components/Navbar";
import {
  formatCompetition,
  formatDate,
  formatGame,
  formatMoney,
  formatRegistrationType,
  formatStatus,
  getAvailableSlots,
  type PublicCompetitionResponse,
  type PublicMatch,
  type PublicStanding,
  type PublicTournamentResponse,
  type PublicTournamentStatus,
} from "@/types/public-tournament";

type TournamentDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const statusStyles: Record<PublicTournamentStatus, string> = {
  UPCOMING: "border-blue-300/30 bg-blue-300/10 text-blue-200",
  OPEN: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  CLOSED: "border-rose-300/30 bg-rose-300/10 text-rose-200",
};

export default async function TournamentDetailsPage({ params }: TournamentDetailsPageProps) {
  const { id } = await params;
  const { tournament, error } = await getTournament(id);
  const competition = tournament ? await getCompetition(tournament.id) : null;

  if (!tournament) {
    return <TournamentNotFound message={error || "This tournament does not exist or may have been removed by admin."} />;
  }

  const availableSlots = getAvailableSlots(tournament);
  const registrationClosed = tournament.status === "CLOSED" || !tournament.registrationOpen;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_75%_15%,rgba(34,211,238,0.2),transparent_30%),linear-gradient(135deg,#020617,#0f172a_50%,#020617)] px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/tournaments" className="text-sm font-bold text-cyan-300 transition hover:text-white">
            Back to tournaments
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                  {formatGame(tournament.game)}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyles[tournament.status]}`}>
                  {formatStatus(tournament.status)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black text-slate-200">
                  {formatCompetition(tournament.competitionFormat)}
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:text-6xl">{tournament.title}</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{tournament.description}</p>
            </div>

            <aside className="rounded-2xl border border-cyan-300/20 bg-white/[0.06] p-5 shadow-2xl shadow-cyan-950/30">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Registration</p>
              <dl className="mt-5 grid gap-3 text-sm">
                <Info label="Prize pool" value={formatMoney(tournament.prizePool)} highlight />
                <Info label="Calculated pool" value={formatMoney(tournament.calculatedPrizePool ?? 0)} />
                <Info label="Prize payout" value={tournament.prizePayoutPaid ? "Paid" : "Pending"} />
                <Info label="Entry fee" value={formatMoney(tournament.entryFee)} />
                <Info label="Registration type" value={formatRegistrationType(tournament.registrationType)} />
                {tournament.registrationType === "TEAM" && tournament.teamSize ? <Info label="Team size" value={`${tournament.teamSize} players`} /> : null}
                <Info label="Available slots" value={tournament.allowUnlimitedRegistration ? "Unlimited" : `${availableSlots} / ${tournament.registrationLimit ?? tournament.slots}`} />
                <Info label="Registration" value={tournament.registrationOpen ? "Open" : "Closed"} />
                <Info label="Home & away" value={tournament.useHomeAndAway ? "Enabled" : "Disabled"} />
                <Info label="Start date" value={formatDate(tournament.startDate)} />
              </dl>
              <Link href={`/register?tournament=${tournament.id}`} aria-disabled={registrationClosed} className={`mt-6 block w-full rounded-lg px-4 py-4 text-center text-sm font-black uppercase tracking-wide transition ${registrationClosed ? "cursor-not-allowed bg-slate-700 text-slate-400" : "bg-cyan-300 text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.35)] hover:-translate-y-1 hover:bg-white"}`}>
                Register for Tournament
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Format</p>
          <h2 className="mt-3 text-2xl font-black text-white">{formatCompetition(tournament.competitionFormat)}</h2>
          <p className="mt-4 text-slate-300">{tournament.format}</p>
          <p className="mt-4 text-slate-300">
            Number of registered {tournament.registrationType === "TEAM" ? "teams" : "players"}: <span className="font-black text-white">{tournament.registeredPlayers}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Rules</p>
          <h2 className="mt-3 text-2xl font-black text-white">Tournament rules</h2>
          <ol className="mt-6 space-y-3">
            {tournament.rules.map((rule, index) => (
              <li key={rule} className="flex gap-3 rounded-lg bg-white/[0.04] p-4 text-slate-300">
                <span className="font-black text-cyan-300">{index + 1}.</span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {tournament.livestreamUrl ? (
        <section className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Tournament livestream</p>
            <h2 className="mt-3 text-2xl font-black text-white">Watch the broadcast</h2>
            <div className="mt-5">
              <LivestreamEmbed url={tournament.livestreamUrl} platform={tournament.streamPlatform} title={`${tournament.title} livestream`} />
            </div>
          </div>
        </section>
      ) : null}
      <CompetitionSections matches={competition?.matches ?? []} standings={competition?.standings ?? []} />
      <Footer />
    </main>
  );
}

async function getTournament(id: string) {
  try {
    const response = await fetch(`${await getBaseUrl()}/api/tournaments/${id}`, { cache: "no-store" });
    const data = (await response.json()) as PublicTournamentResponse;

    if (!response.ok || !data.tournament) {
      return { tournament: null, error: data.message ?? "Tournament not found." };
    }

    return { tournament: data.tournament, error: "" };
  } catch (error) {
    return {
      tournament: null,
      error: error instanceof Error ? error.message : "Failed to fetch tournament.",
    };
  }
}

async function getCompetition(id: string) {
  try {
    const response = await fetch(`${await getBaseUrl()}/api/tournaments/${id}/matches`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as PublicCompetitionResponse;
  } catch {
    return null;
  }
}

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function CompetitionSections({ matches, standings }: { matches: PublicMatch[]; standings: PublicStanding[] }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 lg:px-8">
      <Standings standings={standings} />
      <Matches matches={matches} />
    </section>
  );
}

function Standings({ standings }: { standings: PublicStanding[] }) {
  const groups = groupBy(standings, (standing) => standing.groupName ?? "League Table");
  const entries = Object.entries(groups);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Tables and groups</p>
      {entries.length === 0 ? (
        <p className="mt-4 text-slate-400">League tables and group-stage tables will appear after admin generates fixtures.</p>
      ) : (
        <div className="mt-6 grid gap-6">
          {entries.map(([group, rows]) => (
            <div key={group} className="overflow-x-auto">
              <h3 className="mb-3 text-xl font-black text-white">{group}</h3>
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr><th className="py-3">Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rows.map((standing) => (
                    <tr key={standing.id} className="text-slate-200"><td className="py-3 font-bold text-white">{standing.playerName}</td><td>{standing.played}</td><td>{standing.won}</td><td>{standing.drawn}</td><td>{standing.lost}</td><td>{standing.goalsFor}</td><td>{standing.goalsAgainst}</td><td>{standing.goalDifference}</td><td className="font-black text-cyan-300">{standing.points}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Matches({ matches }: { matches: PublicMatch[] }) {
  const groups = groupBy(matches, (match) => match.groupName ?? `Round ${match.round}`);
  const entries = Object.entries(groups);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Matches</p>
      {entries.length === 0 ? (
        <p className="mt-4 text-slate-400">Matches will appear here after admin generates fixtures.</p>
      ) : (
        <div className="mt-6 grid gap-5">
          {entries.map(([group, groupMatches]) => (
            <div key={group} className="space-y-3">
              <h3 className="text-xl font-black text-white">{group}</h3>
              {groupMatches.map((match) => (
                <article key={match.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="font-black text-white">{match.homeName} vs {match.awayName}</h4>
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                      {match.legNumber ? <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100">Leg {match.legNumber}</span> : null}
                      {match.liveStatus === "LIVE" ? <span className="rounded-full border border-red-300/30 bg-red-500/10 px-3 py-1 text-red-100">LIVE</span> : null}
                      <span className={`rounded-full border px-3 py-1 ${streamBadgeClass(match)}`}>{streamBadge(match)}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-300">{match.status}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">Home: <span className="font-bold text-white">{match.homeName}</span> - Away: <span className="font-bold text-white">{match.awayName}</span></p>
                  <p className="mt-2 text-2xl font-black text-white">{match.liveStatus === "LIVE" || match.liveStatus === "PAUSED" ? `${match.liveHomeScore} : ${match.liveAwayScore}` : `${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}`}</p>
                  {match.liveStatus !== "NOT_STARTED" ? <p className="mt-1 text-sm font-bold text-cyan-300">Referee live status: {match.liveStatus}</p> : null}
                  {getMatchStreamUrl(match) ? <a href={getMatchStreamUrl(match) ?? "#"} target="_blank" className="mt-3 inline-block text-sm font-bold text-cyan-300 hover:text-white">Watch match livestream</a> : null}
                  {match.roomCode ? <p className="mt-2 text-sm text-slate-300">Match access code: <span className="font-bold text-white">{match.roomCode}</span></p> : null}
                  {match.spectatorNote ? <p className="mt-2 text-sm text-slate-300">Spectator note: {match.spectatorNote}</p> : null}
                  {match.aggregateWinnerName ? <p className="mt-2 text-sm font-bold text-emerald-300">Aggregate winner: {match.aggregateWinnerName}</p> : null}
                  {match.winnerName ? <p className="mt-2 text-sm font-bold text-cyan-300">Winner: {match.winnerName}</p> : null}
                </article>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getMatchStreamUrl(match: PublicMatch) {
  return match.officialStreamUrl || match.playerStreamUrl || match.livestreamUrl || null;
}

function streamBadge(match: PublicMatch) {
  if (match.featuredLive) return "Featured Live";
  if (match.streamMode === "OFFICIAL_STREAM") return "Official Live";
  if (match.streamMode === "PLAYER_STREAM") return "Player Stream";
  return "No Stream";
}

function streamBadgeClass(match: PublicMatch) {
  if (match.featuredLive) return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  if (match.streamMode === "OFFICIAL_STREAM") return "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";
  if (match.streamMode === "PLAYER_STREAM") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  return "border-white/10 bg-white/[0.04] text-slate-300";
}

function TournamentNotFound({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="mx-auto max-w-4xl px-5 py-24 text-center lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-16 shadow-2xl shadow-cyan-950/20">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Tournament not found</p>
          <h1 className="mt-4 text-4xl font-black text-white">This tournament is not available.</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">{message}</p>
          <Link href="/tournaments" className="mt-8 inline-block rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white">
            View Tournaments
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Info({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-950/70 px-4 py-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`text-right font-black ${highlight ? "text-emerald-300" : "text-white"}`}>{value}</dd>
    </div>
  );
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {});
}



