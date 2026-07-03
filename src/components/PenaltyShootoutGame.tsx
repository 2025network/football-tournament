"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Direction = "LEFT" | "CENTER" | "RIGHT";

type PlayerSession = {
  id: string;
  fullName: string;
  email: string;
  platformId?: string;
  phone?: string;
  gamerTag?: string;
};

type Shot = {
  shotNumber: number;
  shotDirection: Direction;
  keeperDirection: Direction;
  goal: boolean;
};

type SavedPenaltyResult = {
  id: string;
  score: number;
  suddenDeathScore: number;
  totalShots: number;
  matchId: string | null;
  shots: unknown;
  suddenDeathShots: unknown;
  isWinner: boolean;
  createdAt: string;
  updatedAt: string;
};

type TrainingStats = {
  bestScore: number;
  totalAttempts: number;
  latestAttempt: { id: string; score: number; totalShots: number; shots: unknown; createdAt: string } | null;
};

type PenaltyMatchState = {
  matchStatus: "PENDING" | "COMPLETED" | "DISPUTED";
  suddenDeathRequired: boolean;
  completed: boolean;
  winnerName: string | null;
  canTakeSuddenDeathShot: boolean;
  waitingForOpponent: boolean;
  currentSuddenDeathRounds: number;
  opponentSuddenDeathRounds: number;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type AnimationState = { shot: Direction; keeper: Direction; goal: boolean; nonce: number } | null;

const playerSessionKey = "football-tournament-player-session";
const directions: { value: Direction; label: string; hint: string }[] = [
  { value: "LEFT", label: "Left", hint: "Aim low and wide" },
  { value: "CENTER", label: "Center", hint: "Power through middle" },
  { value: "RIGHT", label: "Right", hint: "Bend it far post" },
];

export function PenaltyShootoutGame({ trainingMode = false }: { trainingMode?: boolean }) {
  const searchParams = useSearchParams();
  const matchId = trainingMode ? null : searchParams.get("matchId")?.trim() || null;
  const [player] = useState<PlayerSession | null>(() => readPlayerSession());
  const [normalShots, setNormalShots] = useState<Shot[]>([]);
  const [existingResult, setExistingResult] = useState<SavedPenaltyResult | null>(null);
  const [penaltyMatch, setPenaltyMatch] = useState<PenaltyMatchState | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(Boolean(matchId));
  const [trainingStats, setTrainingStats] = useState<TrainingStats>({ bestScore: 0, totalAttempts: 0, latestAttempt: null });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [animation, setAnimation] = useState<AnimationState>(null);

  const savedNormalShots = existingResult ? normalizeSavedShots(existingResult.shots) : [];
  const savedSuddenDeathShots = existingResult ? normalizeSavedShots(existingResult.suddenDeathShots) : [];
  const displayedNormalShots = existingResult ? savedNormalShots : normalShots;
  const allDisplayedShots = [...displayedNormalShots, ...savedSuddenDeathShots];
  const normalScore = existingResult?.score ?? normalShots.filter((shot) => shot.goal).length;
  const suddenDeathScore = existingResult?.suddenDeathScore ?? 0;
  const opponentScore = getOpponentScore(penaltyMatch, existingResult);
  const shotsLeft = 5 - normalShots.length;
  const normalComplete = normalShots.length === 5 || existingResult !== null;
  const roundStatus = getRoundStatus({ existingResult, penaltyMatch, shotsLeft, normalComplete });
  const canShootNormal = Boolean(player) && !loadingExisting && !existingResult && normalShots.length < 5 && saveState !== "saving" && saveState !== "saved";
  const canShootSuddenDeath = Boolean(player && matchId && existingResult && penaltyMatch?.suddenDeathRequired && penaltyMatch.canTakeSuddenDeathShot && !penaltyMatch.completed && saveState !== "saving");
  const activeMode = canShootSuddenDeath ? "SUDDEN_DEATH" : "NORMAL";

  const loadExistingResult = useCallback(async () => {
    if (!player) {
      setLoadingExisting(false);
      return;
    }

    if (trainingMode) {
      setLoadingExisting(true);
      setLoadError("");

      try {
        const response = await fetch(`/api/games/penalty-shootout/training?email=${encodeURIComponent(player.email)}`, { cache: "no-store" });
        const data = (await response.json()) as { stats?: TrainingStats; message?: string };
        if (!response.ok) throw new Error(data.message ?? "Could not load training stats.");
        setTrainingStats(data.stats ?? { bestScore: 0, totalAttempts: 0, latestAttempt: null });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load training stats.");
      } finally {
        setLoadingExisting(false);
      }
      return;
    }

    if (!matchId) {
      setLoadingExisting(false);
      return;
    }

    setLoadingExisting(true);
    setLoadError("");

    try {
      const response = await fetch(`/api/games/penalty-shootout?email=${encodeURIComponent(player.email)}&matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" });
      const data = (await response.json()) as { result?: SavedPenaltyResult | null; penaltyMatch?: PenaltyMatchState | null; message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not check your saved penalty score.");

      setExistingResult(data.result ?? null);
      setPenaltyMatch(data.penaltyMatch ?? null);
      if (data.result && data.penaltyMatch?.suddenDeathRequired && !data.penaltyMatch.completed) {
        setMessage(data.penaltyMatch.canTakeSuddenDeathShot ? "Normal round is tied. Take your sudden death shot." : "Normal round is tied. Waiting for opponent in sudden death.");
      } else if (data.result) {
        setMessage("You have already played this match penalty shootout. Your saved score is shown below.");
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not check your saved penalty score.");
    } finally {
      setLoadingExisting(false);
    }
  }, [matchId, player, trainingMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadExistingResult();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadExistingResult]);

  async function takeNormalShot(direction: Direction) {
    if (!canShootNormal) return;

    const keeperDirection = randomDirection();
    const nextShot: Shot = {
      shotNumber: normalShots.length + 1,
      shotDirection: direction,
      keeperDirection,
      goal: direction !== keeperDirection,
    };
    setAnimation({ shot: direction, keeper: keeperDirection, goal: nextShot.goal, nonce: nextShot.shotNumber });
    const nextShots = [...normalShots, nextShot];
    setNormalShots(nextShots);

    if (nextShots.length === 5) await saveNormalResult(nextShots);
  }

  async function takeSuddenDeathShot(direction: Direction) {
    if (!canShootSuddenDeath || !player || !matchId) return;

    const keeperDirection = randomDirection();
    const shot: Shot = {
      shotNumber: savedSuddenDeathShots.length + 1,
      shotDirection: direction,
      keeperDirection,
      goal: direction !== keeperDirection,
    };
    setAnimation({ shot: direction, keeper: keeperDirection, goal: shot.goal, nonce: 100 + shot.shotNumber });

    setSaveState("saving");
    setMessage("Saving sudden death shot...");
    setLoadError("");

    try {
      const response = await fetch("/api/games/penalty-shootout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: player.email, matchId, mode: "SUDDEN_DEATH", suddenDeathShot: shot }),
      });
      const data = (await response.json()) as { message?: string; result?: SavedPenaltyResult; penaltyMatch?: PenaltyMatchState | null };
      if (!response.ok) throw new Error(data.message ?? "Failed to save sudden death shot.");

      if (data.result) setExistingResult(data.result);
      setPenaltyMatch(data.penaltyMatch ?? null);
      setSaveState("saved");
      setMessage(data.message ?? "Sudden death shot saved.");
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Failed to save sudden death shot.");
      await loadExistingResult();
    }
  }

  async function saveNormalResult(finalShots: Shot[]) {
    if (!player || saveState === "saving" || saveState === "saved" || existingResult) return;

    setSaveState("saving");
    setMessage("Saving your penalty score...");
    setLoadError("");

    try {
      if (trainingMode) {
        const response = await fetch("/api/games/penalty-shootout/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: player.email, shots: finalShots }),
        });
        const data = (await response.json()) as { message?: string; stats?: TrainingStats };
        if (!response.ok) throw new Error(data.message ?? "Failed to save training score.");

        setTrainingStats(data.stats ?? trainingStats);
        setSaveState("saved");
        setMessage(data.message ?? "Training score saved.");
        return;
      }

      const response = await fetch("/api/games/penalty-shootout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: player.email, matchId, mode: "NORMAL", shots: finalShots }),
      });
      const data = (await response.json()) as { message?: string; result?: SavedPenaltyResult; penaltyMatch?: PenaltyMatchState | null };
      if (!response.ok) throw new Error(data.message ?? "Failed to save score.");

      if (data.result) setExistingResult({ ...data.result, shots: finalShots });
      setPenaltyMatch(data.penaltyMatch ?? null);
      setSaveState("saved");
      setMessage(data.message ?? "Penalty score saved.");
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Failed to save score.");
      if (matchId) await loadExistingResult();
    }
  }

  function resetPracticeGame() {
    if (!trainingMode && (matchId || existingResult)) return;
    setNormalShots([]);
    setAnimation(null);
    setSaveState("idle");
    setMessage("");
  }

  if (!player) {
    return (
      <GameShell>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl shadow-cyan-950/20 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Player login required</p>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-5xl">Login before playing.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300">{trainingMode ? "Practice scores are saved only as training stats. They do not affect tournaments, ratings, or achievements." : "Penalty shootout scores are saved to your AfriKick account and can be connected to your tournament match."}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-white">Login</Link>
            <Link href="/signup" className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:border-cyan-300 hover:text-cyan-200">Create Account</Link>
          </div>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-cyan-950/20">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_36%),rgba(15,23,42,0.92)] p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">{trainingMode ? "Penalty training" : "Penalty shootout"}</p>
                <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">{trainingMode ? "Practice your finish." : "Take the shot."}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{trainingMode ? "Take unlimited 5-shot practice rounds. Training scores never affect tournament results, ratings, or achievements." : "Five normal penalties decide the match. A tie opens sudden death, one shot each until someone breaks."}</p>
              </div>
              <button type="button" onClick={() => setSoundEnabled((current) => !current)} className={`w-fit rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-wide transition ${soundEnabled ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300 hover:text-cyan-100"}`}>
                Sound {soundEnabled ? "On" : "Off"}
              </button>
            </div>

            {!trainingMode && loadingExisting ? <StatusBox tone="info" text="Checking if you already played this match..." /> : null}
            {trainingMode && loadingExisting ? <StatusBox tone="info" text="Loading your training stats..." /> : null}
            {loadError ? <StatusBox tone="error" text={loadError} /> : null}
            {trainingMode ? <StatusBox tone="success" text={`Best training score: ${trainingStats.bestScore}/5. Total attempts: ${trainingStats.totalAttempts}.`} /> : null}
            {penaltyMatch?.completed ? <StatusBox tone="success" text={`Penalty shootout completed. Winner: ${penaltyMatch.winnerName ?? "decided"}.`} /> : null}
            {penaltyMatch?.suddenDeathRequired && !penaltyMatch.completed ? <StatusBox tone="info" text={penaltyMatch.waitingForOpponent ? "Sudden death round saved. Waiting for opponent." : "Sudden death required. Take one extra shot."} /> : null}
          </div>

          <Scoreboard playerName={player.gamerTag || player.fullName} playerScore={normalScore + suddenDeathScore} opponentScore={opponentScore} roundStatus={roundStatus} mode={activeMode} />
          <Pitch animation={animation} canShoot={canShootNormal || canShootSuddenDeath} />

          <div className="grid gap-4 border-t border-white/10 bg-slate-950/70 p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <DirectionButtons disabled={!canShootNormal && !canShootSuddenDeath} onChoose={canShootSuddenDeath ? takeSuddenDeathShot : takeNormalShot} mode={activeMode} />
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              {matchId && (penaltyMatch?.completed || existingResult) ? <Link href="/player/matches" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950">Back to My Matches</Link> : null}
              {trainingMode && normalComplete ? <Link href="/player/dashboard" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950">Back to Dashboard</Link> : null}
              {!matchId && normalComplete && !existingResult ? <button type="button" onClick={resetPracticeGame} disabled={saveState === "saving"} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-45">Play Again</button> : null}
            </div>
          </div>

          {message ? <p className={`border-t border-white/10 px-4 py-3 text-sm font-bold sm:px-6 ${saveState === "error" ? "text-rose-300" : "text-cyan-200"}`}>{message}</p> : null}
        </div>

        <aside className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-cyan-950/20 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">Player</p>
              <h2 className="mt-2 text-2xl font-black text-white">{player.gamerTag || player.fullName}</h2>
              <p className="mt-1 text-sm text-slate-400">{player.platformId ?? "Platform ID pending"}</p>
            </div>
            {matchId ? <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-200">Match linked</span> : <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-slate-300">{trainingMode ? "Training" : "Practice"}</span>}
          </div>

          {trainingMode ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ScoreCard label="Best score" value={`${trainingStats.bestScore}/5`} accent="cyan" />
              <ScoreCard label="Attempts" value={String(trainingStats.totalAttempts)} accent="slate" />
            </div>
          ) : null}

          <ShotHistory shots={allDisplayedShots} normalShots={displayedNormalShots} suddenDeathShots={savedSuddenDeathShots} />
        </aside>
      </section>
    </GameShell>
  );
}

function Scoreboard({ playerName, playerScore, opponentScore, roundStatus, mode }: { playerName: string; playerScore: number; opponentScore: number | null; roundStatus: string; mode: "NORMAL" | "SUDDEN_DEATH" }) {
  return (
    <div className="grid gap-3 border-b border-white/10 bg-slate-950/70 p-4 sm:grid-cols-3 sm:p-6">
      <ScoreCard label={playerName} value={playerScore.toString()} accent="cyan" />
      <ScoreCard label="Opponent" value={opponentScore === null ? "-" : opponentScore.toString()} accent="slate" />
      <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Round status</p>
        <p className="mt-2 text-lg font-black text-white">{roundStatus}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-100">{mode === "SUDDEN_DEATH" ? "Sudden death" : "Normal round"}</p>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, accent }: { label: string; value: string; accent: "cyan" | "slate" }) {
  const className = accent === "cyan" ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-200";
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <p className="truncate text-xs font-black uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-4xl font-black text-white">{value}</p>
    </div>
  );
}

function Pitch({ animation, canShoot }: { animation: AnimationState; canShoot: boolean }) {
  return (
    <div className="relative overflow-hidden bg-emerald-950 px-3 py-4 sm:px-6 sm:py-6">
      <div className="relative mx-auto aspect-[9/11] max-h-[620px] min-h-[430px] w-full max-w-3xl overflow-hidden rounded-2xl border border-emerald-200/25 bg-[linear-gradient(90deg,rgba(16,185,129,0.14)_50%,rgba(5,150,105,0.18)_50%),linear-gradient(180deg,#064e3b,#065f46_45%,#022c22)] bg-[length:72px_72px,100%_100%] shadow-inner shadow-emerald-950 sm:aspect-[16/10] sm:min-h-[440px]">
        <div className="absolute inset-4 rounded-xl border-2 border-white/20" />
        <div className="absolute left-1/2 top-[56%] h-28 w-28 -translate-x-1/2 rounded-full border-2 border-white/20 sm:h-36 sm:w-36" />
        <div className="absolute left-1/2 top-0 h-24 w-[78%] -translate-x-1/2 rounded-b-3xl border-x-2 border-b-2 border-white/25 sm:h-32 sm:w-[62%]" />
        <GoalPost />
        <Goalkeeper animation={animation} />
        <Ball animation={animation} />
        <div className="absolute bottom-6 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.8)]" />
        <div className="absolute bottom-3 left-1/2 w-[78%] -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/45 px-3 py-2 text-center text-xs font-bold text-slate-200 backdrop-blur">
          {canShoot ? "Choose a direction below to strike" : "Shot controls locked"}
        </div>
      </div>
    </div>
  );
}

function GoalPost() {
  return (
    <div className="absolute left-1/2 top-7 h-28 w-[78%] -translate-x-1/2 sm:h-36 sm:w-[58%]">
      <div className="absolute inset-x-0 top-0 h-3 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.45)]" />
      <div className="absolute left-0 top-0 h-full w-3 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.45)]" />
      <div className="absolute right-0 top-0 h-full w-3 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.45)]" />
      <div className="absolute inset-2 rounded-b-xl bg-[linear-gradient(45deg,rgba(255,255,255,0.16)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.16)_50%,rgba(255,255,255,0.16)_75%,transparent_75%,transparent)] bg-[length:18px_18px]" />
    </div>
  );
}

function Goalkeeper({ animation }: { animation: AnimationState }) {
  const dive = animation ? getKeeperDiveClass(animation.keeper) : "translate-x-0 rotate-0";
  return (
    <div key={animation?.nonce ?? "keeper-idle"} className={`absolute left-1/2 top-[17%] z-20 flex h-16 w-16 -translate-x-1/2 items-center justify-center transition-transform duration-700 sm:top-[20%] sm:h-20 sm:w-20 ${dive}`}>
      <div className="absolute h-12 w-12 rounded-full bg-sky-300 shadow-[0_0_24px_rgba(125,211,252,0.65)] sm:h-14 sm:w-14" />
      <div className="absolute top-1 h-5 w-5 rounded-full bg-slate-900" />
      <div className="absolute left-0 top-7 h-2 w-9 -rotate-12 rounded-full bg-sky-200" />
      <div className="absolute right-0 top-7 h-2 w-9 rotate-12 rounded-full bg-sky-200" />
      <div className="absolute bottom-1 left-3 h-8 w-2 rotate-12 rounded-full bg-sky-100" />
      <div className="absolute bottom-1 right-3 h-8 w-2 -rotate-12 rounded-full bg-sky-100" />
    </div>
  );
}

function Ball({ animation }: { animation: AnimationState }) {
  const target = animation ? getBallTargetClass(animation.shot) : "translate-x-0 translate-y-0 scale-100";
  return (
    <div key={animation?.nonce ?? "ball-idle"} className={`absolute bottom-10 left-1/2 z-30 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-slate-950 bg-white shadow-[0_0_18px_rgba(255,255,255,0.55)] transition-transform duration-700 sm:h-10 sm:w-10 ${target}`}>
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
      <div className="absolute left-1 top-2 h-2 w-2 rounded-full bg-slate-950" />
      <div className="absolute right-1 top-2 h-2 w-2 rounded-full bg-slate-950" />
      <div className="absolute bottom-1 left-2 h-2 w-2 rounded-full bg-slate-950" />
      <div className="absolute bottom-1 right-2 h-2 w-2 rounded-full bg-slate-950" />
    </div>
  );
}

function DirectionButtons({ disabled, onChoose, mode }: { disabled: boolean; onChoose: (direction: Direction) => void; mode: "NORMAL" | "SUDDEN_DEATH" }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
      {directions.map((direction) => (
        <button key={direction.value} type="button" onClick={() => onChoose(direction.value)} disabled={disabled} className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-4 text-left transition hover:-translate-y-1 hover:border-cyan-300 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0">
          <span className="block text-lg font-black text-white">{direction.label}</span>
          <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-cyan-200">{mode === "SUDDEN_DEATH" ? "Sudden death shot" : direction.hint}</span>
        </button>
      ))}
    </div>
  );
}

function ShotHistory({ shots, normalShots, suddenDeathShots }: { shots: Shot[]; normalShots: Shot[]; suddenDeathShots: Shot[] }) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">Shot history</p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-slate-300">{shots.length} taken</span>
      </div>
      {shots.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">No shots yet. Pick a direction to start.</p> : null}
      <div className="mt-4 grid gap-3">
        {normalShots.length > 0 ? <ShotGroup title="Normal round" shots={normalShots} /> : null}
        {suddenDeathShots.length > 0 ? <ShotGroup title="Sudden death" shots={suddenDeathShots} /> : null}
      </div>
    </div>
  );
}

function ShotGroup({ title, shots }: { title: string; shots: Shot[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="grid gap-2">
        {shots.map((shot) => <ShotHistoryItem key={`${title}-${shot.shotNumber}`} shot={shot} />)}
      </div>
    </div>
  );
}

function ShotHistoryItem({ shot }: { shot: Shot }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950 font-black text-white">{shot.shotNumber}</span>
      <div className="min-w-0">
        <p className="truncate font-bold text-white">Shot {formatDirection(shot.shotDirection)} · Keeper {formatDirection(shot.keeperDirection)}</p>
        <p className="text-xs text-slate-500">{shot.goal ? "Clean finish" : "Keeper saved it"}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${shot.goal ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{shot.goal ? "Goal" : "Saved"}</span>
    </div>
  );
}

function readPlayerSession() {
  if (typeof window === "undefined") return null;
  const storedSession = sessionStorage.getItem(playerSessionKey);
  if (!storedSession) return null;
  try {
    const session = JSON.parse(storedSession) as PlayerSession;
    return session.email ? session : null;
  } catch {
    sessionStorage.removeItem(playerSessionKey);
    return null;
  }
}

function normalizeSavedShots(value: unknown): Shot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((shot) => isShotRecord(shot) ? [{ shotNumber: shot.shotNumber, shotDirection: shot.shotDirection, keeperDirection: shot.keeperDirection, goal: shot.goal }] : []);
}

function isShotRecord(value: unknown): value is Shot {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<Shot>;
  return typeof record.shotNumber === "number" && isDirection(record.shotDirection) && isDirection(record.keeperDirection) && typeof record.goal === "boolean";
}

function isDirection(value: unknown): value is Direction {
  return value === "LEFT" || value === "CENTER" || value === "RIGHT";
}

function StatusBox({ tone, text }: { tone: "info" | "success" | "error"; text: string }) {
  const classes = {
    info: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    success: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    error: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  };
  return <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${classes[tone]}`}>{text}</div>;
}

function getSavedStatusText(match: PenaltyMatchState | null) {
  if (!match) return "Saved result";
  if (match.completed) return "Completed";
  if (match.suddenDeathRequired && match.waitingForOpponent) return "Waiting for opponent";
  if (match.suddenDeathRequired) return "Sudden death required";
  return "Waiting for opponent";
}

function getRoundStatus({ existingResult, penaltyMatch, shotsLeft, normalComplete }: { existingResult: SavedPenaltyResult | null; penaltyMatch: PenaltyMatchState | null; shotsLeft: number; normalComplete: boolean }) {
  if (penaltyMatch?.completed) return "Completed";
  if (penaltyMatch?.suddenDeathRequired && penaltyMatch.waitingForOpponent) return "Waiting for opponent";
  if (penaltyMatch?.suddenDeathRequired) return "Sudden death";
  if (existingResult) return getSavedStatusText(penaltyMatch);
  if (normalComplete) return "Saving result";
  return `${shotsLeft} shots left`;
}

function getOpponentScore(match: PenaltyMatchState | null, existingResult: SavedPenaltyResult | null) {
  if (!match || !existingResult) return null;
  if (match.suddenDeathRequired && !match.completed) return existingResult.score;
  return null;
}

function getBallTargetClass(direction: Direction) {
  const classes: Record<Direction, string> = {
    LEFT: "-translate-x-[8.5rem] -translate-y-[21rem] scale-75 sm:-translate-x-[16rem] sm:-translate-y-[20rem]",
    CENTER: "translate-x-0 -translate-y-[22rem] scale-75 sm:-translate-y-[21rem]",
    RIGHT: "translate-x-[6.5rem] -translate-y-[21rem] scale-75 sm:translate-x-[14rem] sm:-translate-y-[20rem]",
  };
  return classes[direction];
}

function getKeeperDiveClass(direction: Direction) {
  const classes: Record<Direction, string> = {
    LEFT: "-translate-x-[6rem] -translate-y-1 -rotate-45 sm:-translate-x-[10rem]",
    CENTER: "translate-x-0 -translate-y-2 rotate-0 scale-110",
    RIGHT: "translate-x-[2rem] -translate-y-1 rotate-45 sm:translate-x-[6rem]",
  };
  return classes[direction];
}

function GameShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden px-3 py-6 sm:px-5 lg:px-8 lg:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.12),transparent_24%)]" />
      <div className="relative mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

function randomDirection(): Direction {
  return directions[Math.floor(Math.random() * directions.length)].value;
}

function formatDirection(direction: Direction) {
  return direction.toLowerCase();
}
