"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  ratedPlayers: number;
};

const emptyForm = {
  name: "",
  startDate: "",
  endDate: "",
  active: true,
};

export function AdminSeasonsManager() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSeasons = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/seasons", { cache: "no-store" });
      const data = (await response.json()) as { seasons?: Season[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not load seasons.");
      setSeasons(data.seasons ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load seasons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSeasons();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSeasons]);

  async function createSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not create season.");
      setMessage(data.message ?? "Season created.");
      setForm(emptyForm);
      await loadSeasons();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create season.");
    } finally {
      setSaving(false);
    }
  }

  async function setActiveSeason(season: Season) {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/seasons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: season.id, active: true }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not activate season.");
      setMessage(`${season.name} is now the active season.`);
      await loadSeasons();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not activate season.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="border-b border-white/10 pb-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Admin seasons</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Rating Seasons</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Create leaderboard seasons and choose which one receives new penalty match rating updates. Only one season can be active at a time.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={createSeason} className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-2xl font-black text-white">Create Season</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-slate-200">
              Season name
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300" placeholder="Season 1 - 2026" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-200">
              Start date
              <input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-200">
              End date
              <input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300" />
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Make this the active season
            </label>
          </div>
          <button disabled={saving} type="submit" className="mt-5 w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-60">
            {saving ? "Saving..." : "Create Season"}
          </button>
          {message ? <p className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}
          {error ? <p className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        </form>

        <section className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-2xl font-black text-white">All Seasons</h2>
          {loading ? (
            <p className="mt-5 text-sm text-slate-400">Loading seasons...</p>
          ) : seasons.length === 0 ? (
            <p className="mt-5 rounded-lg border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">No seasons yet. Create your first active season before rating matches.</p>
          ) : (
            <div className="mt-5 grid gap-3">
              {seasons.map((season) => (
                <article key={season.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-white">{season.name}</h3>
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${season.active ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>
                          {season.active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{formatDate(season.startDate)} - {formatDate(season.endDate)}</p>
                      <p className="mt-1 text-sm text-cyan-200">{season.ratedPlayers} rated players</p>
                    </div>
                    {!season.active ? (
                      <button disabled={saving} onClick={() => setActiveSeason(season)} type="button" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950 disabled:opacity-60">
                        Make Active
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
