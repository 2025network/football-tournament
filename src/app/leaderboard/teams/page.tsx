import Link from "next/link";
import { TeamMemberStatus } from "@/generated/prisma/client";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { gameLabels } from "@/lib/teams";

export default async function TeamLeaderboardPage() {
  const activeSeason = await prisma.season.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  const teams = await prisma.team.findMany({
    include: {
      members: {
        where: { status: TeamMemberStatus.ACTIVE },
        include: {
          user: {
            include: {
              playerRatings: {
                where: activeSeason ? { seasonId: activeSeason.id } : { id: "__no_active_season__" },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rankedTeams = teams
    .map((team) => {
      const memberRatings = team.members.map((member) => member.user.playerRatings[0]).filter(Boolean);
      return {
        team,
        memberCount: team.members.length,
        rating: memberRatings.reduce((total, rating) => total + rating.currentRating, 0),
        wins: memberRatings.reduce((total, rating) => total + rating.wins, 0),
        losses: memberRatings.reduce((total, rating) => total + rating.losses, 0),
      };
    })
    .sort((a, b) => b.rating - a.rating || b.wins - a.wins || a.losses - b.losses);

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Team leaderboard</p>
        <h1 className="mt-3 text-4xl font-black sm:text-6xl">Team Rankings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Teams are ranked by the combined current-season ratings of active members. {activeSeason ? `Current season: ${activeSeason.name}.` : "Create an active season to start ranking teams."}
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="hidden grid-cols-[0.5fr_2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 lg:grid">
            <span>Rank</span><span>Team</span><span>Category</span><span>Members</span><span>Wins</span><span>Losses</span><span>Rating</span>
          </div>
          {rankedTeams.length === 0 ? (
            <div className="p-8 text-center text-slate-300">No teams ranked yet.</div>
          ) : rankedTeams.map((row, index) => (
            <Link key={row.team.id} href={`/teams/${row.team.id}`} className="grid gap-3 border-b border-white/10 px-5 py-5 transition hover:bg-cyan-300/5 lg:grid-cols-[0.5fr_2fr_1fr_1fr_1fr_1fr_1fr] lg:items-center">
              <p className="text-2xl font-black text-cyan-200">#{index + 1}</p>
              <p className="font-black text-white">[{row.team.tag}] {row.team.name}</p>
              <Metric label="Category" value={gameLabels[row.team.game]} />
              <Metric label="Members" value={String(row.memberCount)} />
              <Metric label="Wins" value={String(row.wins)} />
              <Metric label="Losses" value={String(row.losses)} />
              <Metric label="Rating" value={String(row.rating)} highlight />
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <span className={`text-sm ${highlight ? "font-black text-cyan-200" : "text-slate-200"}`}><span className="text-xs font-bold uppercase text-slate-500 lg:hidden">{label}: </span>{value}</span>;
}
