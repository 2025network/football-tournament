import { AdminAuthGate } from "@/components/AdminAuthGate";
import { AdminTournamentAutomationManager } from "@/components/AdminTournamentAutomationManager";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminTournamentAutomationPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <AdminAuthGate>
        <AdminTournamentAutomationManager tournamentId={id} />
      </AdminAuthGate>
      <Footer />
    </main>
  );
}