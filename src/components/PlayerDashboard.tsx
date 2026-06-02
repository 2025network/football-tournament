"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

type PlayerStats = PlayerSession & {
  currentRank: number | null;
  totalPoints: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  favoriteGame: string;
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
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [profile, setProfile] = useState<PlayerStats>({ ...player, currentRank: null, totalPoints: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, tournamentsPlayed: 0, tournamentsWon: 0, favoriteGame: "Not set" });
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

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Player dashboard</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Welcome, {profile.fullName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Track your registrations, ranking points, achievements, payments, and match history.</p>
        </div>
        <button onClick={onLogout} type="button" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:border-red-300 hover:bg-red-500/20">
          Logout
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileCard label="Current rank" value={profile.currentRank ? `#${profile.currentRank}` : "Unranked"} />
        <ProfileCard label="Total points" value={String(profile.totalPoints)} />
        <ProfileCard label="Wins / Draws / Losses" value={`${profile.totalWins} / ${profile.totalDraws} / ${profile.totalLosses}`} />
        <ProfileCard label="Trophies" value={String(profile.tournamentsWon)} />
        <ProfileCard label="Name" value={profile.fullName} />
        <ProfileCard label="Email" value={profile.email} />
        <ProfileCard label="Phone" value={profile.phone || "Not provided"} />
        <ProfileCard label="Favorite game" value={profile.favoriteGame} />
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

      <div className="mt-8">
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
                  <Info label="Game" value={registration.game} />
                  <Info label="Start date" value={formatDate(registration.startDate)} />
                  <Info label="Registered" value={formatDate(registration.registeredAt)} />
                  <Info label="Tournament ID" value={registration.tournamentId} />
                  <Info label="Entry fee" value={registration.entryFee > 0 ? `NGN ${registration.entryFee.toLocaleString()}` : "Free"} />
                  <Info label="Latest payment" value={registration.latestPayment ? `${registration.latestPayment.method} - ${registration.latestPayment.status}` : "No payment yet"} />
                </dl>

                {registration.latestPayment?.receiptUrl ? <a href={registration.latestPayment.receiptUrl} target="_blank" className="mt-4 inline-block text-sm font-bold text-cyan-300 hover:text-white">View receipt</a> : null}
                {registration.latestPayment?.reference ? <p className="mt-3 text-xs text-slate-500">Reference: {registration.latestPayment.reference}</p> : null}

                {registration.entryFee > 0 && registration.paymentStatus !== "PAID" ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button onClick={() => payWithPaystack(registration.id)} disabled={payingId === registration.id} type="button" className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">
                      {payingId === registration.id ? "Starting..." : "Pay with Paystack"}
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

function ProfileCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-3 break-words text-lg font-black text-white">{value}</p>
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
