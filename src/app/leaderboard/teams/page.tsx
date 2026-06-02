import Link from "next/link";
import { MatchStatus } from "@/generated/prisma/client";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { gameLabels } from "@/lib/teams";

export default async function TeamLeaderboardPage() {
  const teams = await prisma.team.findMany({ include: { registrations: true } });
  const matches = await prisma.match.findMany({ where: { status: MatchStatus.COMPLETED }, include: { homeRegistration: true, awayRegistration: true, playerOneRegistration: true, playerTwoRegistration: true } });
  const stats = new Map<string, { wins: number; losses: number; points: number }>();
  teams.forEach((team) => stats.set(team.id, { wins: 0, losses: 0, points: 0 }));

  for (const match of matches) {
    const homeReg = match.homeRegistration ?? match.playerOneRegistration;
    const awayReg = match.awayRegistration ?? match.playerTwoRegistration;
    const homeScore = match.homeScore ?? match.playerOneScore;
    const awayScore = match.awayScore ?? match.playerTwoScore;
    if (!homeReg?.teamId || !awayReg?.teamId || homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) continue;
    const home = stats.get(homeReg.teamId);
    const away = stats.get(awayReg.teamId);
    if (!home || !away) continue;
    if (homeScore > awayScore) { home.wins += 1; home.points += 3; away.losses += 1; }
    else if (awayScore > homeScore) { away.wins += 1; away.points += 3; home.losses += 1; }
    else { home.points += 1; away.points += 1; }
  }

  const rankedTeams = teams.map((team) => ({ team, ...(stats.get(team.id) ?? { wins: 0, losses: 0, points: 0 }) })).sort((a, b) => b.points - a.points || b.wins - a.wins);

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Team leaderboard</p>
        <h1 className="mt-3 text-4xl font-black sm:text-6xl">Clan Rankings</h1>
        <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {rankedTeams.length === 0 ? <div className="p-8 text-center text-slate-300">No teams ranked yet.</div> : rankedTeams.map((row, index) => <Link key={row.team.id} href={`/teams/${row.team.id}`} className="grid gap-3 border-b border-white/10 px-5 py-5 transition hover:bg-cyan-300/5 md:grid-cols-[0.5fr_2fr_1fr_1fr_1fr_1fr]"><p className="text-2xl font-black text-cyan-200">#{index + 1}</p><p className="font-black">[{row.team.tag}] {row.team.name}</p><p className="text-slate-300">{gameLabels[row.team.game]}</p><p>Wins: {row.wins}</p><p>Losses: {row.losses}</p><p className="font-black text-cyan-200">{row.points} pts</p></Link>)}
        </div>
      </section>
      <Footer />
    </main>
  );
}