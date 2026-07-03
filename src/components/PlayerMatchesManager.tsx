"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PlayerSession = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

type ResultSubmission = {
  id: string;
  registrationId: string;
  submittedScore: string;
  screenshotUrl: string | null;
  note: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  opponentConfirmed: boolean;
  opponentDisputed: boolean;
  opponentNote: string | null;
  autoApproved: boolean;
  createdAt: string;
};

type LineupMember = {
  userId: string;
  fullName: string;
  gamerTag: string | null;
  platformId: string | null;
};

type MatchLineup = {
  id: string;
  registrationId: string;
  teamName: string;
  teamTag: string;
  memberUserIds: string[];
  members: LineupMember[];
  representativeUserId: string;
  representativeName: string;
};

type PlayerMatch = {
  id: string;
  tournamentTitle: string;
  tournamentId: string;
  round: number;
  groupName: string | null;
  status: "PENDING" | "COMPLETED" | "DISPUTED";
  legNumber: number | null;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  currentPlayerRegistrationId: string | null;
  canManageLineup: boolean;
  currentTeamMembers: LineupMember[];
  lineups: MatchLineup[];
  side: "HOME" | "AWAY" | "PLAYER";
  scheduledAt: string | null;
  streamMode: "NONE" | "PLAYER_STREAM" | "OFFICIAL_STREAM";
  playerStreamUrl: string | null;
  officialStreamUrl: string | null;
  featuredLive: boolean;
  submissions: ResultSubmission[];
  penaltyShootout: {
    belongsToMatch: boolean;
    status: "NOT_PLAYED" | "PLAYED" | "WAITING_FOR_OPPONENT" | "COMPLETED" | "DISPUTED" | "SUDDEN_DEATH_REQUIRED";
    latestScore: number | null;
    suddenDeathScore: number;
    totalShots: number;
    playedAt: string | null;
    canPlay: boolean;
  };
};

type PlayerMatchesResponse = {
  message?: string;
  player?: PlayerSession;
  matches?: PlayerMatch[];
};

type FormState = Record<string, { submittedScore: string; note: string; streamUrl: string; screenshot: File | null }>;
type LineupState = Record<string, { memberUserIds: string[]; representativeUserId: string }>;

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

export function PlayerMatchesManager() {
  const [player, setPlayer] = useState<PlayerSession | null>(() => readPlayerSession());
  const [matches, setMatches] = useState<PlayerMatch[]>([]);
  const [forms, setForms] = useState<FormState>({});
  const [lineups, setLineups] = useState<LineupState>({});
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadMatches = useCallback(async () => {
    const currentPlayer = readPlayerSession();
    setPlayer(currentPlayer);

    if (!currentPlayer) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/player/matches?email=${encodeURIComponent(currentPlayer.email)}`, { cache: "no-store" });
      const data = (await response.json()) as PlayerMatchesResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Could not load player matches.");
      }

      setMatches(data.matches ?? []);
      setForms((current) => buildFormState(data.matches ?? [], current));
      setLineups((current) => buildLineupState(data.matches ?? [], current));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load player matches.");
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

  function updateForm(matchId: string, field: keyof FormState[string], value: string | File | null) {
    setForms((current) => ({
      ...current,
      [matchId]: {
        submittedScore: current[matchId]?.submittedScore ?? "",
        note: current[matchId]?.note ?? "",
        streamUrl: current[matchId]?.streamUrl ?? "",
        screenshot: current[matchId]?.screenshot ?? null,
        [field]: value,
      },
    }));
  }

  async function submitPlayerStream(match: PlayerMatch) {
    const form = forms[match.id];

    if (!match.currentPlayerRegistrationId) {
      setErrorMessage("Your player registration could not be matched to this fixture.");
      return;
    }

    if (!form?.streamUrl.trim()) {
      setErrorMessage("Enter your stream URL first.");
      return;
    }

    setActionLoading(`stream-${match.id}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/matches/${match.id}/submit-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: match.currentPlayerRegistrationId,
          playerStreamUrl: form.streamUrl.trim(),
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not submit stream link.");
      }

      setSuccessMessage(data.message ?? "Stream link submitted.");
      await loadMatches();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not submit stream link.");
    } finally {
      setActionLoading("");
    }
  }

  async function saveLineup(match: PlayerMatch) {
    if (!player || !match.currentPlayerRegistrationId) {
      setErrorMessage("Your team registration could not be matched to this fixture.");
      return;
    }

    const lineup = lineups[match.id];
    if (!lineup?.memberUserIds.length || !lineup.representativeUserId) {
      setErrorMessage("Select lineup members and one penalty representative.");
      return;
    }

    setActionLoading(`lineup-${match.id}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/matches/${match.id}/lineup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captainEmail: player.email,
          registrationId: match.currentPlayerRegistrationId,
          memberUserIds: lineup.memberUserIds,
          representativeUserId: lineup.representativeUserId,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not save lineup.");
      setSuccessMessage(data.message ?? "Lineup saved.");
      await loadMatches();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save lineup.");
    } finally {
      setActionLoading("");
    }
  }

  function toggleLineupMember(matchId: string, userId: string) {
    setLineups((current) => {
      const lineup = current[matchId] ?? { memberUserIds: [], representativeUserId: "" };
      const memberUserIds = lineup.memberUserIds.includes(userId) ? lineup.memberUserIds.filter((id) => id !== userId) : [...lineup.memberUserIds, userId];
      return {
        ...current,
        [matchId]: {
          memberUserIds,
          representativeUserId: memberUserIds.includes(lineup.representativeUserId) ? lineup.representativeUserId : "",
        },
      };
    });
  }

  function setRepresentative(matchId: string, userId: string) {
    setLineups((current) => {
      const lineup = current[matchId] ?? { memberUserIds: [], representativeUserId: "" };
      return {
        ...current,
        [matchId]: {
          memberUserIds: lineup.memberUserIds.includes(userId) ? lineup.memberUserIds : [...lineup.memberUserIds, userId],
          representativeUserId: userId,
        },
      };
    });
  }

  async function submitResult(match: PlayerMatch) {
    const form = forms[match.id];

    if (!match.currentPlayerRegistrationId) {
      setErrorMessage("Your player registration could not be matched to this fixture.");
      return;
    }

    if (!form?.submittedScore.trim()) {
      setErrorMessage("Enter a score like 2-1 or 2:1.");
      return;
    }

    setActionLoading(match.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const body = new FormData();
      body.append("registrationId", match.currentPlayerRegistrationId);
      body.append("submittedScore", form.submittedScore.trim());
      body.append("note", form.note.trim());
      if (form.screenshot) body.append("screenshot", form.screenshot);

      const response = await fetch(`/api/matches/${match.id}/submit-result`, {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not submit result.");
      }

      setSuccessMessage(data.message ?? "Result submitted for admin review.");
      await loadMatches();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not submit result.");
    } finally {
      setActionLoading("");
    }
  }

  async function confirmSubmission(match: PlayerMatch, submission: ResultSubmission) {
    if (!match.currentPlayerRegistrationId) {
      setErrorMessage("Your player registration could not be matched to this fixture.");
      return;
    }

    setActionLoading(`confirm-${submission.id}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/result-submissions/${submission.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: match.currentPlayerRegistrationId }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not confirm result.");
      }

      setSuccessMessage(data.message ?? "Result confirmed.");
      await loadMatches();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not confirm result.");
    } finally {
      setActionLoading("");
    }
  }

  async function disputeSubmission(match: PlayerMatch, submission: ResultSubmission) {
    if (!match.currentPlayerRegistrationId) {
      setErrorMessage("Your player registration could not be matched to this fixture.");
      return;
    }

    setActionLoading(`dispute-${submission.id}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/result-submissions/${submission.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: match.currentPlayerRegistrationId,
          opponentNote: disputeNotes[submission.id]?.trim() ?? "",
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not dispute result.");
      }

      setSuccessMessage(data.message ?? "Result disputed for admin review.");
      await loadMatches();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not dispute result.");
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl px-5 py-12 text-slate-300 lg:px-8">Loading player matches...</section>;
  }

  if (!player) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-20 text-center lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14">
          <p className="text-2xl font-black text-white">Login required</p>
          <p className="mt-3 text-slate-400">Login to your player account before submitting match results.</p>
          <Link href="/login" className="mt-6 inline-block rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white">Login</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="border-b border-white/10 pb-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Player match center</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Submit match results</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Enter the home-away score, attach screenshot proof, and wait for admin approval.</p>
      </div>

      {successMessage ? <Message tone="success" text={successMessage} /> : null}
      {errorMessage ? <Message tone="error" text={errorMessage} /> : null}

      {matches.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 text-center">
          <p className="text-xl font-black text-white">No matches assigned yet</p>
          <p className="mt-3 text-slate-400">When admin generates fixtures for tournaments you joined, they will appear here.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {matches.map((match) => (
            <article key={match.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{match.tournamentTitle}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{match.homeName} vs {match.awayName}</h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{match.groupName ?? `Round ${match.round}`}</span>
                    {match.legNumber ? <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100">Leg {match.legNumber}</span> : null}
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">You are {match.side}</span>
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-amber-100">{match.scheduledAt ? formatDate(match.scheduledAt) : "Not scheduled"}</span>
                  </div>
                </div>
                <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-slate-300">{match.status}</span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-sm font-black text-white">Schedule</p>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <Info label="Tournament" value={match.tournamentTitle} />
                    <Info label="Opponent" value={match.side === "HOME" ? match.awayName : match.homeName} />
                    <Info label="Home" value={match.homeName} />
                    <Info label="Away" value={match.awayName} />
                    <Info label="Date" value={match.scheduledAt ? formatDate(match.scheduledAt) : "Not scheduled yet"} />
                    <Info label="Status" value={match.status} />
                    <Info label="Stream mode" value={formatStreamMode(match.streamMode)} />
                  </dl>
                  <p className="mt-5 text-sm font-black text-white">Current score</p>
                  <p className="mt-2 text-3xl font-black text-cyan-300">{match.homeScore ?? "-"} : {match.awayScore ?? "-"}</p>
                  <PenaltyShootoutPanel match={match} />
                  <TeamLineupPanel match={match} lineupState={lineups[match.id] ?? { memberUserIds: [], representativeUserId: "" }} actionLoading={actionLoading} onToggleMember={toggleLineupMember} onSetRepresentative={setRepresentative} onSaveLineup={saveLineup} />
                  <div className="mt-4 grid gap-3">
                    {match.submissions.length === 0 ? <p className="text-sm text-slate-400">No submissions yet.</p> : match.submissions.map((submission) => {
                      const isOpponentSubmission = submission.registrationId !== match.currentPlayerRegistrationId;
                      const canRespond = isOpponentSubmission && submission.status === "PENDING" && !submission.opponentConfirmed && !submission.opponentDisputed;

                      return (
                        <div key={submission.id} className={`rounded-lg border p-3 text-sm ${submission.opponentDisputed ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold text-white">{isOpponentSubmission ? "Opponent submitted" : "You submitted"} {submission.submittedScore}</p>
                            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-xs font-black text-cyan-100">{submission.autoApproved ? "AUTO APPROVED" : submission.status}</span>
                          </div>
                          {submission.note ? <p className="mt-1">Note: {submission.note}</p> : null}
                          {submission.opponentNote ? <p className="mt-1 text-amber-200">Opponent note: {submission.opponentNote}</p> : null}
                          {submission.adminNote ? <p className="mt-1 text-amber-200">Admin: {submission.adminNote}</p> : null}
                          {submission.screenshotUrl ? <a href={submission.screenshotUrl} target="_blank" className="mt-2 inline-block font-bold text-cyan-300 hover:text-white">View screenshot</a> : null}
                          {canRespond ? (
                            <div className="mt-3 grid gap-2">
                              <textarea className="form-input min-h-20 resize-y" placeholder="Dispute note optional" value={disputeNotes[submission.id] ?? ""} onChange={(event) => setDisputeNotes((current) => ({ ...current, [submission.id]: event.target.value }))} />
                              <div className="grid gap-2 sm:grid-cols-2">
                                <button onClick={() => confirmSubmission(match, submission)} disabled={actionLoading === `confirm-${submission.id}`} type="button" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950 disabled:opacity-50">
                                  {actionLoading === `confirm-${submission.id}` ? "Confirming..." : "Confirm Result"}
                                </button>
                                <button onClick={() => disputeSubmission(match, submission)} disabled={actionLoading === `dispute-${submission.id}`} type="button" className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-300 hover:text-slate-950 disabled:opacity-50">
                                  {actionLoading === `dispute-${submission.id}` ? "Disputing..." : "Dispute Result"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3">
                  {match.streamMode === "PLAYER_STREAM" ? (
                    <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                      <p className="text-sm font-black text-cyan-100">Player stream enabled</p>
                      {match.playerStreamUrl ? (
                        <a href={match.playerStreamUrl} target="_blank" className="mt-2 inline-block text-sm font-bold text-cyan-300 transition hover:text-white">Current stream link</a>
                      ) : (
                        <p className="mt-2 text-sm text-slate-300">Paste your YouTube, TikTok, Twitch, or Facebook stream link before the match starts.</p>
                      )}
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                        <input className="form-input" placeholder="https://youtube.com/watch?v=..." value={forms[match.id]?.streamUrl ?? ""} onChange={(event) => updateForm(match.id, "streamUrl", event.target.value)} />
                        <button onClick={() => submitPlayerStream(match)} disabled={actionLoading === `stream-${match.id}`} type="button" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950 disabled:opacity-50">
                          {actionLoading === `stream-${match.id}` ? "Saving..." : "Submit Stream"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {match.streamMode === "OFFICIAL_STREAM" && match.officialStreamUrl ? (
                    <a href={match.officialStreamUrl} target="_blank" className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950">Watch Official Stream</a>
                  ) : null}
                  <label>
                    <span className="mb-2 block text-sm font-black text-slate-200">Submitted score</span>
                    <input className="form-input" placeholder="Example: 2-1" value={forms[match.id]?.submittedScore ?? ""} onChange={(event) => updateForm(match.id, "submittedScore", event.target.value)} />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-black text-slate-200">Screenshot proof</span>
                    <input className="form-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => updateForm(match.id, "screenshot", event.target.files?.[0] ?? null)} />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-black text-slate-200">Note optional</span>
                    <textarea className="form-input min-h-24 resize-y" placeholder="Add context for admin" value={forms[match.id]?.note ?? ""} onChange={(event) => updateForm(match.id, "note", event.target.value)} />
                  </label>
                  <button onClick={() => submitResult(match)} disabled={actionLoading === match.id} type="button" className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">
                    {actionLoading === match.id ? "Submitting..." : "Submit Result Proof"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PenaltyShootoutPanel({ match }: { match: PlayerMatch }) {
  const status = getPenaltyStatus(match);
  const isDisabled = !match.penaltyShootout.canPlay;

  return (
    <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-black text-cyan-100">Penalty shootout</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">Play the 5-shot penalty challenge for this match. Your score will be saved and connected to this fixture.</p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-300">
          {match.penaltyShootout.latestScore !== null ? `Normal: ${match.penaltyShootout.latestScore}/${match.penaltyShootout.totalShots} · Sudden death: ${match.penaltyShootout.suddenDeathScore}` : "No penalty score saved yet."}
        </p>
        {isDisabled ? (
          <button type="button" disabled className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-slate-500">
            {match.status === "COMPLETED" ? "Match Completed" : "Unavailable"}
          </button>
        ) : (
          <Link href={`/games/penalty-shootout?matchId=${match.id}`} className="rounded-lg bg-cyan-300 px-4 py-2 text-center text-sm font-black text-slate-950 transition hover:bg-white">
            Play Penalty Shootout
          </Link>
        )}
      </div>
    </div>
  );
}

function TeamLineupPanel({ match, lineupState, actionLoading, onToggleMember, onSetRepresentative, onSaveLineup }: { match: PlayerMatch; lineupState: { memberUserIds: string[]; representativeUserId: string }; actionLoading: string; onToggleMember: (matchId: string, userId: string) => void; onSetRepresentative: (matchId: string, userId: string) => void; onSaveLineup: (match: PlayerMatch) => void }) {
  if (match.currentTeamMembers.length === 0 && match.lineups.length === 0) return null;

  return (
    <div className="mt-5 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-4">
      <p className="text-sm font-black text-fuchsia-100">Team lineups</p>
      {match.lineups.length === 0 ? <p className="mt-2 text-sm text-slate-300">No team lineup has been selected yet.</p> : (
        <div className="mt-3 grid gap-3">
          {match.lineups.map((lineup) => (
            <div key={lineup.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
              <p className="font-black text-white">[{lineup.teamTag}] {lineup.teamName}</p>
              <p className="mt-1 text-xs font-bold text-cyan-200">Representative: {lineup.representativeName}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lineup.members.map((member) => <span key={member.userId} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">{member.gamerTag || member.fullName}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {match.canManageLineup ? (
        <div className="mt-4 rounded-lg border border-fuchsia-300/20 bg-slate-950/50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-200">Select your lineup</p>
          <div className="mt-3 grid gap-2">
            {match.currentTeamMembers.map((member) => (
              <div key={member.userId} className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-bold text-white">{member.gamerTag || member.fullName}</p>
                  <p className="text-xs text-slate-500">{member.platformId ?? "No Platform ID"}</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <input type="checkbox" checked={lineupState.memberUserIds.includes(member.userId)} onChange={() => onToggleMember(match.id, member.userId)} className="h-4 w-4 accent-cyan-300" />
                  In lineup
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <input type="radio" name={`representative-${match.id}`} checked={lineupState.representativeUserId === member.userId} onChange={() => onSetRepresentative(match.id, member.userId)} className="h-4 w-4 accent-fuchsia-300" />
                  Representative
                </label>
              </div>
            ))}
          </div>
          <button onClick={() => onSaveLineup(match)} disabled={actionLoading === `lineup-${match.id}`} type="button" className="mt-4 rounded-lg border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-3 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-300 hover:text-slate-950 disabled:opacity-50">
            {actionLoading === `lineup-${match.id}` ? "Saving lineup..." : "Save Lineup"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getPenaltyStatus(match: PlayerMatch) {
  const styles = {
    NOT_PLAYED: "border-slate-500/30 bg-slate-500/10 text-slate-200",
    PLAYED: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    WAITING_FOR_OPPONENT: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    COMPLETED: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    DISPUTED: "border-rose-300/30 bg-rose-300/10 text-rose-100",
    SUDDEN_DEATH_REQUIRED: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  } satisfies Record<PlayerMatch["penaltyShootout"]["status"], string>;

  const labels = {
    NOT_PLAYED: "Not played",
    PLAYED: "Played",
    WAITING_FOR_OPPONENT: "Waiting for opponent",
    COMPLETED: "Completed",
    DISPUTED: "Disputed",
    SUDDEN_DEATH_REQUIRED: "Sudden death required",
  } satisfies Record<PlayerMatch["penaltyShootout"]["status"], string>;

  return {
    label: labels[match.penaltyShootout.status],
    className: styles[match.penaltyShootout.status],
  };
}
function buildFormState(matches: PlayerMatch[], current: FormState) {
  return matches.reduce<FormState>((next, match) => {
    next[match.id] = current[match.id] ?? { submittedScore: "", note: "", streamUrl: match.playerStreamUrl ?? "", screenshot: null };
    return next;
  }, {});
}

function buildLineupState(matches: PlayerMatch[], current: LineupState) {
  return matches.reduce<LineupState>((next, match) => {
    const lineup = match.lineups.find((item) => item.registrationId === match.currentPlayerRegistrationId);
    next[match.id] = current[match.id] ?? {
      memberUserIds: lineup?.memberUserIds ?? [],
      representativeUserId: lineup?.representativeUserId ?? "",
    };
    return next;
  }, {});
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  const className = tone === "success" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-rose-300/30 bg-rose-300/10 text-rose-200";
  return <div className={`mt-6 rounded-xl border px-4 py-3 text-sm font-bold ${className}`}>{text}</div>;
}


function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-bold text-white">{value}</dd>
    </div>
  );
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

function formatStreamMode(mode: PlayerMatch["streamMode"]) {
  const labels: Record<PlayerMatch["streamMode"], string> = {
    NONE: "No Stream",
    PLAYER_STREAM: "Player Stream",
    OFFICIAL_STREAM: "Official Live",
  };

  return labels[mode];
}

