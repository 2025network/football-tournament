import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PaymentCallbackStatus } from "@/components/PaymentCallbackStatus";

export default function PaymentCallbackPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Suspense fallback={<div className="px-5 py-20 text-center text-slate-300">Verifying payment...</div>}>
        <PaymentCallbackStatus />
      </Suspense>
      <Footer />
    </main>
  );
}
