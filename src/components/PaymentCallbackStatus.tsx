"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PaymentCallbackStatus() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";
  const [message, setMessage] = useState("Verifying payment...");
  const [success, setSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    async function verify() {
      if (!reference) {
        setMessage("Payment reference was not found.");
        setSuccess(false);
        return;
      }

      try {
        const response = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`, { cache: "no-store" });
        const data = (await response.json()) as { message?: string; success?: boolean };
        setMessage(data.message ?? "Payment verification completed.");
        setSuccess(Boolean(data.success));
      } catch {
        setMessage("Could not verify payment.");
        setSuccess(false);
      }
    }

    void verify();
  }, [reference]);

  return (
    <section className="mx-auto max-w-3xl px-5 py-20 text-center lg:px-8">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-16 shadow-2xl shadow-cyan-950/20">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Payment callback</p>
        <h1 className="mt-4 text-4xl font-black text-white">{success === null ? "Checking payment" : success ? "Payment successful" : "Payment not successful"}</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">{message}</p>
        <Link href="/player/dashboard" className="mt-8 inline-block rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white">Back to Dashboard</Link>
      </div>
    </section>
  );
}
