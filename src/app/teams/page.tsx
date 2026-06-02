import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { gameLabels, serializeTeam, teamInclude } from "@/lib/teams";

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({ include: teamInclude, orderBy: { createdAt: "desc" } });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Teams and clans</p><h1 className="mt-3 text-4xl font-black sm:text-6xl">Esports Teams</h1><p className="mt-4 max-w-2xl text-slate-300">Browse PUBG Mobile, COD Mobile, and Free Fire squads created by players.</p></div>
          <div className="flex gap-3"><Link href="/teams/create" className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-white">Create Team</Link><Link href="/leaderboard/teams" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300 hover:text-slate-950">Team Leaderboard</Link></div>
        </div>

        {teams.length === 0 ? <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-300">No teams created yet.</div> : <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{teams.map((rawTeam) => { const team = serializeTeam(rawTeam); return <Link key={team.id} href={`/teams/${team.id}`} className="rounded-xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-cyan-300/50"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{gameLabels[rawTeam.game]}</p><h2 className="mt-3 text-2xl font-black text-white">[{team.tag}] {team.name}</h2><p className="mt-2 text-sm text-slate-400">Captain: {team.captainName}</p><p className="mt-4 text-sm text-slate-300">{team.activeMemberCount} active members</p></Link>; })}</div>}
      </section>
      <Footer />
    </main>
  );
}