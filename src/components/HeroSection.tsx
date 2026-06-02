import Link from "next/link";

type HeroSectionProps = {
  title?: string;
  subtitle?: string;
  ctaText?: string;
};

export function HeroSection({ title = "Build your squad. Enter the arena. Win the prize.", subtitle = "A professional esports tournament platform for eFootball Mobile, PUBG Mobile, COD Mobile, and Free Fire players.", ctaText = "Register Tournament" }: HeroSectionProps) {
  return (
    <section id="home" className="relative isolate overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_32%),linear-gradient(135deg,#020617_0%,#0f172a_52%,#020617_100%)]" />
      <div className="absolute left-1/2 top-16 -z-10 h-64 w-64 -translate-x-1/2 rounded-full border border-cyan-300/20 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
            Competitive mobile tournaments
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.02] text-white sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            {subtitle}
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link href="/register" className="rounded-lg bg-cyan-300 px-6 py-4 text-center text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_36px_rgba(34,211,238,0.35)] transition hover:-translate-y-1 hover:bg-white">
              {ctaText}
            </Link>
            <Link href="/tournaments" className="rounded-lg border border-white/20 bg-white/5 px-6 py-4 text-center text-sm font-black uppercase tracking-wide text-white transition hover:-translate-y-1 hover:border-cyan-300 hover:bg-cyan-300/10">
              View Tournaments
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-white/[0.06] p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur">
          <div className="rounded-xl border border-white/10 bg-slate-950/80 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Live lobby</p>
                <h2 className="mt-2 text-2xl font-black text-white">Weekend Masters</h2>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">Open</span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-cyan-300/10 p-4">
                <p className="text-3xl font-black text-white">NGN 320k</p>
                <p className="mt-1 text-sm text-slate-400">Prize pool</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-4">
                <p className="text-3xl font-black text-white">123</p>
                <p className="mt-1 text-sm text-slate-400">Slots open</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {["eFootball final bracket", "PUBG squad qualifier", "COD Mobile 5v5 playoff"].map((match) => (
                <div key={match} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="text-sm font-semibold text-slate-200">{match}</span>
                  <span className="text-xs font-bold text-cyan-300">Soon</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}