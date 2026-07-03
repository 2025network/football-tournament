import { AdminAuthGate } from "@/components/AdminAuthGate";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PenaltyShootoutResultsAdmin } from "@/components/PenaltyShootoutResultsAdmin";

export default function AdminPenaltyShootoutResultsPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <Navbar />
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.22),transparent_32%),linear-gradient(135deg,#020617,#0f172a_60%,#020617)] px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Admin games</p>
          <h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">Penalty shootout results.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Review saved player penalty scores and see which tournament match each score was connected to.</p>
        </div>
      </section>
      <AdminAuthGate>
        <PenaltyShootoutResultsAdmin />
      </AdminAuthGate>
      <Footer />
    </main>
  );
}
