import { AdminAuthGate } from "@/components/AdminAuthGate";
import { AdminTournamentsManager } from "@/components/AdminTournamentsManager";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function AdminTournamentsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_25%_10%,rgba(34,211,238,0.2),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#020617)] px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Admin tournaments</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Create and manage tournament records.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Add new tournaments, edit details, update status, and delete tournaments from PostgreSQL.
          </p>
        </div>
      </section>
      <AdminAuthGate>
        <AdminTournamentsManager />
      </AdminAuthGate>
      <Footer />
    </main>
  );
}
