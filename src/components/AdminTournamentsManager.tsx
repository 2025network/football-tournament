"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CompetitionFormat, GameTitle, RegistrationType, StreamPlatform, TournamentStatus } from "@/generated/prisma/client";

type AdminTournament = {
  id: string;
  slug: string;
  title: string;
  game: GameTitle;
  prizePool: number;
  entryFee: number;
  slots: number;
  registeredPlayers: number;
  startDate: string;
  status: TournamentStatus;
  format: string;
  competitionFormat: CompetitionFormat;
  registrationLimit: number | null;
  allowUnlimitedRegistration: boolean;
  registrationOpen: boolean;
  useHomeAndAway: boolean;
  registrationType: RegistrationType;
  teamSize: number | null;
  livestreamUrl: string | null;
  streamPlatform: StreamPlatform | null;
  description: string;
  rules: string[];
  createdAt: string;
};

type TournamentsResponse = {
  tournaments: AdminTournament[];
  message?: string;
};

type TournamentResponse = {
  tournament?: AdminTournament;
  message?: string;
};

type SettingsResponse = {
  values?: Record<string, string>;
};

type FormState = {
  title: string;
  game: GameTitle;
  prizePool: string;
  entryFee: string;
  slots: string;
  startDate: string;
  status: TournamentStatus;
  format: string;
  competitionFormat: CompetitionFormat;
  registrationLimit: string;
  allowUnlimitedRegistration: boolean;
  registrationOpen: boolean;
  useHomeAndAway: boolean;
  registrationType: RegistrationType;
  teamSize: string;
  livestreamUrl: string;
  streamPlatform: StreamPlatform | "";
  description: string;
  rules: string;
};

const gameOptions = [
  { label: "eFootball Mobile", value: GameTitle.EFOOTBALL_MOBILE },
  { label: "PUBG Mobile", value: GameTitle.PUBG_MOBILE },
  { label: "COD Mobile", value: GameTitle.COD_MOBILE },
  { label: "Free Fire", value: GameTitle.FREE_FIRE },
];

const competitionOptions = [
  { label: "Open Knockout", value: CompetitionFormat.OPEN_KNOCKOUT },
  { label: "Double Elimination", value: CompetitionFormat.DOUBLE_ELIMINATION },
  { label: "League", value: CompetitionFormat.LEAGUE },
  { label: "Champions League", value: CompetitionFormat.CHAMPIONS_LEAGUE },
  { label: "Swiss System", value: CompetitionFormat.SWISS_SYSTEM },
];

const competitionDescriptions: Record<CompetitionFormat, string> = {
  [CompetitionFormat.OPEN_KNOCKOUT]: "Single-loss bracket. Players or teams are eliminated after one defeat until one champion remains.",
  [CompetitionFormat.DOUBLE_ELIMINATION]: "Bracket with a winners side and losers side. A participant is eliminated after two defeats.",
  [CompetitionFormat.LEAGUE]: "Everyone plays scheduled fixtures and earns table points. Best record wins the league.",
  [CompetitionFormat.CHAMPIONS_LEAGUE]: "Group stage followed by knockout rounds for qualifiers, similar to a Champions League structure.",
  [CompetitionFormat.SWISS_SYSTEM]: "Players or teams face opponents with similar records across multiple rounds without immediate elimination.",
};

const statusOptions = [TournamentStatus.OPEN, TournamentStatus.UPCOMING, TournamentStatus.CLOSED];
const streamPlatformOptions = [StreamPlatform.YOUTUBE, StreamPlatform.FACEBOOK, StreamPlatform.TWITCH, StreamPlatform.TIKTOK, StreamPlatform.OTHER];

const emptyForm: FormState = {
  title: "",
  game: GameTitle.EFOOTBALL_MOBILE,
  prizePool: "",
  entryFee: "",
  slots: "",
  startDate: "",
  status: TournamentStatus.UPCOMING,
  format: "",
  competitionFormat: CompetitionFormat.OPEN_KNOCKOUT,
  registrationLimit: "",
  allowUnlimitedRegistration: false,
  registrationOpen: true,
  useHomeAndAway: false,
  registrationType: RegistrationType.SOLO,
  teamSize: "",
  livestreamUrl: "",
  streamPlatform: "",
  description: "",
  rules: "",
};
const seedTemplates: Array<{ label: string; data: FormState }> = [
  { label: "Create eFootball Test Tournament", data: { ...emptyForm, title: "eFootball Test Cup", game: GameTitle.EFOOTBALL_MOBILE, prizePool: "50000", entryFee: "1000", slots: "32", startDate: futureDateInput(7), status: TournamentStatus.OPEN, format: "1v1 test knockout bracket", competitionFormat: CompetitionFormat.OPEN_KNOCKOUT, description: "Quick eFootball test tournament for local registration testing.", rules: "Use correct game UID\nSubmit proof after match\nRespect opponents" } },
  { label: "Create PUBG Squad Test Tournament", data: { ...emptyForm, title: "PUBG Squad Test", game: GameTitle.PUBG_MOBILE, prizePool: "150000", entryFee: "3000", slots: "16", startDate: futureDateInput(10), status: TournamentStatus.OPEN, format: "Squad league test format", competitionFormat: CompetitionFormat.LEAGUE, registrationType: RegistrationType.TEAM, teamSize: "4", description: "Quick PUBG squad tournament for team registration testing.", rules: "Captain registers team\nFour active members required\nSubmit match proof" } },
  { label: "Create COD 5v5 Test Tournament", data: { ...emptyForm, title: "COD Mobile 5v5 Test", game: GameTitle.COD_MOBILE, prizePool: "120000", entryFee: "2500", slots: "16", startDate: futureDateInput(12), status: TournamentStatus.OPEN, format: "5v5 double elimination", competitionFormat: CompetitionFormat.DOUBLE_ELIMINATION, registrationType: RegistrationType.TEAM, teamSize: "5", description: "Quick COD Mobile 5v5 tournament for testing team workflows.", rules: "Five active members required\nNo account sharing\nSubmit score proof" } },
  { label: "Create Free Fire Squad Test Tournament", data: { ...emptyForm, title: "Free Fire Squad Test", game: GameTitle.FREE_FIRE, prizePool: "100000", entryFee: "2000", slots: "20", startDate: futureDateInput(14), status: TournamentStatus.OPEN, format: "Squad Swiss test rounds", competitionFormat: CompetitionFormat.SWISS_SYSTEM, registrationType: RegistrationType.TEAM, teamSize: "4", description: "Quick Free Fire squad tournament for testing registrations and teams.", rules: "Captain registers team\nFour active members required\nUpload result proof" } },
];

export function AdminTournamentsManager() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [defaultRules, setDefaultRules] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");


  const fetchDefaultRules = useCallback(async () => {
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const data = (await response.json()) as SettingsResponse;
      const rules = data.values?.tournament_rules_text ?? "";
      setDefaultRules(rules);
      setForm((current) => current.rules || editingId ? current : { ...current, rules });
    } catch {
      setDefaultRules("");
    }
  }, [editingId]);
  const fetchTournaments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/tournaments", { cache: "no-store" });
      const data = (await response.json()) as TournamentsResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to load tournaments.");
      }

      setTournaments(data.tournaments);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load tournaments.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTournaments();
      void fetchDefaultRules();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchDefaultRules, fetchTournaments]);

  const formTitle = editingId ? "Edit tournament" : "Create tournament";
  const sortedTournaments = useMemo(() => {
    return [...tournaments].sort((a, b) => new Date(b.createdAt ?? b.startDate).getTime() - new Date(a.createdAt ?? a.startDate).getTime());
  }, [tournaments]);

  function updateField<Field extends keyof FormState>(field: Field, value: FormState[Field]) {
    setForm((current) => field === "registrationType" && value === RegistrationType.SOLO ? { ...current, registrationType: value as RegistrationType, teamSize: "" } : { ...current, [field]: value });
    setErrorMessage("");
    setSuccessMessage("");
  }

  function startEdit(tournament: AdminTournament) {
    setEditingId(tournament.id);
    setForm({
      title: tournament.title,
      game: tournament.game,
      prizePool: tournament.prizePool.toString(),
      entryFee: tournament.entryFee.toString(),
      slots: tournament.slots.toString(),
      startDate: toDateInputValue(tournament.startDate),
      status: tournament.status,
      format: tournament.format,
      competitionFormat: tournament.competitionFormat ?? CompetitionFormat.OPEN_KNOCKOUT,
      registrationLimit: tournament.registrationLimit?.toString() ?? "",
      allowUnlimitedRegistration: tournament.allowUnlimitedRegistration,
      registrationOpen: tournament.registrationOpen,
      useHomeAndAway: tournament.useHomeAndAway,
      registrationType: tournament.registrationType ?? RegistrationType.SOLO,
      teamSize: tournament.teamSize?.toString() ?? "",
      livestreamUrl: tournament.livestreamUrl ?? "",
      streamPlatform: tournament.streamPlatform ?? "",
      description: tournament.description,
      rules: tournament.rules.join("\n"),
    });
    setSuccessMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm({ ...emptyForm, rules: defaultRules });
    setEditingId(null);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function tournamentPayload(source: FormState | AdminTournament, overrideStatus?: TournamentStatus) {
    return {
      title: source.title,
      game: source.game,
      prizePool: Number(source.prizePool),
      entryFee: Number(source.entryFee),
      slots: Number(source.slots),
      startDate: source.startDate,
      status: overrideStatus ?? source.status,
      format: source.format,
      competitionFormat: source.competitionFormat,
      registrationLimit: typeof source.registrationLimit === "number" ? source.registrationLimit : source.registrationLimit || null,
      allowUnlimitedRegistration: source.allowUnlimitedRegistration,
      registrationOpen: source.registrationOpen,
      useHomeAndAway: source.useHomeAndAway,
      registrationType: source.registrationType,
      teamSize: source.registrationType === RegistrationType.TEAM ? (typeof source.teamSize === "number" ? source.teamSize : source.teamSize || null) : null,
      livestreamUrl: source.livestreamUrl || null,
      streamPlatform: source.streamPlatform || null,
      description: source.description,
      rules: Array.isArray(source.rules) ? source.rules : source.rules,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const validationError = validateTournamentForm(form);
      if (validationError) {
        throw new Error(validationError);
      }

      const endpoint = editingId ? `/api/tournaments/${editingId}` : "/api/tournaments";
      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tournamentPayload(form)),
      });
      const data = (await response.json()) as TournamentResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to save tournament.");
      }

      setSuccessMessage(data.message ?? "Tournament saved successfully.");
      resetForm();
      await fetchTournaments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save tournament.");
    } finally {
      setIsSaving(false);
    }
  }

  async function createSeedTournament(template: FormState) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tournamentPayload(template)),
      });
      const data = (await response.json()) as TournamentResponse;
      if (!response.ok) throw new Error(data.message ?? "Failed to create test tournament.");
      setSuccessMessage(data.message ?? "Test tournament created.");
      await fetchTournaments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create test tournament.");
    }
  }

  async function deleteTournament(tournament: AdminTournament) {
    const confirmed = window.confirm(`Delete ${tournament.title}? This also deletes its registrations and matches.`);

    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to delete tournament.");
      }

      setSuccessMessage(data.message ?? "Tournament deleted successfully.");
      await fetchTournaments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete tournament.");
    }
  }

  async function changeStatus(tournament: AdminTournament, status: TournamentStatus) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tournamentPayload(tournament, status)),
      });
      const data = (await response.json()) as TournamentResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to update status.");
      }

      setSuccessMessage("Tournament status updated.");
      await fetchTournaments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update status.");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Tournament form</p>
          <h2 className="mt-2 text-2xl font-black text-white">{formTitle}</h2>

          {successMessage ? <Message tone="success" text={successMessage} /> : null}
          {errorMessage ? <Message tone="error" text={errorMessage} /> : null}

          <div className="mt-6 grid gap-4">
            <FormLabel label="Title">
              <input className="form-input" value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Weekend Masters" />
            </FormLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormLabel label="Game">
                <select className="form-input" value={form.game} onChange={(event) => updateField("game", event.target.value as GameTitle)}>
                  {gameOptions.map((game) => <option key={game.value} value={game.value}>{game.label}</option>)}
                </select>
              </FormLabel>
              <FormLabel label="Status">
                <select className="form-input" value={form.status} onChange={(event) => updateField("status", event.target.value as TournamentStatus)}>
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </FormLabel>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormLabel label="Registration type">
                <select className="form-input" value={form.registrationType} onChange={(event) => updateField("registrationType", event.target.value as RegistrationType)}>
                  <option value={RegistrationType.SOLO}>Solo tournament</option>
                  <option value={RegistrationType.TEAM}>Team tournament</option>
                </select>
              </FormLabel>              {form.registrationType === RegistrationType.TEAM ? (
                <FormLabel label="Team size">
                  <input className="form-input" value={form.teamSize} onChange={(event) => updateField("teamSize", event.target.value)} placeholder="2, 4, or 5" type="number" min="2" required />
                </FormLabel>
              ) : null}
            </div>
            <FormLabel label="Competition format">
              <select className="form-input" value={form.competitionFormat} onChange={(event) => updateField("competitionFormat", event.target.value as CompetitionFormat)}>
                {competitionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <span className="mt-2 block rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-100">{competitionDescriptions[form.competitionFormat]}</span>
            </FormLabel>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormLabel label="Prize pool">
                <input className="form-input" value={form.prizePool} onChange={(event) => updateField("prizePool", event.target.value)} placeholder="50000" type="number" min="1" />
              </FormLabel>
              <FormLabel label="Entry fee">
                <input className="form-input" value={form.entryFee} onChange={(event) => updateField("entryFee", event.target.value)} placeholder="1000" type="number" min="0" />
              </FormLabel>
              <FormLabel label="Slots">
                <input className="form-input" value={form.slots} onChange={(event) => updateField("slots", event.target.value)} placeholder="64" type="number" min="1" />
              </FormLabel>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormLabel label="Registration limit optional">
                <input className="form-input" value={form.registrationLimit} onChange={(event) => updateField("registrationLimit", event.target.value)} placeholder="Leave empty to use slots" type="number" min="1" />
              </FormLabel>
              <FormLabel label="Start date">
                <input className="form-input" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} type="datetime-local" />
              </FormLabel>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Checkbox label="Allow unlimited registration" checked={form.allowUnlimitedRegistration} onChange={(checked) => updateField("allowUnlimitedRegistration", checked)} />
              <Checkbox label="Registration open" checked={form.registrationOpen} onChange={(checked) => updateField("registrationOpen", checked)} />
              <Checkbox label="Use home and away" checked={form.useHomeAndAway} onChange={(checked) => updateField("useHomeAndAway", checked)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormLabel label="Tournament livestream URL">
                <input className="form-input" value={form.livestreamUrl} onChange={(event) => updateField("livestreamUrl", event.target.value)} placeholder="https://youtube.com/watch?v=..." />
              </FormLabel>
              <FormLabel label="Stream platform">
                <select className="form-input" value={form.streamPlatform} onChange={(event) => updateField("streamPlatform", event.target.value as StreamPlatform | "")}>
                  <option value="">No stream</option>
                  {streamPlatformOptions.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </FormLabel>
            </div>
            <FormLabel label="Format note">
              <input className="form-input" value={form.format} onChange={(event) => updateField("format", event.target.value)} placeholder="1v1 knockout bracket" />
            </FormLabel>
            <FormLabel label="Description">
              <textarea className="form-input min-h-28 resize-y" value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe the tournament" />
            </FormLabel>
            <FormLabel label="Rules">
              <textarea className="form-input min-h-32 resize-y" value={form.rules} onChange={(event) => updateField("rules", event.target.value)} placeholder="One rule per line" />
            </FormLabel>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={isSaving} className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? "Saving..." : editingId ? "Update Tournament" : "Create Tournament"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Database tournaments</p>
          <h2 className="mt-2 text-2xl font-black text-white">Manage tournaments</h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {seedTemplates.map((template) => <button key={template.label} type="button" onClick={() => createSeedTournament(template.data)} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-left text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950">{template.label}</button>)}
          </div>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              <EmptyState title="Loading tournaments" message="Fetching tournaments from PostgreSQL." />
            ) : sortedTournaments.length === 0 ? (
              <EmptyState title="No tournaments yet" message="Create your first tournament using the form." />
            ) : (
              sortedTournaments.map((tournament) => (
                <article key={tournament.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{formatGame(tournament.game)}</p>
                      <h3 className="mt-2 text-xl font-black text-white">{tournament.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">{formatCompetition(tournament.competitionFormat)} - {tournament.format}</p>
                    </div>
                    <span className="w-fit rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">{tournament.status}</span>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <Info label="Prize" value={`NGN ${tournament.prizePool.toLocaleString()}`} />
                    <Info label="Entry" value={`NGN ${tournament.entryFee.toLocaleString()}`} />
                    <Info label="Registered" value={tournament.allowUnlimitedRegistration ? `${tournament.registeredPlayers} / Unlimited` : `${tournament.registeredPlayers} / ${tournament.registrationLimit ?? tournament.slots}`} />
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Registration {tournament.registrationOpen ? "Open" : "Closed"}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{tournament.useHomeAndAway ? "Home and Away" : "Single Fixture"}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{tournament.registrationType}{tournament.teamSize ? ` - ${tournament.teamSize} players` : ""}</span>
                    {tournament.livestreamUrl ? <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100">{tournament.streamPlatform ?? "STREAM"}</span> : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center">
                    <select className="form-input" value={tournament.status} onChange={(event) => changeStatus(tournament, event.target.value as TournamentStatus)}>
                      {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <Link href={`/admin/tournaments/${tournament.id}/competition`} className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-center text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950">
                      Competition
                    </Link>
                    <Link href={`/admin/tournaments/${tournament.id}/automation`} className="rounded-lg border border-violet-300/30 bg-violet-300/10 px-4 py-3 text-center text-sm font-black text-violet-100 transition hover:bg-violet-300 hover:text-slate-950">
                      Automation
                    </Link>
                    <button type="button" onClick={() => startEdit(tournament)} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteTournament(tournament)} className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-black text-rose-200 transition hover:bg-rose-300 hover:text-slate-950">
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FormLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-14 items-center gap-3 rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-cyan-300" />
      <span>{label}</span>
    </label>
  );
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  const className = tone === "success"
    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
    : "border-rose-300/30 bg-rose-300/10 text-rose-200";

  return <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${className}`}>{text}</div>;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 px-6 py-12 text-center">
      <p className="text-xl font-black text-white">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">{message}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-4 py-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="mt-1 font-black text-white">{value}</dd>
    </div>
  );
}

function formatGame(game: GameTitle) {
  return gameOptions.find((option) => option.value === game)?.label ?? game;
}

function formatCompetition(format: CompetitionFormat) {
  return competitionOptions.find((option) => option.value === format)?.label ?? format;
}

function toDateInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function validateTournamentForm(form: FormState) {
  if (!form.title.trim()) return "Tournament title is required.";
  if (!form.prizePool || Number(form.prizePool) < 0) return "Prize pool must be 0 or higher.";
  if (!form.entryFee || Number(form.entryFee) < 0) return "Entry fee must be 0 or higher.";
  if (!form.slots || Number(form.slots) < 1) return "Slots must be at least 1.";
  if (!form.startDate) return "Start date is required.";
  if (!form.format.trim()) return "Format note is required.";
  if (!form.description.trim()) return "Description is required.";
  if (!form.rules.trim()) return "Rules are required.";
  if (form.registrationLimit && Number(form.registrationLimit) < 1) return "Registration limit must be at least 1.";
  if (form.registrationType === RegistrationType.TEAM && (!form.teamSize || Number(form.teamSize) < 2)) return "Team tournaments need a team size of at least 2.";
  return "";
}



function futureDateInput(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(18, 0, 0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}



