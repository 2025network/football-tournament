import { AdminAuthGate } from "@/components/AdminAuthGate";
import { AdminCompetitionManager } from "@/components/AdminCompetitionManager";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

type AdminCompetitionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCompetitionPage({ params }: AdminCompetitionPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_25%_10%,rgba(34,211,238,0.2),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#020617)] px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Competition manager</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Fixtures, scores, tables, and knockout legs.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Generate competitions from approved players, enter results, and track home and away aggregate winners.
          </p>
        </div>
      </section>
      <AdminAuthGate>
        <AdminCompetitionManager tournamentId={id} />
      </AdminAuthGate>
      <Footer />
    </main>
  );
}
