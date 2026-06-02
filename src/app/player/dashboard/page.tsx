import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PlayerAuthGate } from "@/components/PlayerAuthGate";

export default function PlayerDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <PlayerAuthGate />
      <Footer />
    </main>
  );
}
