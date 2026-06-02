import Link from "next/link";
import { MatchStatus, MatchStreamMode } from "@/generated/prisma/client";
import { Footer } from "@/components/Footer";
import { LivestreamEmbed } from "@/components/LivestreamEmbed";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { formatDate, formatGame } from "@/types/public-tournament";

type StreamMatch = Awaited<ReturnType<typeof getStreamMatches>>[number];

export default async function LivePage() {
  const [streamTournaments, streamMatches] = await Promise.all([getStreamTournaments(), getStreamMatches()]);
  const featuredMatch = streamMatches.find((match) => match.featuredLive && getMatchStreamUrl(match)) ?? streamMatches.find((match) => getMatchStreamUrl(match)) ?? null;

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <Navbar />
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_75%_10%,rgba(34,211,238,0.2),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#020617)] px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Live center</p>
          <h1 className="mt-4 text-4xl font-black sm:text-6xl">Watch Live Matches</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Follow streamed tournaments, upcoming fixtures, room notes, and live match links from one spectator page.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:px-8">
        {featuredMatch ? (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
            <LivestreamEmbed url={getMatchStreamUrl(featuredMatch)} platform="YOUTUBE" title={`${featuredMatch.tournament.title} live match`} />
            <MatchPanel match={featuredMatch} featured />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300">No embedded livestream is available yet.</div>
        )}

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Live tournaments</p><h2 className="mt-2 text-2xl font-black">Tournament Streams</h2></div>
          </div>
          {streamTournaments.length === 0 ? <Empty text="No tournament-level streams have been added yet." /> : <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{streamTournaments.map((tournament) => <article key={tournament.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-5"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{formatGame(tournament.game)}</p><h3 className="mt-2 text-xl font-black">{tournament.title}</h3><p className="mt-2 text-sm text-slate-400">{tournament.streamPlatform ?? "Stream"}</p><Link href={`/tournaments/${tournament.id}`} className="mt-4 inline-block text-sm font-bold text-cyan-300 hover:text-white">View tournament</Link></article>)}</div>}
        </section>

        <section>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Match schedule</p>
          <h2 className="mt-2 text-2xl font-black">Live and Upcoming Streamed Matches</h2>
          {streamMatches.length === 0 ? <Empty text="No streamed matches are scheduled yet." /> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{streamMatches.map((match) => <MatchPanel key={match.id} match={match} />)}</div>}
        </section>
      </section>
      <Footer />
    </main>
  );
}

async function getStreamTournaments() {
  return prisma.tournament.findMany({
    where: { livestreamUrl: { not: null } },
    orderBy: { startDate: "asc" },
  });
}

async function getStreamMatches() {
  return prisma.match.findMany({
    where: {
      OR: [
        { streamMode: MatchStreamMode.OFFICIAL_STREAM },
        { featuredLive: true },
      ],
    },
    include: {
      tournament: true,
      homeRegistration: { include: { user: true, team: true } },
      awayRegistration: { include: { user: true, team: true } },
      playerOneRegistration: { include: { user: true, team: true } },
      playerTwoRegistration: { include: { user: true, team: true } },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
  });
}

function MatchPanel({ match, featured = false }: { match: StreamMatch; featured?: boolean }) {
  const home = match.homeRegistration ?? match.playerOneRegistration;
  const away = match.awayRegistration ?? match.playerTwoRegistration;
  const homeName = home?.team ? `[${home.team.tag}] ${home.team.name}` : home?.user.gamerTag || home?.user.fullName || "TBD";
  const awayName = away?.team ? `[${away.team.tag}] ${away.team.name}` : away?.user.gamerTag || away?.user.fullName || "TBD";
  const streamUrl = getMatchStreamUrl(match);
  const isLive = match.status === MatchStatus.PENDING && streamUrl;

  return (
    <article className={`rounded-xl border border-white/10 bg-white/[0.035] p-5 ${featured ? "shadow-[0_0_35px_rgba(14,165,233,0.14)]" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        {isLive ? <span className="rounded-full border border-red-300/30 bg-red-500/10 px-3 py-1 text-red-100">LIVE</span> : null}
        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100">{formatGame(match.tournament.game)}</span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-300">{match.status}</span>
        <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-emerald-100">{match.featuredLive ? "FEATURED" : "OFFICIAL"}</span>
      </div>
      <h3 className="mt-4 text-xl font-black">{homeName} vs {awayName}</h3>
      <p className="mt-2 text-sm text-slate-400">{match.tournament.title} - Round {match.round}{match.groupName ? ` - ${match.groupName}` : ""}</p>
      <dl className="mt-4 grid gap-2 text-sm">
        <Info label="Scheduled" value={match.scheduledAt ? formatDate(match.scheduledAt.toISOString()) : "Not scheduled"} />
        {match.roomCode ? <Info label="Room code" value={match.roomCode} /> : null}
        {match.spectatorNote ? <Info label="Spectator note" value={match.spectatorNote} /> : null}
      </dl>
      {streamUrl ? <Link href={streamUrl} target="_blank" className="mt-4 inline-block rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white">Open Livestream</Link> : null}
    </article>
  );
}

function getMatchStreamUrl(match: StreamMatch) {
  return match.officialStreamUrl || match.livestreamUrl || null;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 rounded-lg bg-black/20 px-4 py-3"><dt className="text-slate-400">{label}</dt><dd className="text-right font-bold text-white">{value}</dd></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">{text}</div>;
}
