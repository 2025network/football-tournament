import Link from "next/link";

const supportedGames = ["eFootball Mobile", "PUBG Mobile", "COD Mobile", "Free Fire"];

export function GamesSection() {
  return (
    <section id="games" className="border-y border-white/10 bg-slate-950 py-20">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Supported games</p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Choose your battlefield</h2>
            <p className="mt-4 max-w-2xl text-slate-300">
              Public tournaments now come from the PostgreSQL database managed in the admin dashboard.
            </p>
          </div>
          <Link
            href="/tournaments"
            className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-center text-sm font-black text-cyan-100 transition hover:-translate-y-1 hover:bg-cyan-300 hover:text-slate-950"
          >
            View Live Tournaments
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {supportedGames.map((game) => (
            <span key={game} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-5 text-center text-sm font-bold text-slate-200 transition hover:border-cyan-300/60 hover:text-cyan-200">
              {game}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
