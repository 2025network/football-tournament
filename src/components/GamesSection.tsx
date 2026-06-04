import Link from "next/link";
import { GameTitle, TournamentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatGame } from "@/types/public-tournament";

const games = [
  { game: GameTitle.EFOOTBALL_MOBILE, icon: "EF", description: "Fast mobile football tournaments for solo players and knockout brackets." },
  { game: GameTitle.PUBG_MOBILE, icon: "PB", description: "Squad-based battle royale events for teams, clans, and competitive groups." },
  { game: GameTitle.COD_MOBILE, icon: "CD", description: "Mobile FPS tournaments built for tactical teams and 5v5 matchups." },
  { game: GameTitle.FREE_FIRE, icon: "FF", description: "Accessible squad events with clear registration, payments, and result tracking." },
];

export async function GamesSection() {
  const counts = await prisma.tournament.groupBy({
    by: ["game"],
    where: { status: TournamentStatus.OPEN, registrationOpen: true },
    _count: { _all: true },
  });

  const countMap = new Map(counts.map((item) => [item.game, item._count._all]));

  return (
    <section id="games" className="border-y border-white/10 bg-slate-950 py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Supported games</p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Choose your battlefield</h2>
            <p className="mt-4 max-w-2xl text-slate-300">Join solo tournaments or build teams for the biggest mobile esports titles on FT Esports.</p>
          </div>
          <Link href="/tournaments" className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-center text-sm font-black text-cyan-100 transition hover:-translate-y-1 hover:bg-cyan-300 hover:text-slate-950">Browse Tournaments</Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {games.map((item) => (
            <article key={item.game} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-cyan-300/50">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-lg font-black text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.16)]">{item.icon}</div>
                <div>
                  <h3 className="font-black text-white">{formatGame(item.game)}</h3>
                  <p className="mt-1 text-sm font-bold text-cyan-200">{countMap.get(item.game) ?? 0} active tournaments</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
