import { Suspense } from "react";
import { BankTransferForm } from "@/components/BankTransferForm";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getSettingsMap } from "@/lib/settings";

export default async function BankTransferPage() {
  const settings = await getSettingsMap();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_25%_10%,rgba(34,211,238,0.2),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#020617)] px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Bank transfer</p>
          <h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">Upload your payment receipt.</h1>
        </div>
      </section>
      <Suspense fallback={<div className="px-5 py-12 text-slate-300">Loading payment form...</div>}>
        <BankTransferForm bankName={settings.bank_name} accountName={settings.account_name} accountNumber={settings.account_number} />
      </Suspense>
      <Footer />
    </main>
  );
}