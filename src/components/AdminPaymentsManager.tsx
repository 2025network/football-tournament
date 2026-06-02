"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PaymentRecordStatus } from "@/generated/prisma/client";

type AdminPayment = {
  id: string;
  registrationId: string;
  playerName: string;
  playerEmail: string;
  tournamentTitle: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  reference: string | null;
  receiptUrl: string | null;
  senderName: string | null;
  senderBank: string | null;
  transferNote: string | null;
  status: PaymentRecordStatus;
  adminNote: string | null;
  registrationPaymentStatus: string;
  createdAt: string;
};

type PaymentsResponse = { payments: AdminPayment[]; message?: string };

export function AdminPaymentsManager() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPayments = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/payments", { cache: "no-store" });
      const data = (await response.json()) as PaymentsResponse;
      if (!response.ok) throw new Error(data.message ?? "Could not load payments.");
      setPayments(data.payments);
      setNotes(data.payments.reduce<Record<string, string>>((next, payment) => {
        next[payment.id] = payment.adminNote ?? "";
        return next;
      }, {}));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPayments(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPayments]);

  async function updatePayment(payment: AdminPayment, status: PaymentRecordStatus) {
    setActionLoading(payment.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: notes[payment.id] ?? "" }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not update payment.");
      setMessage(data.message ?? "Payment updated.");
      await loadPayments();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not update payment.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Admin payments</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Payment Review</h1>
          <p className="mt-3 text-sm text-slate-300">Review Paystack records, bank receipts, and manual payment confirmations.</p>
        </div>
        <Link href="/admin" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300 hover:text-slate-950">Back to Admin</Link>
      </div>

      {message ? <div className="mt-6 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-200">{message}</div> : null}
      {error ? <div className="mt-6 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-200">{error}</div> : null}

      {loading ? <div className="mt-8 text-slate-300">Loading payments...</div> : payments.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 text-center text-slate-400">No payments yet.</div>
      ) : (
        <div className="mt-8 grid gap-5">
          {payments.map((payment) => (
            <article key={payment.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20">
              <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr_1fr]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge text={payment.status} />
                    <Badge text={payment.method} />
                    <Badge text={payment.provider} />
                  </div>
                  <h2 className="mt-4 text-xl font-black text-white">{payment.playerName}</h2>
                  <p className="mt-1 text-sm text-slate-400">{payment.playerEmail}</p>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <Info label="Tournament" value={payment.tournamentTitle} />
                    <Info label="Amount" value={`${payment.currency} ${payment.amount.toLocaleString()}`} />
                    <Info label="Reference" value={payment.reference ?? "None"} />
                    <Info label="Registration payment" value={payment.registrationPaymentStatus} />
                    <Info label="Sender" value={payment.senderName ?? "None"} />
                    <Info label="Sender bank" value={payment.senderBank ?? "None"} />
                  </dl>
                  {payment.transferNote ? <p className="mt-4 text-sm text-slate-300">Transfer note: {payment.transferNote}</p> : null}
                  {payment.receiptUrl ? <a href={payment.receiptUrl} target="_blank" className="mt-4 inline-block text-sm font-bold text-cyan-300 hover:text-white">View receipt</a> : null}
                </div>

                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Admin note</span>
                  <textarea className="form-input min-h-36 resize-y" value={notes[payment.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [payment.id]: event.target.value }))} placeholder="Confirmation notes" />
                </label>

                <div className="grid content-start gap-3 sm:grid-cols-2">
                  <button onClick={() => updatePayment(payment, PaymentRecordStatus.SUCCESS)} disabled={actionLoading === payment.id} type="button" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-300 hover:text-slate-950 disabled:opacity-50">Approve Payment</button>
                  <button onClick={() => updatePayment(payment, PaymentRecordStatus.REJECTED)} disabled={actionLoading === payment.id} type="button" className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-black text-rose-100 hover:bg-rose-300 hover:text-slate-950 disabled:opacity-50">Reject Payment</button>
                  <button onClick={() => updatePayment(payment, PaymentRecordStatus.FAILED)} disabled={actionLoading === payment.id} type="button" className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100 hover:bg-amber-300 hover:text-slate-950 disabled:opacity-50">Mark Failed</button>
                  <button onClick={() => updatePayment(payment, payment.status)} disabled={actionLoading === payment.id} type="button" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300 hover:text-slate-950 disabled:opacity-50">Save Note</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Badge({ text }: { text: string }) {
  return <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{text}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-200">{value}</dd></div>;
}
