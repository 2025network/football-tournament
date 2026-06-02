"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { publicGameOptions, type PublicGameTitle } from "@/types/public-tournament";
import type { PlayerSession } from "@/components/PlayerAuthGate";
import type { TeamResponse } from "@/types/team";

const sessionKey = "football-tournament-player-session";

type FormState = {
  name: string;
  tag: string;
  logoUrl: string;
  game: PublicGameTitle;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  tag: "",
  logoUrl: "",
  game: "PUBG_MOBILE",
  description: "",
};

function readSession() {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(sessionKey);
  if (!stored) return null;
  try { return JSON.parse(stored) as PlayerSession; } catch { return null; }
}

export function TeamCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [player, setPlayer] = useState<PlayerSession | null>(null);
  const [form, setForm] = useState<FormState>(() => ({ ...emptyForm, game: (searchParams.get("game") as PublicGameTitle) || emptyForm.game }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const session = readSession();
      if (!session) router.replace("/login");
      setPlayer(session);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  function update<Field extends keyof FormState>(field: Field, value: FormState[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!player) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captainEmail: player.email }),
      });
      const data = (await response.json()) as TeamResponse;
      if (!response.ok || !data.team) throw new Error(data.message ?? "Could not create team.");
      router.push(searchParams.get("returnTo") || `/teams/${data.team.id}`);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not create team.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Create team</p>
        <h1 className="mt-3 text-3xl font-black text-white">Build your clan</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">The logged-in player becomes captain automatically. After creating the team, invite members from Player Teams using their Platform ID.</p>

        {player ? <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100"><span className="font-black text-white">Captain:</span> {player.fullName} {player.platformId ? `(${player.platformId})` : ""}</div> : null}\n        {error ? <div className="mt-5 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-200">{error}</div> : null}

        <div className="mt-6 grid gap-4">
          <Field label="Team name"><input className="form-input" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Delta Squad" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Team tag optional"><input className="form-input" value={form.tag} onChange={(event) => update("tag", event.target.value)} placeholder="Auto generated from team name" maxLength={8} /></Field>
            <Field label="Game"><select className="form-input" value={form.game} onChange={(event) => update("game", event.target.value as PublicGameTitle)}>{publicGameOptions.filter((game) => game.value !== "All").map((game) => <option key={game.value} value={game.value}>{game.label}</option>)}</select></Field>
          </div>
          <Field label="Team logo upload placeholder"><input className="form-input" value={form.logoUrl} onChange={(event) => update("logoUrl", event.target.value)} placeholder="Paste logo URL for now. Upload will come later." /></Field>
          <Field label="Description optional"><textarea className="form-input min-h-28 resize-y" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Tell players what your team is about." /></Field>
        </div>

        <button disabled={saving || !player} className="mt-6 w-full rounded-lg bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-white disabled:opacity-60" type="submit">
          {saving ? "Creating..." : "Create Team"}
        </button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-sm font-black text-slate-200">{label}</span>{children}</label>;
}
