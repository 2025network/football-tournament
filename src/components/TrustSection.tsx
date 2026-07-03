const trustItems = [
  { title: "Secure Registration", text: "Player accounts, team records, and admin approval keep African tournaments organized from kickoff." },
  { title: "Fair Competition", text: "Fixtures, match status, disputes, and referee controls support cleaner football operations." },
  { title: "Live Match Tracking", text: "Featured streams, live scores, schedules, and match pages help supporters follow the action." },
  { title: "Verified Results", text: "Proof uploads, opponent confirmation, and admin review reduce confusion after every match." },
  { title: "Fast Prize Payouts", text: "Payment and bank details are managed from the admin panel for smoother prize workflows." },
];

export function TrustSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Why play on AfriKick</p>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Built for serious African competitors</h2>
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {trustItems.map((item) => (
          <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-cyan-300/50">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-sm font-black text-cyan-200">AK</div>
            <h3 className="text-lg font-black text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
