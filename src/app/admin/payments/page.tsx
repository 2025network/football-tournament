import { AdminAuthGate } from "@/components/AdminAuthGate";
import { AdminPaymentsManager } from "@/components/AdminPaymentsManager";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function AdminPaymentsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <AdminAuthGate>
        <AdminPaymentsManager />
      </AdminAuthGate>
      <Footer />
    </main>
  );
}
