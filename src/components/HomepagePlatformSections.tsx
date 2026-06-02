import Link from "next/link";

const steps = ["Create player account", "Get your Platform ID", "Join tournament", "Pay entry fee", "Play match", "Submit/confirm result", "Climb leaderboard"];
const trustItems = ["Admin-reviewed tournament records", "Manual and Paystack payment tracking", "Match proof and dispute workflow", "Rankings, teams, and notifications"];

export function HomepagePlatformSections() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">How it works</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => <div key={step} className="rounded-xl border border-white/10 bg-white/[0.035] p-5"><span className="text-3xl font-black text-cyan-300">{index + 1}</span><p className="mt-3 font-black text-white">{step}</p></div>)}
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/50 px-5 py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Feature title="Featured Tournaments" text="Browse open events created by admins and organizers." href="/tournaments" />
          <Feature title="Live Matches" text="Watch featured official streams and upcoming broadcast fixtures." href="/live" />
          <Feature title="Leaderboard Preview" text="Track top players, points, wins, and rankings." href="/leaderboard" />
          <Feature title="Teams / Clans" text="Create squads for PUBG, COD Mobile, and Free Fire tournaments." href="/teams" />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-12 lg:grid-cols-2 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Why players trust us</p>
          <div className="mt-5 grid gap-3">{trustItems.map((item) => <p key={item} className="rounded-lg bg-black/20 px-4 py-3 text-sm font-bold text-slate-200">{item}</p>)}</div>
        </div>
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-6">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Payment options</p>
          <h2 className="mt-3 text-3xl font-black text-white">Pay online or upload proof</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-5"><p className="font-black text-white">Paystack</p><p className="mt-2 text-sm text-slate-400">Card, transfer, and online payment initialization.</p></div>
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-5"><p className="font-black text-white">Bank Transfer</p><p className="mt-2 text-sm text-slate-400">Upload receipt for admin confirmation.</p></div>
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({ title, text, href }: { title: string; text: string; href: string }) {
  return <Link href={href} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-cyan-300/50"><h2 className="text-xl font-black text-white">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p></Link>;
}
