"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  formatGame,
  publicGameOptions,
  type PublicGameTitle,
  type PublicTournament,
  type PublicTournamentsResponse,
} from "@/types/public-tournament";
import type { PublicTeam, TeamsResponse } from "@/types/team";
import { validateGamePlayerId } from "@/lib/player-validation";

const playerSessionKey = "football-tournament-player-session";

type PlayerSession = {
  id: string;
  fullName: string;
  email: string;
  platformId?: string;
  phone: string;
  whatsapp?: string;
  gamerTag?: string;
  defaultGame?: PublicGameTitle | "";
  defaultGamePlayerId?: string;
};

type FormState = {
  game: PublicGameTitle | "";
  tournamentId: string;
  teamId: string;
  gamePlayerId: string;
  agreedToRules: boolean;
};

const emptyForm: FormState = {
  game: "",
  tournamentId: "",
  teamId: "",
  gamePlayerId: "",
  agreedToRules: false,
};

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

export function RegisterForm() {
  const searchParams = useSearchParams();
  const requestedTournamentId = searchParams.get("tournament") ?? "";
  const [player, setPlayer] = useState<PlayerSession | null>(() => readPlayerSession());
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [teams, setTeams] = useState<PublicTeam[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedRegistration, setCompletedRegistration] = useState<{ id: string; entryFee: number } | null>(null);

  const fetchTournaments = useCallback(async () => {
    setIsLoadingTournaments(true);
    setLoadError("");

    try {
      const response = await fetch("/api/tournaments", { cache: "no-store" });
      const data = (await response.json()) as PublicTournamentsResponse;
      if (!response.ok) throw new Error(data.message ?? "Failed to load tournaments.");

      const openTournaments = data.tournaments.filter((tournament) => tournament.status === "OPEN" && tournament.registrationOpen);
      setTournaments(openTournaments);
      const requestedTournament = openTournaments.find((tournament) => tournament.id === requestedTournamentId || tournament.slug === requestedTournamentId);

      setForm((current) => ({
        ...current,
        tournamentId: requestedTournament?.id ?? current.tournamentId,
        game: requestedTournament?.game ?? current.game,
        gamePlayerId: current.gamePlayerId || readPlayerSession()?.defaultGamePlayerId || "",
      }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load tournaments.");
    } finally {
      setIsLoadingTournaments(false);
    }
  }, [requestedTournamentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPlayer(readPlayerSession());
      void fetchTournaments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchTournaments]);

  const selectedTournament = tournaments.find((tournament) => tournament.id === form.tournamentId);
  const isTeamTournament = selectedTournament?.registrationType === "TEAM";
  const availableTournaments = useMemo(() => {
    if (!form.game) return tournaments;
    return tournaments.filter((tournament) => tournament.game === form.game);
  }, [form.game, tournaments]);

  useEffect(() => {
    if (!player || !isTeamTournament || !selectedTournament) {
      const clearTimer = window.setTimeout(() => setTeams([]), 0);
      return () => window.clearTimeout(clearTimer);
    }

    const timer = window.setTimeout(async () => {
      setIsLoadingTeams(true);
      try {
        const response = await fetch(`/api/teams?email=${encodeURIComponent(player.email)}&captainOnly=true&game=${encodeURIComponent(selectedTournament.game)}`, { cache: "no-store" });
        const data = (await response.json()) as TeamsResponse;
        setTeams(response.ok ? data.teams : []);
      } finally {
        setIsLoadingTeams(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isTeamTournament, player, selectedTournament]);

  function updateField<Field extends keyof FormState>(field: Field, value: FormState[Field]) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "game") {
        next.tournamentId = "";
        next.teamId = "";
      }
      if (field === "tournamentId") {
        const tournament = tournaments.find((item) => item.id === value);
        next.game = tournament?.game ?? next.game;
        next.teamId = "";
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSuccessMessage("");
    setSubmitError("");
    setCompletedRegistration(null);
  }

  function validateForm() {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    const gamePlayerError = validateGamePlayerId(form.gamePlayerId, player?.platformId);

    if (!form.tournamentId) nextErrors.tournamentId = "Choose a tournament.";
    if (!form.game) nextErrors.game = "Choose a football category.";
    if (isTeamTournament && !form.teamId) nextErrors.teamId = "Choose a team you captain before joining this team tournament.";
    if (gamePlayerError) nextErrors.gamePlayerId = gamePlayerError;
    if (!form.agreedToRules) nextErrors.agreedToRules = "You must agree to the tournament rules.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!player) return;
    if (!validateForm() || !form.game) return;

    setIsSubmitting(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: player.fullName,
          email: player.email,
          phoneNumber: player.phone,
          gamerTag: player.gamerTag ?? player.fullName,
          game: form.game,
          tournamentId: form.tournamentId,
          teamId: isTeamTournament ? form.teamId : undefined,
          platformId: form.gamePlayerId.trim(),
          whatsappNumber: player.whatsapp ?? player.phone,
          agreedToRules: form.agreedToRules,
        }),
      });
      const data = (await response.json()) as { message?: string; registration?: { id: string; entryFee: number } };

      if (!response.ok) throw new Error(data.message ?? "Failed to submit registration.");

      setForm({ ...emptyForm, gamePlayerId: player.defaultGamePlayerId ?? "" });
      setErrors({});
      setTeams([]);
      setSuccessMessage(data.message ?? "Registration submitted successfully.");
      setCompletedRegistration(data.registration ? { id: data.registration.id, entryFee: data.registration.entryFee } : null);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit registration.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startPaystack(registrationId: string) {
    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId }),
      });
      const data = (await response.json()) as { message?: string; authorization_url?: string };
      if (!response.ok || !data.authorization_url) throw new Error(data.message ?? "Could not start Paystack payment.");
      window.location.href = data.authorization_url;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not start payment.");
    }
  }

  if (!player) {
    return (
      <section className="rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-6 text-center shadow-2xl shadow-cyan-950/30 sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Player account required</p>
        <h2 className="mt-3 text-3xl font-black text-white">Create an account first before registering for a tournament.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">Your account gives you a Platform ID, saves your contact details, and lets you track payments, matches, results, and rankings.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white">Create Player Account</Link>
          <Link href="/login" className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200">Login</Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/30 sm:p-8">
      <div className="mb-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-4 text-sm text-cyan-100">
        <p className="font-black text-white">Registering as {player.fullName}</p>
        <p className="mt-1">Platform ID: <span className="font-black">{player.platformId || "Not generated yet"}</span></p>
        <p className="mt-1 text-cyan-100/80">Saved phone: {player.phone || "Not set"} {player.whatsapp ? ` | WhatsApp: ${player.whatsapp}` : ""}</p>
      </div>

      {successMessage ? (
        <div className="mb-6 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-200">
          {successMessage}
          {completedRegistration && completedRegistration.entryFee > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => startPaystack(completedRegistration.id)} className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white">Pay with Paystack</button>
              <a href={`/player/payments/bank-transfer?registrationId=${completedRegistration.id}`} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950">Pay by Bank Transfer</a>
            </div>
          ) : completedRegistration ? <p className="mt-3 text-emerald-100">This tournament is free.</p> : null}
        </div>
      ) : null}

      {(submitError || loadError) ? <div className="mb-6 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-200">{submitError || loadError}</div> : null}

      {selectedTournament ? <div className="mb-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100">{selectedTournament.registrationType === "TEAM" ? `Team tournament${selectedTournament.teamSize ? ` - ${selectedTournament.teamSize} active members required` : ""}. Only the captain can register.` : "Solo tournament. Register as an individual player."}</div> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Football category" error={errors.game}><select value={form.game} onChange={(event) => updateField("game", event.target.value as PublicGameTitle | "")} className="form-input" disabled={isLoadingTournaments}><option value="">{isLoadingTournaments ? "Loading categories..." : "Select football category"}</option>{publicGameOptions.filter((game) => game.value !== "All").map((game) => <option key={game.value} value={game.value}>{game.label}</option>)}</select></FormField>
        <FormField label="Tournament" error={errors.tournamentId}><select value={form.tournamentId} onChange={(event) => updateField("tournamentId", event.target.value)} className="form-input" disabled={isLoadingTournaments}><option value="">{isLoadingTournaments ? "Loading tournaments..." : "Select tournament"}</option>{availableTournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.title} ({formatGame(tournament.game)}) - {tournament.registrationType}</option>)}</select></FormField>
                {isTeamTournament ? (
          <div className="md:col-span-2">
            {teams.length === 0 && !isLoadingTeams ? (
              <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
                <p className="font-black text-amber-100">You do not have a team yet. Create one first.</p>
                <p className="mt-2 text-sm leading-6 text-amber-100/80">Only captains can register teams. After creating your team, invite members by Platform ID and return here.</p>
                <Link href={`/teams/create?game=${selectedTournament?.game ?? form.game}&returnTo=${encodeURIComponent(`/register?tournament=${form.tournamentId}`)}`} className="mt-4 inline-block rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white">Create Team</Link>
              </div>
            ) : (
              <FormField label={`Team ${selectedTournament?.teamSize ? `(needs ${selectedTournament.teamSize})` : ""}`} error={errors.teamId} helper="Choose a team where you are the captain. The team must have enough active members for this tournament.">
                <select value={form.teamId} onChange={(event) => updateField("teamId", event.target.value)} className="form-input" disabled={isLoadingTeams || teams.length === 0}>
                  <option value="">{isLoadingTeams ? "Loading your captain teams..." : "Select team"}</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>[{team.tag}] {team.name} - {team.activeMemberCount} active members</option>)}
                </select>
              </FormField>
            )}
          </div>
        ) : null}
                <FormField label="Football Player ID / UID" error={errors.gamePlayerId} helper={`This is not your Platform ID (${player.platformId || "AK-000001"}). Enter the ID used for your selected football category.`}>
          <input value={form.gamePlayerId} onChange={(event) => updateField("gamePlayerId", event.target.value)} className="form-input" placeholder="Enter football player ID" />
          <div className="mt-3 grid gap-1 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400 sm:grid-cols-2">
            <span>Football ID example: 123456789</span>
            <span>Club Challenge ID example: CLUB-778899</span>
            <span>School Cup ID example: SCHOOL-12345</span>
            <span>Community Cup ID example: COMMUNITY-67890</span>
          </div>
        </FormField>
      </div>

      <label className="mt-6 flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300"><input type="checkbox" checked={form.agreedToRules} onChange={(event) => updateField("agreedToRules", event.target.checked)} className="mt-1 h-4 w-4 accent-cyan-300" /><span>I agree to follow the tournament rules and accept admin decisions during disputes.</span></label>
      {errors.agreedToRules ? <p className="mt-2 text-sm font-semibold text-rose-300">{errors.agreedToRules}</p> : null}

      <button className="mt-7 w-full rounded-lg bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.35)] transition hover:-translate-y-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting || isLoadingTournaments || (Boolean(isTeamTournament) && teams.length === 0)}>{isSubmitting ? "Submitting..." : "Join Tournament"}</button>
    </form>
  );
}

type FormFieldProps = { label: string; error?: string; helper?: string; children: React.ReactNode };

function FormField({ label, error, helper, children }: FormFieldProps) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-200">{label}</span>{children}{helper ? <span className="mt-2 block text-xs leading-5 text-slate-400">{helper}</span> : null}{error ? <span className="mt-2 block text-sm font-semibold text-rose-300">{error}</span> : null}</label>;
}



