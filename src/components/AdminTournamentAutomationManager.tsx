"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AutomationSetting = {
  id: string;
  tournamentId: string;
  autoApprovePaidPlayers: boolean;
  autoCloseRegistration: boolean;
  autoGenerateFixtures: boolean;
  autoNotifyPlayers: boolean;
  autoFeatureFinals: boolean;
  createdAt: string;
  updatedAt: string;
};

type AutomationResponse = {
  message?: string;
  tournament?: { id: string; title: string };
  setting?: AutomationSetting;
  actions?: string[];
};

const automationOptions: Array<{ key: keyof Pick<AutomationSetting, "autoApprovePaidPlayers" | "autoCloseRegistration" | "autoGenerateFixtures" | "autoNotifyPlayers" | "autoFeatureFinals">; label: string; description: string }> = [
  { key: "autoApprovePaidPlayers", label: "Auto approve paid players", description: "Approve pending registrations after Paystack or successful payment confirmation." },
  { key: "autoCloseRegistration", label: "Auto close registration", description: "Close registration when the tournament start date has passed." },
  { key: "autoGenerateFixtures", label: "Auto generate fixtures", description: "Generate fixtures after registration is closed and no matches exist yet." },
  { key: "autoNotifyPlayers", label: "Auto notify players", description: "Send match notifications when automation generates fixtures." },
  { key: "autoFeatureFinals", label: "Auto feature finals", description: "Mark final and semifinal rounds as featured livestream matches." },
];

export function AdminTournamentAutomationManager({ tournamentId }: { tournamentId: string }) {
  const [tournamentTitle, setTournamentTitle] = useState("Tournament");
  const [setting, setSetting] = useState<AutomationSetting | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAutomation = useCallback(async () => {
    setError("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/automation`, { cache: "no-store" });
      const data = (await response.json()) as AutomationResponse;
      if (!response.ok || !data.setting) throw new Error(data.message ?? "Could not load automation settings.");
      setSetting(data.setting);
      setTournamentTitle(data.tournament?.title ?? "Tournament");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not load automation settings.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAutomation();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAutomation]);

  function updateField(key: keyof AutomationSetting, value: boolean) {
    if (!setting) return;
    setSetting({ ...setting, [key]: value });
    setSuccess("");
    setError("");
  }

  async function saveSettings() {
    if (!setting) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/automation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setting),
      });
      const data = (await response.json()) as AutomationResponse;
      if (!response.ok || !data.setting) throw new Error(data.message ?? "Could not save automation settings.");
      setSetting(data.setting);
      setSuccess(data.message ?? "Automation settings saved.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not save automation settings.");
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);
    setError("");
    setSuccess("");
    setActions([]);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/run-automation`, { method: "POST" });
      const data = (await response.json()) as AutomationResponse;
      if (!response.ok) throw new Error(data.message ?? "Could not run automation.");
      setActions(data.actions ?? []);
      setSuccess(data.message ?? "Automation completed.");
      await loadAutomation();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not run automation.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl px-5 py-12 text-slate-300 lg:px-8">Loading automation settings...</section>;
  }

  if (!setting) {
    return <section className="mx-auto max-w-7xl px-5 py-12 text-rose-200 lg:px-8">{error || "Automation settings could not be loaded."}</section>;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end">
        <div>
          <Link href="/admin/tournaments" className="text-sm font-bold text-cyan-300 transition hover:text-white">Back to admin tournaments</Link>
          <p className="mt-5 text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Tournament automation</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">{tournamentTitle}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Turn on safe automation for common admin actions. Manual controls remain available.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={saveSettings} disabled={saving} type="button" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950 disabled:opacity-50">
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button onClick={runNow} disabled={running} type="button" className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">
            {running ? "Running..." : "Run Automation Now"}
          </button>
        </div>
      </div>

      {success ? <Message tone="success" text={success} /> : null}
      {error ? <Message tone="error" text={error} /> : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {automationOptions.map((option) => (
          <label key={option.key} className="flex min-h-32 gap-4 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20">
            <input type="checkbox" checked={Boolean(setting[option.key])} onChange={(event) => updateField(option.key, event.target.checked)} className="mt-1 h-5 w-5 accent-cyan-300" />
            <span>
              <span className="block text-base font-black text-white">{option.label}</span>
              <span className="mt-2 block text-sm leading-6 text-slate-400">{option.description}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Last automation run</p>
        {actions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No actions recorded yet. Click Run Automation Now after saving settings.</p>
        ) : (
          <ul className="mt-4 grid gap-2 text-sm text-slate-200">
            {actions.map((action) => <li key={action} className="rounded-lg bg-white/[0.04] px-4 py-3">{action}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  const className = tone === "success" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-rose-300/30 bg-rose-300/10 text-rose-200";
  return <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${className}`}>{text}</div>;
}