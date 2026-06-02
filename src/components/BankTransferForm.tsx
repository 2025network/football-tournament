"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type BankTransferFormProps = { bankName: string; accountName: string; accountNumber: string };

export function BankTransferForm({ bankName, accountName, accountNumber }: BankTransferFormProps) {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("registrationId") ?? "";
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!registrationId) {
      setErrorMessage("Registration ID is missing from the page URL.");
      return;
    }

    if (!receipt) {
      setErrorMessage("Upload your receipt image or PDF.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body = new FormData();
      body.append("registrationId", registrationId);
      body.append("senderName", senderName);
      body.append("senderBank", senderBank);
      body.append("transferNote", transferNote);
      body.append("receipt", receipt);

      const response = await fetch("/api/payments/bank-transfer", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not submit bank transfer receipt.");
      }

      setSuccessMessage(data.message ?? "Receipt submitted. Your payment is under review.");
      setSenderName("");
      setSenderBank("");
      setTransferNote("");
      setReceipt(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not submit receipt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-5 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <aside className="rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Bank details</p>
        <dl className="mt-6 grid gap-3 text-sm">
          <Info label="Bank Name" value={bankName} />
          <Info label="Account Name" value={accountName} />
          <Info label="Account Number" value={accountNumber} />
        </dl>
        <p className="mt-5 text-sm leading-6 text-slate-400">After transfer, upload your receipt. Admin will review it and mark your payment as paid when confirmed.</p>
      </aside>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20">
        {successMessage ? <Message tone="success" text={successMessage} /> : null}
        {errorMessage ? <Message tone="error" text={errorMessage} /> : null}

        <div className="grid gap-5">
          <label>
            <span className="mb-2 block text-sm font-black text-slate-200">Sender name</span>
            <input className="form-input" value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Name used for transfer" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-black text-slate-200">Sender bank</span>
            <input className="form-input" value={senderBank} onChange={(event) => setSenderBank(event.target.value)} placeholder="Bank name" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-black text-slate-200">Transfer note optional</span>
            <textarea className="form-input min-h-24 resize-y" value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="Reference, transfer time, or extra details" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-black text-slate-200">Upload receipt</span>
            <input className="form-input" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} />
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} className="mt-7 w-full rounded-lg bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-white disabled:opacity-50">
          {isSubmitting ? "Submitting..." : "Submit Receipt"}
        </button>
        <Link href="/player/dashboard" className="mt-4 block text-center text-sm font-bold text-cyan-300 hover:text-white">Back to player dashboard</Link>
      </form>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/[0.04] px-4 py-3"><dt className="text-slate-400">{label}</dt><dd className="mt-1 font-black text-white">{value}</dd></div>;
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  const cls = tone === "success" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-rose-300/30 bg-rose-300/10 text-rose-200";
  return <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-bold ${cls}`}>{text}</div>;
}
