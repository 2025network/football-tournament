"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AdminAction = {
  id: string;
  matchId: string;
  resultId: string | null;
  actionType: "MANUAL_WINNER" | "RESET_RESULT";
  adminName: string;
  reason: string;
  createdAt: string;
};

type PenaltyResult = {
  id: string;
  playerName: string;
  playerEmail: string;
  platformId: string | null;
  score: number;
  suddenDeathScore: number;
  totalShots: number;
  shots: unknown;
  suddenDeathShots: unknown;
  isWinner: boolean;
  matchId: string | null;
  tournamentTitle: string | null;
  homeName: string | null;
  awayName: string | null;
  winnerName: string | null;
  matchStatus: string | null;
  adminActions: AdminAction[];
  auditVersion?: number;
  createdAt: string;
};

type ActionFormState = Record<string, { reason: string }>;

const adminSessionKey = "football-tournament-admin-session";

export function PenaltyShootoutResultsAdmin() {
  const [results, setResults] = useState<PenaltyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [forms, setForms] = useState<ActionFormState>({});

  const loadResults = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/games/penalty-shootout", { cache: "no-store" });
      const data = (await response.json()) as { results?: PenaltyResult[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? "Failed to load penalty results.");
      setResults(data.results ?? []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load penalty results.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadResults();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadResults]);

  const filteredResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return results;
    return results.filter((result) => [result.playerName, result.playerEmail, result.platformId, result.tournamentTitle, result.matchId, result.winnerName].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [results, search]);

  const disputedResults = filteredResults.filter((result) => result.matchStatus === "DISPUTED");
  const otherResults = filteredResults.filter((result) => result.matchStatus !== "DISPUTED");
  const topScore = results.reduce((best, result) => Math.max(best, result.score + result.suddenDeathScore), 0);
  const suddenDeathResults = results.filter((result) => normalizeShots(result.suddenDeathShots).length > 0).length;

  function updateReason(resultId: string, reason: string) {
    setForms((current) => ({ ...current, [resultId]: { reason } }));
  }

  async function runAdminAction(result: PenaltyResult, actionType: AdminAction["actionType"]) {
    const reason = forms[result.id]?.reason?.trim() ?? "";
    if (!reason) {
      setError("Enter a reason before saving this admin action.");
      return;
    }

    setActionLoading(`${actionType}-${result.id}`);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/games/penalty-shootout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, resultId: result.id, adminName: readAdminName(), reason }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Admin action failed.");
      setSuccess(data.message ?? "Admin action saved.");
      setForms((current) => ({ ...current, [result.id]: { reason: "" } }));
      await loadResults();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Admin action failed.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total results" value={results.length.toString()} />
        <StatCard label="Disputed" value={results.filter((result) => result.matchStatus === "DISPUTED").length.toString()} />
        <StatCard label="Sudden death" value={suddenDeathResults.toString()} />
        <StatCard label="Best total" value={topScore.toString()} />
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20 sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">Penalty shootout results</h2>
            <p className="mt-1 text-sm text-slate-400">Disputed matches appear first with manual winner and reset controls.</p>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player, winner, tournament..." className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 md:max-w-sm" />
        </div>

        {loading ? <p className="mt-8 text-sm text-slate-300">Loading penalty shootout results...</p> : null}
        {success ? <p className="mt-6 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-200">{success}</p> : null}
        {error ? <p className="mt-6 rounded-lg border border-rose-300/20 bg-rose-300/10 p-4 text-sm font-bold text-rose-200">{error}</p> : null}

        {!loading && !error && filteredResults.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <p className="text-xl font-black text-white">No penalty results yet</p>
            <p className="mt-2 text-sm text-slate-400">When players complete the 5-shot penalty challenge, their scores will appear here.</p>
          </div>
        ) : null}

        {!loading && filteredResults.length > 0 ? (
          <div className="mt-8 grid gap-8">
            {disputedResults.length > 0 ? <ResultSection title="Disputed penalty matches" tone="disputed" results={disputedResults} forms={forms} actionLoading={actionLoading} onReasonChange={updateReason} onAction={runAdminAction} /> : null}
            <ResultSection title="All other penalty results" tone="normal" results={otherResults} forms={forms} actionLoading={actionLoading} onReasonChange={updateReason} onAction={runAdminAction} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ResultSection({ title, tone, results, forms, actionLoading, onReasonChange, onAction }: { title: string; tone: "disputed" | "normal"; results: PenaltyResult[]; forms: ActionFormState; actionLoading: string; onReasonChange: (resultId: string, reason: string) => void; onAction: (result: PenaltyResult, actionType: AdminAction["actionType"]) => void }) {
  if (results.length === 0) return null;
  return (
    <div className={`rounded-2xl border p-3 sm:p-4 ${tone === "disputed" ? "border-amber-300/25 bg-amber-300/5" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${tone === "disputed" ? "bg-amber-300/10 text-amber-100" : "bg-white/[0.04] text-slate-300"}`}>{results.length}</span>
      </div>
      <div className="grid gap-3">
        {results.map((result) => <ResultCard key={result.id} result={result} reason={forms[result.id]?.reason ?? ""} actionLoading={actionLoading} onReasonChange={onReasonChange} onAction={onAction} />)}
      </div>
    </div>
  );
}

function ResultCard({ result, reason, actionLoading, onReasonChange, onAction }: { result: PenaltyResult; reason: string; actionLoading: string; onReasonChange: (resultId: string, reason: string) => void; onAction: (result: PenaltyResult, actionType: AdminAction["actionType"]) => void }) {
  const isDisputed = result.matchStatus === "DISPUTED";
  return (
    <article className={`rounded-xl border p-4 ${isDisputed ? "border-amber-300/25 bg-slate-950/80" : "border-white/10 bg-slate-950/70"}`}>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PlayerCell result={result} />
            <div className="flex flex-wrap gap-2">
              <ScoreBadge text={`Normal ${result.score}/${result.totalShots}`} />
              <ScoreBadge text={`SD ${formatSuddenDeath(result)}`} subtle={normalizeShots(result.suddenDeathShots).length === 0} />
              <span className={`rounded-full px-3 py-1 text-xs font-black ${isDisputed ? "bg-amber-300/10 text-amber-100" : "bg-white/[0.04] text-slate-300"}`}>{result.matchStatus ?? "No match"}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            <p><span className="font-bold text-slate-500">Winner:</span> {result.isWinner ? result.playerName : result.winnerName ?? "Pending"}</p>
            <p><span className="font-bold text-slate-500">Tournament:</span> {result.tournamentTitle ?? "Practice session"}</p>
            <p><span className="font-bold text-slate-500">Match:</span> {formatMatch(result)}</p>
            <p><span className="font-bold text-slate-500">Date:</span> {formatDate(result.createdAt)}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ShotAuditDetails result={result} />
            <ActionLog actions={result.adminActions} />
          </div>
        </div>
        <AdminControls result={result} reason={reason} actionLoading={actionLoading} onReasonChange={onReasonChange} onAction={onAction} />
      </div>
    </article>
  );
}

function AdminControls({ result, reason, actionLoading, onReasonChange, onAction }: { result: PenaltyResult; reason: string; actionLoading: string; onReasonChange: (resultId: string, reason: string) => void; onAction: (result: PenaltyResult, actionType: AdminAction["actionType"]) => void }) {
  const isDisputed = result.matchStatus === "DISPUTED";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-black text-white">Admin dispute controls</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">Manual winner and reset actions are only available for disputed penalty matches. Completed non-disputed matches stay locked.</p>
      <textarea value={reason} onChange={(event) => onReasonChange(result.id, event.target.value)} disabled={!isDisputed} placeholder="Reason required before admin action" className="mt-4 min-h-24 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-50" />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <button type="button" disabled={!isDisputed || !reason.trim() || actionLoading === `MANUAL_WINNER-${result.id}`} onClick={() => onAction(result, "MANUAL_WINNER")} className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45">
          {actionLoading === `MANUAL_WINNER-${result.id}` ? "Saving..." : "Mark This Player Winner"}
        </button>
        <button type="button" disabled={!isDisputed || !reason.trim() || actionLoading === `RESET_RESULT-${result.id}`} onClick={() => onAction(result, "RESET_RESULT")} className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-2 text-sm font-black text-rose-100 transition hover:bg-rose-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45">
          {actionLoading === `RESET_RESULT-${result.id}` ? "Resetting..." : "Reset This Result"}
        </button>
      </div>
      {!isDisputed ? <p className="mt-3 text-xs font-bold text-slate-500">Locked because this match is not disputed.</p> : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-cyan-950/10"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{label}</p><p className="mt-3 text-3xl font-black text-white">{value}</p></div>;
}

function PlayerCell({ result }: { result: PenaltyResult }) {
  return <div><p className="font-black text-white">{result.playerName}</p><p className="text-xs text-slate-400">{result.playerEmail}</p>{result.platformId ? <p className="mt-1 text-xs font-bold text-cyan-300">{result.platformId}</p> : null}</div>;
}

function ScoreBadge({ text, subtle = false }: { text: string; subtle?: boolean }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${subtle ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"}`}>{text}</span>;
}

function ShotAuditDetails({ result }: { result: PenaltyResult }) {
  const normalShots = normalizeAuditShots(result.shots, "NORMAL");
  const suddenDeathShots = normalizeAuditShots(result.suddenDeathShots, "SUDDEN_DEATH");
  const allShots = [...normalShots, ...suddenDeathShots];
  return (
    <details className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
      <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-cyan-200">{allShots.length} shot audit rows</summary>
      <div className="mt-3 grid gap-2">
        {allShots.length === 0 ? <p className="text-xs text-slate-400">No shot audit data saved yet.</p> : allShots.map((shot) => (
          <div key={`${shot.roundType}-${shot.shotNumber}-${shot.roundNumber}`} className="rounded-lg bg-slate-950/70 p-3 text-xs text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-white">{shot.roundType === "SUDDEN_DEATH" ? "Sudden death" : "Normal"} round {shot.roundNumber}</p><span className={`rounded-full px-2 py-1 font-black ${shot.goal ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{shot.result}</span></div>
            <p className="mt-1">Shot: {formatDirection(shot.shotDirection)} | Keeper: {formatDirection(shot.keeperDirection)}</p>
            <p className="mt-1 text-slate-500">{shot.takenAt ? formatDate(shot.takenAt) : "Timestamp unavailable"}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function ActionLog({ actions }: { actions: AdminAction[] }) {
  return (
    <details className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
      <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-amber-200">{actions.length} admin actions</summary>
      <div className="mt-3 grid gap-2">
        {actions.length === 0 ? <p className="text-xs text-slate-400">No admin actions logged.</p> : actions.map((action) => (
          <div key={action.id} className="rounded-lg bg-slate-950/70 p-3 text-xs text-slate-300">
            <p className="font-black text-white">{action.actionType.replace("_", " ")}</p>
            <p className="mt-1">Admin: {action.adminName}</p>
            <p className="mt-1">Reason: {action.reason}</p>
            <p className="mt-1 text-slate-500">{formatDate(action.createdAt)}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

type AuditShot = { shotNumber: number; roundNumber: number; roundType: "NORMAL" | "SUDDEN_DEATH"; shotDirection: string; keeperDirection: string; result: "GOAL" | "SAVED"; goal: boolean; takenAt?: string };

function normalizeAuditShots(value: unknown, fallbackRoundType: AuditShot["roundType"]): AuditShot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const keeperDirection = record.keeperDirection ?? record.goalkeeperDirection;
    if (typeof record.shotDirection !== "string" || typeof keeperDirection !== "string" || typeof record.goal !== "boolean") return [];
    return [{ shotNumber: typeof record.shotNumber === "number" ? record.shotNumber : index + 1, roundNumber: typeof record.roundNumber === "number" ? record.roundNumber : index + 1, roundType: record.roundType === "SUDDEN_DEATH" ? "SUDDEN_DEATH" : fallbackRoundType, shotDirection: record.shotDirection, keeperDirection, result: record.result === "GOAL" || record.result === "SAVED" ? record.result : record.goal ? "GOAL" : "SAVED", goal: record.goal, takenAt: typeof record.takenAt === "string" ? record.takenAt : undefined }];
  });
}

function readAdminName() {
  if (typeof window === "undefined") return "Admin";
  const stored = sessionStorage.getItem(adminSessionKey);
  if (!stored) return "Admin";
  try {
    const session = JSON.parse(stored) as { adminEmail?: string };
    return session.adminEmail ?? "Admin";
  } catch {
    return "Admin";
  }
}

function formatSuddenDeath(result: PenaltyResult) {
  const rounds = normalizeShots(result.suddenDeathShots).length;
  return rounds > 0 ? `${result.suddenDeathScore}/${rounds}` : "Not needed";
}

function normalizeShots(value: unknown) { return Array.isArray(value) ? value : []; }
function formatMatch(result: PenaltyResult) { return result.matchId ? result.homeName && result.awayName ? `${result.homeName} vs ${result.awayName}` : result.matchId : "Not linked"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function formatDirection(value: string) { return value.toLowerCase(); }
