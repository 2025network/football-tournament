import Link from "next/link";

type HeroSectionProps = {
  title?: string;
  subtitle?: string;
};

export function HeroSection({ title = "AfriKick", subtitle = "Create, join, and manage football tournaments built for African players, clubs, schools, communities, and football competitors." }: HeroSectionProps) {
  return (
    <section id="home" className="relative isolate overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_32%),linear-gradient(135deg,#020617_0%,#0f172a_52%,#020617_100%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Africa Plays Here</p>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.02] text-white sm:text-6xl lg:text-7xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{subtitle}</p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link href="/signup" className="rounded-lg bg-cyan-300 px-6 py-4 text-center text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_36px_rgba(34,211,238,0.35)] transition hover:-translate-y-1 hover:bg-white">Create Player Account</Link>
            <Link href="/tournaments" className="rounded-lg border border-white/20 bg-white/5 px-6 py-4 text-center text-sm font-black uppercase tracking-wide text-white transition hover:-translate-y-1 hover:border-cyan-300 hover:bg-cyan-300/10">Browse Tournaments</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-300/20 bg-white/[0.06] p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur">
          <div className="rounded-xl border border-white/10 bg-slate-950/80 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Player onboarding</p>
            <h2 className="mt-2 text-2xl font-black text-white">Your football journey starts here</h2>
            <div className="mt-6 grid gap-3">
              {["Create account", "Build your profile", "Join a tournament", "Submit results", "Climb the leaderboard"].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300 text-sm font-black text-slate-950">{index + 1}</span>
                  <span className="text-sm font-bold text-slate-200">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
