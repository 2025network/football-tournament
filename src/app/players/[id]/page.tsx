import Link from "next/link";
import { notFound } from "next/navigation";
import { GameTitle, MatchStatus } from "@/generated/prisma/client";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";

const gameLabels: Record<GameTitle, string> = {
  EFOOTBALL_MOBILE: "eFootball Mobile",
  PUBG_MOBILE: "PUBG Mobile",
  COD_MOBILE: "COD Mobile",
  FREE_FIRE: "Free Fire",
};

type PlayerProfilePageProps = { params: Promise<{ id: string }> };

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const { id } = await params;
  const player = await prisma.user.findUnique({
    where: { id },
    include: {
      registrations: { include: { tournament: true }, orderBy: { createdAt: "desc" } },
      achievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" } },
    },
  });

  if (!player) notFound();

  const registrationIds = player.registrations.map((registration) => registration.id);
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
    include: {
      tournament: true,
      homeRegistration: { include: { user: true } },
      awayRegistration: { include: { user: true } },
      playerOneRegistration: { include: { user: true } },
      playerTwoRegistration: { include: { user: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <Link href="/leaderboard" className="text-sm font-bold text-cyan-300 hover:text-white">Back to leaderboard</Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_0_35px_rgba(14,165,233,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Player profile</p>
            <h1 className="mt-3 text-3xl font-black sm:text-5xl">{player.gamerTag || player.fullName}</h1>
            <p className="mt-3 text-slate-300">{player.fullName}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Stat label="Current rank" value={player.currentRank ? `#${player.currentRank}` : "Unranked"} />
              <Stat label="Favorite game" value={player.favoriteGame ? gameLabels[player.favoriteGame] : "Not set"} />
              <Stat label="Total points" value={String(player.totalPoints)} />
              <Stat label="Tournaments won" value={String(player.tournamentsWon)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Wins" value={String(player.totalWins)} />
            <Stat label="Losses" value={String(player.totalLosses)} />
            <Stat label="Draws" value={String(player.totalDraws)} />
            <Stat label="Played" value={String(player.tournamentsPlayed)} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-2xl font-black">Achievements</h2>
            {player.achievements.length === 0 ? <p className="mt-4 text-sm text-slate-400">No achievements unlocked yet.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{player.achievements.map((item) => <div key={item.id} className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4"><p className="text-lg font-black text-cyan-100">{item.achievement.icon ?? "ACH"} {item.achievement.name}</p><p className="mt-1 text-sm text-slate-300">{item.achievement.description}</p></div>)}</div>}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-2xl font-black">Tournaments Played</h2>
            {player.registrations.length === 0 ? <p className="mt-4 text-sm text-slate-400">No tournaments yet.</p> : <div className="mt-4 grid gap-3">{player.registrations.map((registration) => <div key={registration.id} className="rounded-lg border border-white/10 bg-black/20 p-4"><p className="font-black">{registration.tournament.title}</p><p className="mt-1 text-sm text-slate-400">{gameLabels[registration.tournament.game]} - {registration.tournament.competitionFormat}</p></div>)}</div>}
          </section>
        </div>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-2xl font-black">Recent Match History</h2>
          {matches.length === 0 ? <p className="mt-4 text-sm text-slate-400">No completed matches yet.</p> : <div className="mt-4 grid gap-3">{matches.map((match) => <div key={match.id} className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto]"><div><p className="font-black">{match.tournament.title}</p><p className="mt-1 text-sm text-slate-400">Round {match.round}{match.groupName ? ` - ${match.groupName}` : ""}</p></div><p className="font-black text-cyan-100">{match.homeRegistration?.user.gamerTag || match.homeRegistration?.user.fullName || match.playerOneRegistration?.user.fullName || "Player"} {match.homeScore ?? match.playerOneScore ?? 0} - {match.awayScore ?? match.playerTwoScore ?? 0} {match.awayRegistration?.user.gamerTag || match.awayRegistration?.user.fullName || match.playerTwoRegistration?.user.fullName || "Player"}</p></div>)}</div>}
        </section>
      </section>
      <Footer />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 break-words text-2xl font-black text-white">{value}</p></div>;
}