import { AdminAuthGate } from "@/components/AdminAuthGate";
import { AdminProductionChecklist } from "@/components/AdminProductionChecklist";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function AdminProductionChecklistPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <AdminAuthGate>
        <AdminProductionChecklist />
      </AdminAuthGate>
      <Footer />
    </main>
  );
}
