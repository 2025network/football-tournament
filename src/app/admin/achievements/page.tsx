import { AdminAchievementsManager } from "@/components/AdminAchievementsManager";
import { AdminAuthGate } from "@/components/AdminAuthGate";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function AdminAchievementsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <AdminAuthGate>
        <AdminAchievementsManager />
      </AdminAuthGate>
      <Footer />
    </main>
  );
}
