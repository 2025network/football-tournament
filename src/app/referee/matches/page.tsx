import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { RefereeMatchesManager } from "@/components/RefereeMatchesManager";

export default function RefereeMatchesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <RefereeMatchesManager />
      <Footer />
    </main>
  );
}
