"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import type { PlayerSession } from "@/components/PlayerAuthGate";

type LatestPayment = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  reference: string | null;
  receiptUrl: string | null;
  status: string;
  adminNote: string | null;
};

type PlayerRegistration = {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  game: string;
  startDate: string;
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  registeredAt: string;
  entryFee: number;
  latestPayment: LatestPayment | null;
};

type PlayerRating = { seasonName: string; matchesPlayed: number; wins: number; losses: number; goalsScored: number; goalsConceded: number; currentRating: number; highestRating: number };
type WalletTransaction = { id: string; type: "CREDIT" | "DEBIT"; amount: number; balanceAfter: number; description: string; reference: string | null; createdAt: string };
type PlayerWallet = { balance: number; currency: string; transactions: WalletTransaction[] };
type WalletFundingRequest = {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  senderName: string;
  receiptUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
};

type PlayerStats = PlayerSession & {
  currentRank: number | null;
  totalPoints: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  favoriteGame: string;
  platformId: string;
  whatsapp: string;
  gamerTag: string;
  defaultGame: string;
  defaultGamePlayerId: string;
  rating: PlayerRating | null;
};

type PlayerAchievement = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  unlockedAt: string;
};

type RecentMatch = {
  id: string;
  tournamentTitle: string;
  round: number;
  groupName: string | null;
  score: string;
};

type PlayerDashboardResponse = {
  player: PlayerStats;
  wallet: PlayerWallet;
  walletFundingRequests: WalletFundingRequest[];
  achievements: PlayerAchievement[];
  recentMatches: RecentMatch[];
  registrations: PlayerRegistration[];
};

type PlayerDashboardProps = {
  player: PlayerSession;
  onLogout: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function statusClass(status: PlayerRegistration["paymentStatus"] | PlayerRegistration["approvalStatus"]) {
  if (status === "PAID" || status === "APPROVED") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "FAILED" || status === "REJECTED") {
    return "border-red-400/40 bg-red-500/10 text-red-200";
  }

  return "border-amber-400/40 bg-amber-400/10 text-amber-200";
}

export function PlayerDashboard({ player, onLogout }: PlayerDashboardProps) {
  const searchParams = useSearchParams();
  const welcomePlatformId = searchParams.get("welcomePlatformId") ?? "";
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [profile, setProfile] = useState<PlayerStats>({ ...player, platformId: player.platformId ?? "", whatsapp: player.whatsapp ?? "", gamerTag: player.gamerTag ?? "", defaultGame: player.defaultGame ?? "Not set", defaultGamePlayerId: player.defaultGamePlayerId ?? "", currentRank: null, totalPoints: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, tournamentsPlayed: 0, tournamentsWon: 0, favoriteGame: "Not set", rating: null });
  const [wallet, setWallet] = useState<PlayerWallet>({ balance: 0, currency: "NGN", transactions: [] });
  const [fundingRequests, setFundingRequests] = useState<WalletFundingRequest[]>([]);
  const [achievements, setAchievements] = useState<PlayerAchievement[]>([]);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [payingId, setPayingId] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch(`/api/player/dashboard?email=${encodeURIComponent(player.email)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as PlayerDashboardResponse & { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not load player dashboard.");
      }

      setProfile(data.player);
      setWallet(data.wallet);
      setFundingRequests(data.walletFundingRequests);
      setAchievements(data.achievements);
      setRecentMatches(data.recentMatches);
      setRegistrations(data.registrations);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load player dashboard.");
    } finally {
      setLoading(false);
    }
  }, [player.email]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const unpaidRegistrations = useMemo(() => registrations.filter((registration) => registration.entryFee > 0 && registration.paymentStatus !== "PAID"), [registrations]);
  const profileFields = [profile.fullName, profile.email, profile.platformId, profile.phone, profile.whatsapp, profile.gamerTag, profile.defaultGamePlayerId];
  const completedProfileFields = profileFields.filter((value) => String(value ?? "").trim().length > 0).length;
  const profileCompletion = Math.round((completedProfileFields / profileFields.length) * 100);

  async function payWithPaystack(registrationId: string) {
    setPayingId(registrationId);
    setErrorMessage("");

    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId }),
      });
      const data = (await response.json()) as { message?: string; authorization_url?: string };

      if (!response.ok || !data.authorization_url) {
        throw new Error(data.message ?? "Could not start Paystack payment.");
      }

      window.location.assign(data.authorization_url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not start payment.");
      setPayingId("");
    }
  }

  async function payWithWallet(registrationId: string) {
    setPayingId(registrationId);
    setErrorMessage("");

    try {
      const response = await fetch("/api/payments/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, email: player.email }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not pay from wallet.");
      await loadDashboard();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not pay from wallet.");
    } finally {
      setPayingId("");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Player dashboard</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Welcome, {profile.fullName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Track your registrations, ranking points, achievements, payments, match schedule, and notifications.</p>
          {welcomePlatformId ? <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-200">Your Platform ID is {welcomePlatformId}</div> : null}
        </div>
        <button onClick={onLogout} type="button" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:border-red-300 hover:bg-red-500/20">
          Logout
        </button>
      </div>

      <PlayerRatingCard rating={profile.rating} />
      <WalletCard wallet={wallet} />
      <WalletFundingPanel playerEmail={player.email} requests={fundingRequests} onRequestSubmitted={loadDashboard} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileCard label="Platform ID" value={profile.platformId || "Not generated"} highlight />
        <ProfileCard label="Profile completion" value={`${profileCompletion}%`} />
        <ProfileCard label="Current rank" value={profile.currentRank ? `#${profile.currentRank}` : "Unranked"} />
        <ProfileCard label="Total points" value={String(profile.totalPoints)} />
        <ProfileCard label="Wins / Draws / Losses" value={`${profile.totalWins} / ${profile.totalDraws} / ${profile.totalLosses}`} />
        <ProfileCard label="Trophies" value={String(profile.tournamentsWon)} />
        <ProfileCard label="Name" value={profile.fullName} />
        <ProfileCard label="Email" value={profile.email} />
        <ProfileCard label="Phone" value={profile.phone || "Not provided"} />
        <ProfileCard label="WhatsApp" value={profile.whatsapp || "Not provided"} />
        <ProfileCard label="Default football ID" value={profile.defaultGamePlayerId || "Not set"} />
        <ProfileCard label="Favorite football category" value={profile.favoriteGame} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ActionCard title="Unpaid registrations" value={String(unpaidRegistrations.length)} href="#my-tournaments" />
        <ActionCard title="Upcoming matches" value="View schedule" href="/player/matches" />
        <ActionCard title="Notifications" value="Open inbox" href="/player/notifications" />
        <ActionCard title="Practice penalties" value="Training mode" href="/games/penalty-shootout/training" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-2xl font-black text-white">Achievements</h2>
          {achievements.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Win matches to unlock achievements.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <p className="font-black text-cyan-100">{achievement.icon ?? "ACH"} {achievement.name}</p>
                  <p className="mt-1 text-sm text-slate-300">{achievement.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-2xl font-black text-white">Recent Matches</h2>
          {recentMatches.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Completed matches will appear here.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {recentMatches.map((match) => (
                <div key={match.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="font-black text-white">{match.tournamentTitle}</p>
                  <p className="mt-1 text-sm text-slate-400">Round {match.round}{match.groupName ? ` - ${match.groupName}` : ""}</p>
                  <p className="mt-2 font-black text-cyan-100">{match.score}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {errorMessage ? (
        <div className="mt-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</div>
      ) : null}

      <div id="my-tournaments" className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black text-white">My Tournaments</h2>
          <Link href="/tournaments" className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/20">
            View Tournaments
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300">Loading your registrations...</div>
        ) : registrations.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-xl font-black text-white">No registrations yet</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">Register for a tournament and it will appear here with payment and approval updates.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {registrations.map((registration) => (
              <article key={registration.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(registration.paymentStatus)}`}>{registration.paymentStatus}</span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(registration.approvalStatus)}`}>{registration.approvalStatus}</span>
                </div>
                <h3 className="mt-4 text-xl font-black text-white">{registration.tournamentTitle}</h3>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Football category" value={registration.game} />
                  <Info label="Start date" value={formatDate(registration.startDate)} />
                  <Info label="Registered" value={formatDate(registration.registeredAt)} />
                  <Info label="Tournament ID" value={registration.tournamentId} />
                  <Info label="Entry fee" value={registration.entryFee > 0 ? `NGN ${registration.entryFee.toLocaleString()}` : "Free"} />
                  <Info label="Latest payment" value={registration.latestPayment ? `${registration.latestPayment.method} - ${registration.latestPayment.status}` : "No payment yet"} />
                </dl>

                {registration.latestPayment?.receiptUrl ? <a href={registration.latestPayment.receiptUrl} target="_blank" className="mt-4 inline-block text-sm font-bold text-cyan-300 hover:text-white">View receipt</a> : null}
                {registration.latestPayment?.reference ? <p className="mt-3 text-xs text-slate-500">Reference: {registration.latestPayment.reference}</p> : null}

                {registration.entryFee > 0 && registration.paymentStatus !== "PAID" ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <button onClick={() => payWithPaystack(registration.id)} disabled={payingId === registration.id} type="button" className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">
                      {payingId === registration.id ? "Starting..." : "Pay with Paystack"}
                    </button>
                    <button onClick={() => payWithWallet(registration.id)} disabled={payingId === registration.id || wallet.balance < registration.entryFee} type="button" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950 disabled:opacity-50">
                      Pay from Wallet
                    </button>
                    <Link href={`/player/payments/bank-transfer?registrationId=${registration.id}`} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950">
                      Pay by Bank Transfer
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


function PlayerRatingCard({ rating }: { rating: PlayerRating | null }) {
  const wins = rating?.wins ?? 0;
  const matchesPlayed = rating?.matchesPlayed ?? 0;
  const winPercentage = matchesPlayed === 0 ? "0%" : `${Math.round((wins / matchesPlayed) * 100)}%`;
  return (
    <section className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Current season rating</p>
          <p className="mt-2 text-4xl font-black text-white">{rating?.currentRating ?? 1000}</p>
          <p className="mt-1 text-sm text-slate-300">{rating?.seasonName ?? "No active season rating yet"} · Highest rating: {rating?.highestRating ?? 1000}</p>
        </div>
        <Link href="/leaderboard" className="rounded-lg border border-cyan-300/30 bg-slate-950/40 px-4 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950">View Leaderboard</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        <Info label="Played" value={String(matchesPlayed)} />
        <Info label="Wins" value={String(wins)} />
        <Info label="Losses" value={String(rating?.losses ?? 0)} />
        <Info label="Win %" value={winPercentage} />
        <Info label="Goals" value={`${rating?.goalsScored ?? 0} / ${rating?.goalsConceded ?? 0}`} />
      </div>
    </section>
  );
}

function WalletCard({ wallet }: { wallet: PlayerWallet }) {
  return (
    <section className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5 shadow-[0_0_35px_rgba(16,185,129,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Player wallet</p>
          <p className="mt-2 text-4xl font-black text-white">{wallet.currency} {wallet.balance.toLocaleString()}</p>
          <p className="mt-1 text-sm text-slate-300">Use wallet balance to pay tournament entry fees.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        {wallet.transactions.length === 0 ? <p className="text-sm text-slate-400">No wallet transactions yet.</p> : wallet.transactions.slice(0, 5).map((transaction) => (
          <div key={transaction.id} className="flex flex-col gap-1 rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className={transaction.type === "CREDIT" ? "font-bold text-emerald-200" : "font-bold text-amber-200"}>{transaction.type} {wallet.currency} {transaction.amount.toLocaleString()}</span>
            <span className="text-slate-300">{transaction.description}</span>
            <span className="text-xs text-slate-500">Balance: {wallet.currency} {transaction.balanceAfter.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WalletFundingPanel({ playerEmail, requests, onRequestSubmitted }: { playerEmail: string; requests: WalletFundingRequest[]; onRequestSubmitted: () => Promise<void> }) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [senderName, setSenderName] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitFundingRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("email", playerEmail);
      formData.append("amount", amount);
      formData.append("paymentMethod", paymentMethod);
      formData.append("senderName", senderName);
      if (receipt) formData.append("receipt", receipt);

      const response = await fetch("/api/wallet/funding-requests", {
        method: "POST",
        body: formData,
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not submit funding request.");

      setMessage(data.message ?? "Funding request submitted.");
      setAmount("");
      setPaymentMethod("Bank Transfer");
      setSenderName("");
      setReceipt(null);
      const fileInput = event.currentTarget.elements.namedItem("receipt") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      await onRequestSubmitted();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not submit funding request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)]">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submitFundingRequest}>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Fund wallet</p>
          <h2 className="mt-2 text-2xl font-black text-white">Submit Funding Request</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Upload proof after paying by bank transfer or another supported method. Admin approval will credit your wallet automatically.</p>

          {message ? <div className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-200">{message}</div> : null}
          {error ? <div className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div> : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="form-input" value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" placeholder="Amount" />
            <select className="form-input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option>Bank Transfer</option>
              <option>Paystack Transfer</option>
              <option>Cash Deposit</option>
              <option>Other</option>
            </select>
            <input className="form-input sm:col-span-2" value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Sender name on payment" />
            <input name="receipt" className="form-input sm:col-span-2" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" />
          </div>

          <button disabled={loading} type="submit" className="mt-4 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">
            {loading ? "Submitting..." : "Submit Funding Request"}
          </button>
        </form>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Funding request status</p>
          <div className="mt-4 grid max-h-96 gap-3 overflow-y-auto pr-1">
            {requests.length === 0 ? <p className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">No wallet funding requests yet.</p> : requests.map((request) => (
              <article key={request.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-white">{request.currency} {request.amount.toLocaleString()}</p>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(request.status)}`}>{request.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{request.paymentMethod} by {request.senderName}</p>
                <p className="mt-1 text-xs text-slate-500">Submitted {formatDate(request.createdAt)}</p>
                {request.receiptUrl ? <a href={request.receiptUrl} target="_blank" className="mt-3 inline-block text-sm font-bold text-cyan-300 hover:text-white">View receipt</a> : null}
                {request.adminNote ? <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">Admin note: {request.adminNote}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
function ProfileCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-3 break-words text-lg font-black ${highlight ? "text-cyan-200" : "text-white"}`}>{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-200">{value}</dd>
    </div>
  );
}

function ActionCard({ title, value, href }: { title: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-5 transition hover:-translate-y-1 hover:border-cyan-300 hover:bg-cyan-300/15">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{title}</p>
      <p className="mt-3 text-lg font-black text-white">{value}</p>
    </Link>
  );
}


