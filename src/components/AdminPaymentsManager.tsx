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
type AdminWallet = { id: string; playerName: string; playerEmail: string; platformId: string | null; balance: number; currency: string };
type WalletsResponse = { wallets: AdminWallet[]; message?: string };
type AdminTournament = { id: string; title: string; entryFee: number; calculatedPrizePool?: number; prizePayoutPaid?: boolean; prizePayoutPaidAt?: string | null; prizePayoutNote?: string | null };
type TournamentsResponse = { tournaments: AdminTournament[]; message?: string };
type WalletFundingRequest = {
  id: string;
  playerName: string;
  playerEmail: string;
  platformId: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  senderName: string;
  receiptUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  approvedBy: string | null;
  creditedTransactionId: string | null;
  createdAt: string;
};
type FundingRequestsResponse = { requests: WalletFundingRequest[]; message?: string };

export function AdminPaymentsManager() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [wallets, setWallets] = useState<AdminWallet[]>([]);
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [fundingRequests, setFundingRequests] = useState<WalletFundingRequest[]>([]);
  const [walletForm, setWalletForm] = useState({ emailOrPlatformId: "", type: "CREDIT", amount: "", description: "", adminName: "" });
  const [payoutNotes, setPayoutNotes] = useState<Record<string, string>>({});
  const [fundingNotes, setFundingNotes] = useState<Record<string, string>>({});
  const [fundingAdminName, setFundingAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPayments = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/payments", { cache: "no-store" });
      const walletsResponse = await fetch("/api/admin/wallets", { cache: "no-store" });
      const tournamentsResponse = await fetch("/api/tournaments", { cache: "no-store" });
      const fundingResponse = await fetch("/api/admin/wallet-funding-requests", { cache: "no-store" });
      const data = (await response.json()) as PaymentsResponse;
      const walletsData = (await walletsResponse.json()) as WalletsResponse;
      const tournamentsData = (await tournamentsResponse.json()) as TournamentsResponse;
      const fundingData = (await fundingResponse.json()) as FundingRequestsResponse;
      if (!response.ok) throw new Error(data.message ?? "Could not load payments.");
      if (!walletsResponse.ok) throw new Error(walletsData.message ?? "Could not load wallets.");
      if (!tournamentsResponse.ok) throw new Error(tournamentsData.message ?? "Could not load tournaments.");
      if (!fundingResponse.ok) throw new Error(fundingData.message ?? "Could not load wallet funding requests.");
      setPayments(data.payments);
      setWallets(walletsData.wallets);
      setTournaments(tournamentsData.tournaments);
      setFundingRequests(fundingData.requests);
      setNotes(data.payments.reduce<Record<string, string>>((next, payment) => {
        next[payment.id] = payment.adminNote ?? "";
        return next;
      }, {}));
      setPayoutNotes(tournamentsData.tournaments.reduce<Record<string, string>>((next, tournament) => {
        next[tournament.id] = tournament.prizePayoutNote ?? "";
        return next;
      }, {}));
      setFundingNotes(fundingData.requests.reduce<Record<string, string>>((next, request) => {
        next[request.id] = request.adminNote ?? "";
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

  async function submitWalletAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading("wallet");
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...walletForm, amount: Number(walletForm.amount) }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not update wallet.");
      setMessage(data.message ?? "Wallet updated.");
      setWalletForm({ emailOrPlatformId: "", type: "CREDIT", amount: "", description: "", adminName: "" });
      await loadPayments();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not update wallet.");
    } finally {
      setActionLoading("");
    }
  }

  async function markPrizePayout(tournament: AdminTournament, paid: boolean) {
    setActionLoading(`payout-${tournament.id}`);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/tournaments/${tournament.id}/prize-payout`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid, note: payoutNotes[tournament.id] ?? "" }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not update prize payout.");
      setMessage(data.message ?? "Prize payout updated.");
      await loadPayments();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not update prize payout.");
    } finally {
      setActionLoading("");
    }
  }

  async function updateFundingRequest(request: WalletFundingRequest, status: "APPROVED" | "REJECTED") {
    setActionLoading(`funding-${request.id}`);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/wallet-funding-requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: fundingNotes[request.id] ?? "", adminName: fundingAdminName }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not update funding request.");
      setMessage(data.message ?? "Funding request updated.");
      await loadPayments();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not update funding request.");
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

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <form onSubmit={submitWalletAdjustment} className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Manual wallet control</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="form-input" value={walletForm.emailOrPlatformId} onChange={(event) => setWalletForm((current) => ({ ...current, emailOrPlatformId: event.target.value }))} placeholder="Player email or FT-000001" />
            <select className="form-input" value={walletForm.type} onChange={(event) => setWalletForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="CREDIT">Credit wallet</option>
              <option value="DEBIT">Debit wallet</option>
            </select>
            <input className="form-input" value={walletForm.amount} onChange={(event) => setWalletForm((current) => ({ ...current, amount: event.target.value }))} type="number" min="1" placeholder="Amount" />
            <input className="form-input" value={walletForm.adminName} onChange={(event) => setWalletForm((current) => ({ ...current, adminName: event.target.value }))} placeholder="Admin name optional" />
            <input className="form-input sm:col-span-2" value={walletForm.description} onChange={(event) => setWalletForm((current) => ({ ...current, description: event.target.value }))} placeholder="Reason / description" />
          </div>
          <button disabled={actionLoading === "wallet"} type="submit" className="mt-4 rounded-lg bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">Save Wallet Transaction</button>
          <div className="mt-4 grid gap-2">
            {wallets.slice(0, 5).map((wallet) => <div key={wallet.id} className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">{wallet.playerName} · {wallet.platformId ?? wallet.playerEmail} · <span className="font-black text-emerald-200">{wallet.currency} {wallet.balance.toLocaleString()}</span></div>)}
          </div>
        </form>

        <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Prize payouts</p>
          <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1">
            {tournaments.map((tournament) => (
              <article key={tournament.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-white">{tournament.title}</p>
                    <p className="mt-1 text-sm text-slate-300">Calculated prize pool: NGN {(tournament.calculatedPrizePool ?? 0).toLocaleString()}</p>
                    <p className={tournament.prizePayoutPaid ? "mt-1 text-sm font-bold text-emerald-200" : "mt-1 text-sm font-bold text-amber-200"}>{tournament.prizePayoutPaid ? "PAID" : "UNPAID"}</p>
                  </div>
                </div>
                <input className="form-input mt-3" value={payoutNotes[tournament.id] ?? ""} onChange={(event) => setPayoutNotes((current) => ({ ...current, [tournament.id]: event.target.value }))} placeholder="Payout note" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => markPrizePayout(tournament, true)} disabled={actionLoading === `payout-${tournament.id}`} type="button" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-300 hover:text-slate-950 disabled:opacity-50">Mark Paid</button>
                  <button onClick={() => markPrizePayout(tournament, false)} disabled={actionLoading === `payout-${tournament.id}`} type="button" className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100 hover:bg-amber-300 hover:text-slate-950 disabled:opacity-50">Mark Unpaid</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Wallet funding requests</p>
            <p className="mt-2 text-sm text-slate-300">Approve verified player deposits to credit wallets automatically. Rejected requests do not change wallet balance.</p>
          </div>
          <input className="form-input max-w-xs" value={fundingAdminName} onChange={(event) => setFundingAdminName(event.target.value)} placeholder="Admin name" />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {fundingRequests.length === 0 ? <div className="rounded-xl border border-white/10 bg-slate-950/50 p-6 text-center text-slate-400 lg:col-span-2">No wallet funding requests yet.</div> : fundingRequests.map((request) => (
            <article key={request.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-black text-white">{request.playerName}</p>
                  <p className="mt-1 text-xs text-slate-400">{request.platformId ?? request.playerEmail}</p>
                </div>
                <Badge text={request.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Amount" value={`${request.currency} ${request.amount.toLocaleString()}`} />
                <Info label="Method" value={request.paymentMethod} />
                <Info label="Sender" value={request.senderName} />
                <Info label="Credited" value={request.creditedTransactionId ? "Yes" : "No"} />
              </dl>
              {request.receiptUrl ? <a href={request.receiptUrl} target="_blank" className="mt-4 inline-block text-sm font-bold text-cyan-300 hover:text-white">View receipt</a> : null}
              <textarea className="form-input mt-4 min-h-24 resize-y" value={fundingNotes[request.id] ?? ""} onChange={(event) => setFundingNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Admin note" />
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => updateFundingRequest(request, "APPROVED")} disabled={actionLoading === `funding-${request.id}` || request.status === "APPROVED"} type="button" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-300 hover:text-slate-950 disabled:opacity-50">Approve and Credit</button>
                <button onClick={() => updateFundingRequest(request, "REJECTED")} disabled={actionLoading === `funding-${request.id}` || request.status === "APPROVED"} type="button" className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-100 hover:bg-rose-300 hover:text-slate-950 disabled:opacity-50">Reject</button>
              </div>
            </article>
          ))}
        </div>
      </section>

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
