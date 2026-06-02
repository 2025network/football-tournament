import { AdminAuthGate } from "@/components/AdminAuthGate";
import { AdminSettingsManager } from "@/components/AdminSettingsManager";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function AdminSettingsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <AdminAuthGate>
        <AdminSettingsManager />
      </AdminAuthGate>
      <Footer />
    </main>
  );
}