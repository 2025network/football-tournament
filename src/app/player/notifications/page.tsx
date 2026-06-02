import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PlayerNotificationsManager } from "@/components/PlayerNotificationsManager";

export default function PlayerNotificationsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <PlayerNotificationsManager />
      <Footer />
    </main>
  );
}
