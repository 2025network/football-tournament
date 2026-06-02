"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MatchLiveStatus } from "@/generated/prisma/client";

type PlayerSession = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
};

type RefereeMatch = {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  game: string;
  round: number;
  groupName: string | null;
  status: "PENDING" | "COMPLETED" | "DISPUTED";
  liveStatus: MatchLiveStatus;
  scheduledAt: string | null;
  legNumber: number | null;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  liveHomeScore: number;
  liveAwayScore: number;
  livePlayerOneScore: number;
  livePlayerTwoScore: number;
  liveStartedAt: string | null;
  liveEndedAt: string | null;
};

type RefereeMatchesResponse = {
  message?: string;
  referee?: { id: string; fullName: string; email: string };
  matches?: RefereeMatch[];
};

type ScoreState = Record<string, { liveHomeScore: string; liveAwayScore: string; livePlayerOneScore: string; livePlayerTwoScore: string }>;

const playerSessionKey = "football-tournament-player-session";

function readPlayerSession() {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem(playerSessionKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as PlayerSession;
  } catch {
    sessionStorage.removeItem(playerSessionKey);
    return null;
  }
}

export function RefereeMatchesManager() {
  const [player, setPlayer] = useState<PlayerSession | null>(() => readPlayerSession());
  const [matches, setMatches] = useState<RefereeMatch[]>([]);
  const [scores, setScores] = useState<ScoreState>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadMatches = useCallback(async () => {
    const session = readPlayerSession();
    setPlayer(session);

    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/referee/matches?email=${encodeURIComponent(session.email)}`, { cache: "no-store" });
      const data = (await response.json()) as RefereeMatchesResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Could not load referee matches.");
      }

      setMatches(data.matches ?? []);
      setScores((current) => buildScoreState(data.matches ?? [], current));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load referee matches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMatches();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMatches]);

  function updateScore(matchId: string, field: keyof ScoreState[string], value: string) {
    setScores((current) => ({
      ...current,
      [matchId]: {
        liveHomeScore: current[matchId]?.liveHomeScore ?? "0",
        liveAwayScore: current[matchId]?.liveAwayScore ?? "0",
        livePlayerOneScore: current[matchId]?.livePlayerOneScore ?? "0",
        livePlayerTwoScore: current[matchId]?.livePlayerTwoScore ?? "0",
        [field]: value,
      },
    }));
  }

  async function saveLiveScore(match: RefereeMatch, liveStatus: MatchLiveStatus) {
    const score = scores[match.id];
    const liveHomeScore = Number(score?.liveHomeScore ?? 0);
    const liveAwayScore = Number(score?.liveAwayScore ?? 0);
    const livePlayerOneScore = Number(score?.livePlayerOneScore ?? liveHomeScore);
    const livePlayerTwoScore = Number(score?.livePlayerTwoScore ?? liveAwayScore);

    if ([liveHomeScore, liveAwayScore, livePlayerOneScore, livePlayerTwoScore].some((value) => !Number.isInteger(value) || value < 0)) {
      setErrorMessage("Live scores must be zero or positive whole numbers.");
      return;
    }

    setActionLoading(`live-${match.id}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/matches/${match.id}/live-score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveStatus, liveHomeScore, liveAwayScore, livePlayerOneScore, livePlayerTwoScore }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not update live score.");
      }

      setSuccessMessage(data.message ?? "Live score updated.");
      await loadMatches();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update live score.");
    } finally {
      setActionLoading("");
    }
  }

  async function finalizeLiveResult(match: RefereeMatch) {
    setActionLoading(`finalize-${match.id}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/matches/${match.id}/finalize-live-result`, { method: "PUT" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not finalize live result.");
      }

      setSuccessMessage(data.message ?? "Live result finalized.");
      await loadMatches();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not finalize live result.");
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl px-5 py-12 text-slate-300 lg:px-8">Loading referee matches...</section>;
  }

  if (!player) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16 text-center lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 shadow-2xl shadow-cyan-950/20">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Referee access</p>
          <h1 className="mt-3 text-3xl font-black text-white">Login first</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Use the player/admin account email that was assigned as referee by admin.</p>
          <Link href="/login" className="mt-6 inline-block rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white">Login</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="border-b border-white/10 pb-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Referee live scoring</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Assigned Matches</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Update live scores during play, pause matches when needed, and finalize official results after full time.</p>
      </div>

      {successMessage ? <Message tone="success" text={successMessage} /> : null}
      {errorMessage ? <Message tone="error" text={errorMessage} /> : null}

      <div className="mt-8 grid gap-5">
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center text-slate-400">No matches have been assigned to {player.email} yet.</div>
        ) : matches.map((match) => (
          <article key={match.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/10 sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{match.tournamentTitle}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{match.homeName} vs {match.awayName}</h2>
                <p className="mt-2 text-sm text-slate-400">Round {match.round}{match.groupName ? ` - ${match.groupName}` : ""}{match.legNumber ? ` - Leg ${match.legNumber}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className={`rounded-full border px-3 py-1 ${match.liveStatus === MatchLiveStatus.LIVE ? "border-red-300/30 bg-red-500/10 text-red-100" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>{match.liveStatus}</span>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100">{match.status}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat label="Scheduled" value={match.scheduledAt ? formatDate(match.scheduledAt) : "Not scheduled"} />
              <Stat label="Live score" value={`${match.liveHomeScore} : ${match.liveAwayScore}`} highlight />
              <Stat label="Official score" value={`${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}`} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <ScoreInput label="Home score" value={scores[match.id]?.liveHomeScore ?? "0"} onChange={(value) => updateScore(match.id, "liveHomeScore", value)} />
              <ScoreInput label="Away score" value={scores[match.id]?.liveAwayScore ?? "0"} onChange={(value) => updateScore(match.id, "liveAwayScore", value)} />
              <button onClick={() => saveLiveScore(match, MatchLiveStatus.LIVE)} disabled={actionLoading === `live-${match.id}`} type="button" className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">Start / Update</button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => saveLiveScore(match, MatchLiveStatus.PAUSED)} disabled={actionLoading === `live-${match.id}`} type="button" className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-300 hover:text-slate-950 disabled:opacity-50">Pause Match</button>
              <button onClick={() => finalizeLiveResult(match)} disabled={actionLoading === `finalize-${match.id}`} type="button" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950 disabled:opacity-50">Finalize Result</button>
              <Link href={`/tournaments/${match.tournamentId}`} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:border-cyan-300 hover:text-cyan-200">View Public Page</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildScoreState(matches: RefereeMatch[], current: ScoreState) {
  return matches.reduce<ScoreState>((next, match) => {
    next[match.id] = {
      liveHomeScore: current[match.id]?.liveHomeScore ?? String(match.liveHomeScore),
      liveAwayScore: current[match.id]?.liveAwayScore ?? String(match.liveAwayScore),
      livePlayerOneScore: current[match.id]?.livePlayerOneScore ?? String(match.livePlayerOneScore),
      livePlayerTwoScore: current[match.id]?.livePlayerTwoScore ?? String(match.livePlayerTwoScore),
    };
    return next;
  }, {});
}

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</span><input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} type="number" min="0" placeholder="0" /></label>;
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p><p className={`mt-2 text-xl font-black ${highlight ? "text-cyan-300" : "text-white"}`}>{value}</p></div>;
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  const className = tone === "success" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-rose-300/30 bg-rose-300/10 text-rose-200";
  return <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${className}`}>{text}</div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
