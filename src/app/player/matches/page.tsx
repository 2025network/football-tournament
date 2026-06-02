import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PlayerMatchesManager } from "@/components/PlayerMatchesManager";

export default function PlayerMatchesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <PlayerMatchesManager />
      <Footer />
    </main>
  );
}
