import { AdminAuthGate } from "@/components/AdminAuthGate";
import { AdminSeasonsManager } from "@/components/AdminSeasonsManager";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function AdminSeasonsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <AdminAuthGate>
        <AdminSeasonsManager />
      </AdminAuthGate>
      <Footer />
    </main>
  );
}
