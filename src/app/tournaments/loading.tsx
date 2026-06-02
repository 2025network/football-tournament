export default function TournamentsLoading() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-24 text-white lg:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 text-center shadow-2xl shadow-cyan-950/20">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Loading</p>
        <h1 className="mt-4 text-3xl font-black text-white">Loading live tournaments...</h1>
        <p className="mt-3 text-slate-400">Fetching tournament records from PostgreSQL.</p>
      </div>
    </main>
  );
}
