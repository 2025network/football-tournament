"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CompetitionFormat, MatchStatus, MatchStreamMode, ResultSubmissionStatus } from "@/generated/prisma/client";

type TournamentSummary = {
  id: string;
  title: string;
  competitionFormat: CompetitionFormat;
  registrationOpen: boolean;
  useHomeAndAway: boolean;
};

type ApprovedPlayer = {
  id: string;
  fullName: string;
  email: string;
  gamerTag: string;
  approvalStatus: string;
  paymentStatus: string;
};

type ResultSubmission = {
  id: string;
  matchId: string;
  registrationId: string;
  playerName: string;
  submittedScore: string;
  screenshotUrl: string | null;
  note: string | null;
  status: ResultSubmissionStatus;
  adminNote: string | null;
  opponentConfirmed: boolean;
  opponentDisputed: boolean;
  opponentNote: string | null;
  autoApproved: boolean;
  createdAt: string;
};

type CompetitionMatch = {
  id: string;
  round: number;
  groupName: string | null;
  playerOneRegistrationId: string | null;
  playerTwoRegistrationId: string | null;
  playerOneName: string;
  playerTwoName: string;
  winnerRegistrationId: string | null;
  winnerName: string | null;
  status: MatchStatus;
  legNumber: number | null;
  homeRegistrationId: string | null;
  awayRegistrationId: string | null;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  aggregateMatchId: string | null;
  aggregateWinnerRegistrationId: string | null;
  aggregateWinnerName: string | null;
  scheduledAt: string | null;
  livestreamUrl: string | null;
  streamMode: MatchStreamMode;
  playerStreamUrl: string | null;
  officialStreamUrl: string | null;
  featuredLive: boolean;
  roomCode: string | null;
  roomPassword: string | null;
  spectatorNote: string | null;
  submissions: ResultSubmission[];
};

type Standing = {
  id: string;
  registrationId: string;
  playerName: string;
  groupName: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type CompetitionResponse = {
  message?: string;
  tournament: TournamentSummary;
  approvedPlayers: ApprovedPlayer[];
  matches: CompetitionMatch[];
  standings: Standing[];
};

type MatchScoreState = Record<string, { homeScore: string; awayScore: string; winnerRegistrationId: string; scheduledAt: string; livestreamUrl: string; streamMode: MatchStreamMode; playerStreamUrl: string; officialStreamUrl: string; featuredLive: boolean; roomCode: string; roomPassword: string; spectatorNote: string }>;

export function AdminCompetitionManager({ tournamentId }: { tournamentId: string }) {
  const [data, setData] = useState<CompetitionResponse | null>(null);
  const [scores, setScores] = useState<MatchScoreState>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadCompetition = useCallback(async () => {
    setErrorMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches`, { cache: "no-store" });
      const nextData = (await response.json()) as CompetitionResponse;

      if (!response.ok) {
        throw new Error(nextData.message ?? "Failed to load competition data.");
      }

      setData(nextData);
      setScores((currentScores) => buildScoreState(nextData.matches, currentScores));
      setAdminNotes((currentNotes) => buildAdminNoteState(nextData.matches, currentNotes));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load competition data.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCompetition();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCompetition]);

  const groupedStandings = useMemo(() => groupBy(data?.standings ?? [], (standing) => standing.groupName ?? "League Table"), [data?.standings]);
  const groupedMatches = useMemo(() => groupBy(data?.matches ?? [], (match) => match.groupName ?? `Round ${match.round}`), [data?.matches]);

  async function runAction(endpoint: string, success: string) {
    setActionLoading(endpoint);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const nextData = (await response.json()) as CompetitionResponse;

      if (!response.ok) {
        throw new Error(nextData.message ?? "Action failed.");
      }

      setData(nextData);
      setScores(buildScoreState(nextData.matches, scores));
      setAdminNotes(buildAdminNoteState(nextData.matches, adminNotes));
      setSuccessMessage(nextData.message ?? success);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setActionLoading("");
    }
  }

  async function toggleRegistration(open: boolean) {
    setActionLoading("registration");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationOpen: open }),
      });
      const nextData = (await response.json()) as CompetitionResponse;

      if (!response.ok) {
        throw new Error(nextData.message ?? "Could not update registration state.");
      }

      setData(nextData);
      setAdminNotes(buildAdminNoteState(nextData.matches, adminNotes));
      setSuccessMessage(nextData.message ?? "Registration state updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update registration state.");
    } finally {
      setActionLoading("");
    }
  }

  async function saveResult(match: CompetitionMatch) {
    const score = scores[match.id];
    const homeScore = Number(score?.homeScore);
    const awayScore = Number(score?.awayScore);

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      setErrorMessage("Enter valid home and away scores.");
      return;
    }

    setActionLoading(match.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/matches/${match.id}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeScore,
          awayScore,
          winnerRegistrationId: score.winnerRegistrationId || undefined,
          status: MatchStatus.COMPLETED,
        }),
      });
      const nextData = (await response.json()) as CompetitionResponse;

      if (!response.ok) {
        throw new Error(nextData.message ?? "Could not save match result.");
      }

      setData(nextData);
      setScores(buildScoreState(nextData.matches, scores));
      setAdminNotes(buildAdminNoteState(nextData.matches, adminNotes));
      setSuccessMessage("Match result saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save match result.");
    } finally {
      setActionLoading("");
    }
  }

  async function updateSubmission(submission: ResultSubmission, status: ResultSubmissionStatus) {
    setActionLoading(submission.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/result-submissions/${submission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNote: adminNotes[submission.id] ?? "",
        }),
      });
      const nextData = (await response.json()) as CompetitionResponse;

      if (!response.ok) {
        throw new Error(nextData.message ?? "Could not update submission.");
      }

      setData(nextData);
      setScores(buildScoreState(nextData.matches, scores));
      setAdminNotes(buildAdminNoteState(nextData.matches, adminNotes));
      setSuccessMessage(nextData.message ?? "Submission updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update submission.");
    } finally {
      setActionLoading("");
    }
  }

  async function saveStreamInfo(match: CompetitionMatch) {
    const score = scores[match.id];
    setActionLoading(`stream-${match.id}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/matches/${match.id}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          livestreamUrl: score?.livestreamUrl ?? "",
          streamMode: score?.streamMode ?? MatchStreamMode.NONE,
          officialStreamUrl: score?.officialStreamUrl ?? "",
          featuredLive: Boolean(score?.featuredLive),
          roomCode: score?.roomCode ?? "",
          roomPassword: score?.roomPassword ?? "",
          spectatorNote: score?.spectatorNote ?? "",
        }),
      });
      const nextData = (await response.json()) as CompetitionResponse;

      if (!response.ok) {
        throw new Error(nextData.message ?? "Could not save stream info.");
      }

      setData(nextData);
      setScores(buildScoreState(nextData.matches, scores));
      setAdminNotes(buildAdminNoteState(nextData.matches, adminNotes));
      setSuccessMessage("Match stream and spectator info saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save stream info.");
    } finally {
      setActionLoading("");
    }
  }

  async function saveSchedule(match: CompetitionMatch) {
    const scheduledAt = scores[match.id]?.scheduledAt || null;
    setActionLoading(`schedule-${match.id}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/matches/${match.id}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });
      const nextData = (await response.json()) as CompetitionResponse;

      if (!response.ok) {
        throw new Error(nextData.message ?? "Could not save schedule.");
      }

      setData(nextData);
      setScores(buildScoreState(nextData.matches, scores));
      setAdminNotes(buildAdminNoteState(nextData.matches, adminNotes));
      setSuccessMessage("Match schedule saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save schedule.");
    } finally {
      setActionLoading("");
    }
  }

  function updateAdminNote(submissionId: string, value: string) {
    setAdminNotes((current) => ({ ...current, [submissionId]: value }));
  }

  function updateScore(matchId: string, field: keyof MatchScoreState[string], value: string | boolean) {
    setScores((current) => ({
      ...current,
      [matchId]: {
        homeScore: current[matchId]?.homeScore ?? "",
        awayScore: current[matchId]?.awayScore ?? "",
        winnerRegistrationId: current[matchId]?.winnerRegistrationId ?? "",
        scheduledAt: current[matchId]?.scheduledAt ?? "",
        livestreamUrl: current[matchId]?.livestreamUrl ?? "",
        streamMode: current[matchId]?.streamMode ?? MatchStreamMode.NONE,
        playerStreamUrl: current[matchId]?.playerStreamUrl ?? "",
        officialStreamUrl: current[matchId]?.officialStreamUrl ?? "",
        featuredLive: current[matchId]?.featuredLive ?? false,
        roomCode: current[matchId]?.roomCode ?? "",
        roomPassword: current[matchId]?.roomPassword ?? "",
        spectatorNote: current[matchId]?.spectatorNote ?? "",
        [field]: value,
      },
    }));
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl px-5 py-12 text-slate-300 lg:px-8">Loading competition data...</section>;
  }

  if (!data) {
    return <section className="mx-auto max-w-7xl px-5 py-12 text-rose-200 lg:px-8">{errorMessage || "Competition data could not be loaded."}</section>;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/tournaments" className="text-sm font-bold text-cyan-300 transition hover:text-white">Back to admin tournaments</Link>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">{data.tournament.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Manage approved players, registration state, fixtures, results, tables, groups, and aggregate winners.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => toggleRegistration(!data.tournament.registrationOpen)} disabled={actionLoading === "registration"} type="button" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950 disabled:opacity-50">
            {data.tournament.registrationOpen ? "Close Registration" : "Open Registration"}
          </button>
        </div>
      </div>

      {successMessage ? <Message tone="success" text={successMessage} /> : null}
      {errorMessage ? <Message tone="error" text={errorMessage} /> : null}

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label="Format" value={formatCompetition(data.tournament.competitionFormat)} />
        <Stat label="Registration" value={data.tournament.registrationOpen ? "Open" : "Closed"} />
        <Stat label="Home & Away" value={data.tournament.useHomeAndAway ? "Enabled" : "Disabled"} />
        <Stat label="Approved players" value={data.approvedPlayers.length.toString()} />
      </div>

      <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-5 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Generate competition</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ActionButton label="Generate Knockout" loading={actionLoading.includes("generate-knockout")} onClick={() => runAction(`/api/tournaments/${tournamentId}/generate-knockout`, "Knockout generated.")} />
          <ActionButton label="Generate League" loading={actionLoading.includes("generate-league")} onClick={() => runAction(`/api/tournaments/${tournamentId}/generate-league`, "League generated.")} />
          <ActionButton label="Generate Champions League" loading={actionLoading.includes("generate-champions-league")} onClick={() => runAction(`/api/tournaments/${tournamentId}/generate-champions-league`, "Champions League generated.")} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Approved players</p>
          <div className="mt-5 grid gap-3">
            {data.approvedPlayers.length === 0 ? <EmptyState text="Approve player registrations first." /> : data.approvedPlayers.map((player) => (
              <div key={player.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="font-black text-white">{player.fullName}</p>
                <p className="mt-1 text-sm text-slate-400">{player.email}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1">{player.approvalStatus}</span>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1">{player.paymentStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <StandingsView groupedStandings={groupedStandings} />
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Matches</p>
            <div className="mt-5 grid gap-5">
              {data.matches.length === 0 ? <EmptyState text="Generate fixtures to see matches here." /> : Object.entries(groupedMatches).map(([group, matches]) => (
                <div key={group} className="space-y-3">
                  <h3 className="text-lg font-black text-white">{group}</h3>
                  {matches.map((match) => (
                    <article key={match.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-black text-white">{match.homeName} vs {match.awayName}</p>
                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                          {match.legNumber ? <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100">Leg {match.legNumber}</span> : null}
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-300">{match.status}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">Home: {match.homeName} - Away: {match.awayName}</p>
                      <p className="mt-1 text-sm text-slate-400">Scheduled: {match.scheduledAt ? formatDate(match.scheduledAt) : "Not scheduled"}</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Scheduled date/time</span>
                          <input className="form-input" type="datetime-local" value={scores[match.id]?.scheduledAt ?? ""} onChange={(event) => updateScore(match.id, "scheduledAt", event.target.value)} />
                        </label>
                        <button onClick={() => saveSchedule(match)} disabled={actionLoading === `schedule-${match.id}`} type="button" className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-300 hover:text-slate-950 disabled:opacity-50">Save Schedule</button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Stream mode</span>
                          <select className="form-input" value={scores[match.id]?.streamMode ?? MatchStreamMode.NONE} onChange={(event) => updateScore(match.id, "streamMode", event.target.value)}>
                            <option value={MatchStreamMode.NONE}>No stream</option>
                            <option value={MatchStreamMode.PLAYER_STREAM}>Player stream</option>
                            <option value={MatchStreamMode.OFFICIAL_STREAM}>Official stream</option>
                          </select>
                        </label>
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Official stream URL</span>
                          <input className="form-input" value={scores[match.id]?.officialStreamUrl ?? ""} onChange={(event) => updateScore(match.id, "officialStreamUrl", event.target.value)} placeholder="https://youtube.com/watch?v=..." />
                        </label>
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Legacy livestream URL</span>
                          <input className="form-input" value={scores[match.id]?.livestreamUrl ?? ""} onChange={(event) => updateScore(match.id, "livestreamUrl", event.target.value)} placeholder="Backward compatible stream URL" />
                        </label>
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Room code</span>
                          <input className="form-input" value={scores[match.id]?.roomCode ?? ""} onChange={(event) => updateScore(match.id, "roomCode", event.target.value)} placeholder="Room ID or code" />
                        </label>
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Room password</span>
                          <input className="form-input" value={scores[match.id]?.roomPassword ?? ""} onChange={(event) => updateScore(match.id, "roomPassword", event.target.value)} placeholder="Optional password" />
                        </label>
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Spectator note</span>
                          <input className="form-input" value={scores[match.id]?.spectatorNote ?? ""} onChange={(event) => updateScore(match.id, "spectatorNote", event.target.value)} placeholder="Room opens 10 mins early" />
                        </label>
                        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-200">
                          <input type="checkbox" checked={Boolean(scores[match.id]?.featuredLive)} onChange={(event) => updateScore(match.id, "featuredLive", event.target.checked)} className="h-4 w-4 accent-cyan-300" />
                          Featured live match
                        </label>
                        <button onClick={() => saveStreamInfo(match)} disabled={actionLoading === `stream-${match.id}`} type="button" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950 disabled:opacity-50 md:col-span-2">Save Stream Info</button>
                      </div>
                      {match.aggregateWinnerName ? <p className="mt-2 text-sm font-bold text-emerald-300">Aggregate winner: {match.aggregateWinnerName}</p> : null}
                      {match.status === MatchStatus.DISPUTED ? <p className="mt-2 text-sm font-bold text-amber-300">Aggregate is tied. Choose a manual winner, penalty winner, or replay decision before saving.</p> : null}

                      {match.submissions.length > 0 ? (
                        <div className="mt-4 grid gap-3">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Player submissions</p>
                          {match.submissions.map((submission) => (
                            <div key={submission.id} className={`rounded-xl border p-4 ${submission.opponentDisputed ? "border-amber-300/30 bg-amber-300/10" : "border-white/10 bg-white/[0.04]"}`}>
                              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                                <div>
                                  <p className="font-black text-white">{submission.playerName} submitted {submission.submittedScore}</p>
                                  <p className="mt-1 text-sm text-slate-400">Status: {submission.status}{submission.autoApproved ? " - Auto approved" : ""}</p>
                                  {submission.opponentConfirmed ? <p className="mt-2 text-sm font-bold text-emerald-200">Opponent confirmed this result.</p> : null}
                                  {submission.opponentDisputed ? <p className="mt-2 text-sm font-bold text-amber-200">Opponent disputed this result.</p> : null}
                                  {submission.opponentNote ? <p className="mt-2 text-sm text-amber-100">Opponent note: {submission.opponentNote}</p> : null}
                                  {submission.note ? <p className="mt-2 text-sm text-slate-300">Note: {submission.note}</p> : null}
                                  {submission.screenshotUrl ? <a href={submission.screenshotUrl} target="_blank" className="mt-2 inline-block text-sm font-bold text-cyan-300 hover:text-white">View screenshot proof</a> : null}
                                </div>
                                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${submission.opponentDisputed ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"}`}>{submission.opponentDisputed ? "DISPUTED" : submission.autoApproved ? "AUTO APPROVED" : submission.status}</span>
                              </div>
                              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                                <label>
                                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Admin note</span>
                                  <input className="form-input" value={adminNotes[submission.id] ?? ""} onChange={(event) => updateAdminNote(submission.id, event.target.value)} placeholder="Reason or confirmation" />
                                </label>
                                <button onClick={() => updateSubmission(submission, ResultSubmissionStatus.APPROVED)} disabled={actionLoading === submission.id} type="button" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950 disabled:opacity-50">Approve</button>
                                <button onClick={() => updateSubmission(submission, ResultSubmissionStatus.REJECTED)} disabled={actionLoading === submission.id} type="button" className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-300 hover:text-slate-950 disabled:opacity-50">Reject</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-end">
                        <ScoreInput label="Home score" value={scores[match.id]?.homeScore ?? ""} onChange={(value) => updateScore(match.id, "homeScore", value)} />
                        <ScoreInput label="Away score" value={scores[match.id]?.awayScore ?? ""} onChange={(value) => updateScore(match.id, "awayScore", value)} />
                        <label>
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Manual winner</span>
                          <select className="form-input" value={scores[match.id]?.winnerRegistrationId ?? ""} onChange={(event) => updateScore(match.id, "winnerRegistrationId", event.target.value)}>
                            <option value="">Auto / none</option>
                            {match.homeRegistrationId ? <option value={match.homeRegistrationId}>{match.homeName}</option> : null}
                            {match.awayRegistrationId ? <option value={match.awayRegistrationId}>{match.awayName}</option> : null}
                          </select>
                        </label>
                        <button onClick={() => saveResult(match)} disabled={actionLoading === match.id} type="button" className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">
                          Save Result
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StandingsView({ groupedStandings }: { groupedStandings: Record<string, Standing[]> }) {
  const groups = Object.entries(groupedStandings);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Tables and groups</p>
      <div className="mt-5 grid gap-5">
        {groups.length === 0 ? <EmptyState text="League tables and Champions League groups appear after fixtures are generated." /> : groups.map(([group, standings]) => (
          <div key={group} className="overflow-x-auto">
            <h3 className="mb-3 text-lg font-black text-white">{group}</h3>
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="py-3">Player</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>GD</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {standings.map((standing) => (
                  <tr key={standing.id} className="text-slate-200">
                    <td className="py-3 font-bold text-white">{standing.playerName}</td>
                    <td>{standing.played}</td>
                    <td>{standing.won}</td>
                    <td>{standing.drawn}</td>
                    <td>{standing.lost}</td>
                    <td>{standing.goalsFor}</td>
                    <td>{standing.goalsAgainst}</td>
                    <td>{standing.goalDifference}</td>
                    <td className="font-black text-cyan-300">{standing.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return <button onClick={onClick} disabled={loading} type="button" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950 disabled:opacity-50">{loading ? "Working..." : label}</button>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p><p className="mt-3 text-xl font-black text-white">{value}</p></div>;
}

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</span><input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} type="number" min="0" placeholder="0" /></label>;
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  const className = tone === "success" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-rose-300/30 bg-rose-300/10 text-rose-200";
  return <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${className}`}>{text}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-white/10 bg-slate-950/40 px-5 py-8 text-center text-sm text-slate-400">{text}</div>;
}

function buildAdminNoteState(matches: CompetitionMatch[], current: Record<string, string>) {
  return matches.reduce<Record<string, string>>((next, match) => {
    match.submissions.forEach((submission) => {
      next[submission.id] = current[submission.id] ?? submission.adminNote ?? "";
    });
    return next;
  }, {});
}

function buildScoreState(matches: CompetitionMatch[], current: MatchScoreState) {
  return matches.reduce<MatchScoreState>((next, match) => {
    next[match.id] = {
      homeScore: current[match.id]?.homeScore ?? match.homeScore?.toString() ?? "",
      awayScore: current[match.id]?.awayScore ?? match.awayScore?.toString() ?? "",
      winnerRegistrationId: current[match.id]?.winnerRegistrationId ?? match.winnerRegistrationId ?? "",
      scheduledAt: current[match.id]?.scheduledAt ?? toDateInputValue(match.scheduledAt),
      livestreamUrl: current[match.id]?.livestreamUrl ?? match.livestreamUrl ?? "",
      streamMode: current[match.id]?.streamMode ?? match.streamMode ?? MatchStreamMode.NONE,
      playerStreamUrl: current[match.id]?.playerStreamUrl ?? match.playerStreamUrl ?? "",
      officialStreamUrl: current[match.id]?.officialStreamUrl ?? match.officialStreamUrl ?? "",
      featuredLive: current[match.id]?.featuredLive ?? match.featuredLive ?? false,
      roomCode: current[match.id]?.roomCode ?? match.roomCode ?? "",
      roomPassword: current[match.id]?.roomPassword ?? match.roomPassword ?? "",
      spectatorNote: current[match.id]?.spectatorNote ?? match.spectatorNote ?? "",
    };
    return next;
  }, {});
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {});
}

function formatCompetition(format: CompetitionFormat) {
  const labels: Record<CompetitionFormat, string> = {
    OPEN_KNOCKOUT: "Open Knockout",
    DOUBLE_ELIMINATION: "Double Elimination",
    LEAGUE: "League",
    CHAMPIONS_LEAGUE: "Champions League",
    SWISS_SYSTEM: "Swiss System",
  };

  return labels[format];
}


function toDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
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


