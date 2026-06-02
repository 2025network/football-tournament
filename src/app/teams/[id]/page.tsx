import Link from "next/link";
import { MatchStatus } from "@/generated/prisma/client";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { gameLabels, teamInclude } from "@/lib/teams";
import { formatDate } from "@/types/public-tournament";

type TeamDetailPageProps = { params: Promise<{ id: string }> };
type RosterMember = {
  id: string;
  role: string;
  status: string;
  user: {
    gamerTag: string | null;
    fullName: string;
    platformId: string | null;
  };
};

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { id } = await params;
  const team = await prisma.team.findUnique({ where: { id }, include: teamInclude });
  if (!team) notFound();

  const registrations = await prisma.registration.findMany({ where: { teamId: team.id }, include: { tournament: true }, orderBy: { createdAt: "desc" } });
  const registrationIds = registrations.map((registration) => registration.id);
  const matches = registrationIds.length === 0 ? [] : await prisma.match.findMany({
    where: {
      status: MatchStatus.COMPLETED,
      OR: [
        { playerOneRegistrationId: { in: registrationIds } },
        { playerTwoRegistrationId: { in: registrationIds } },
        { homeRegistrationId: { in: registrationIds } },
        { awayRegistrationId: { in: registrationIds } },
      ],
    },
  });

  const activeMembers = team.members.filter((member) => member.status === "ACTIVE");
  const pendingMembers = team.members.filter((member) => member.status === "INVITED");
  const wins = matches.filter((match) => match.winnerRegistrationId && registrationIds.includes(match.winnerRegistrationId)).length;
  const losses = matches.filter((match) => match.winnerRegistrationId && !registrationIds.includes(match.winnerRegistrationId)).length;
  const draws = matches.filter((match) => !match.winnerRegistrationId).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <Link href="/teams" className="text-sm font-bold text-cyan-300 hover:text-white">Back to teams</Link>
        <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">{gameLabels[team.game]}</p>
          <h1 className="mt-3 text-4xl font-black sm:text-6xl">[{team.tag}] {team.name}</h1>
          <p className="mt-4 max-w-2xl text-slate-300">{team.description || "No team description yet."}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Captain" value={team.captain.fullName} /><Info label="Active members" value={String(activeMembers.length)} /><Info label="Tournaments entered" value={String(registrations.length)} /><Info label="Record" value={`${wins}W / ${draws}D / ${losses}L`} /></div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-2xl font-black">Roster</h2>
            <Roster title="Active members" members={activeMembers} />
            <Roster title="Pending invites" members={pendingMembers} />
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-2xl font-black">Tournaments entered</h2>
            {registrations.length === 0 ? <p className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-400">This team has not entered a tournament yet.</p> : <div className="mt-5 grid gap-3">{registrations.map((registration) => <Link key={registration.id} href={`/tournaments/${registration.tournamentId}`} className="rounded-lg border border-white/10 bg-black/20 p-4 transition hover:border-cyan-300/50"><p className="font-black text-white">{registration.tournament.title}</p><p className="mt-1 text-sm text-slate-400">Registered {formatDate(registration.createdAt.toISOString())} - {registration.paymentStatus} / {registration.approvalStatus}</p></Link>)}</div>}
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Roster({ title, members }: { title: string; members: RosterMember[] }) {
  return <div className="mt-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{title}</p>{members.length === 0 ? <p className="mt-2 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-400">No {title.toLowerCase()}.</p> : <div className="mt-3 grid gap-3">{members.map((member) => <div key={member.id} className="rounded-lg border border-white/10 bg-black/20 p-4"><p className="font-black text-white">{member.user.gamerTag || member.user.fullName}</p><p className="mt-1 text-sm text-slate-400">{member.role} - {member.status} {member.user.platformId ? `- ${member.user.platformId}` : ""}</p></div>)}</div>}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>;
}

