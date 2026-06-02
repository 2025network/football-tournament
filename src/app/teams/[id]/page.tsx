import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { gameLabels, teamInclude } from "@/lib/teams";

type TeamDetailPageProps = { params: Promise<{ id: string }> };

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { id } = await params;
  const team = await prisma.team.findUnique({ where: { id }, include: teamInclude });
  if (!team) notFound();
  const activeMembers = team.members.filter((member) => member.status === "ACTIVE");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <Link href="/teams" className="text-sm font-bold text-cyan-300 hover:text-white">Back to teams</Link>
        <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">{gameLabels[team.game]}</p>
          <h1 className="mt-3 text-4xl font-black sm:text-6xl">[{team.tag}] {team.name}</h1>
          <p className="mt-4 max-w-2xl text-slate-300">{team.description || "No team description yet."}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3"><Info label="Captain" value={team.captain.fullName} /><Info label="Members" value={String(activeMembers.length)} /><Info label="Game" value={gameLabels[team.game]} /></div>
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-black">Roster</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{team.members.map((member) => <div key={member.id} className="rounded-lg border border-white/10 bg-black/20 p-4"><p className="font-black text-white">{member.user.gamerTag || member.user.fullName}</p><p className="mt-1 text-sm text-slate-400">{member.role} - {member.status}</p></div>)}</div>
        </section>
      </section>
      <Footer />
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>;
}