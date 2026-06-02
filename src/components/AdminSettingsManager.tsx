"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Setting = {
  key: string;
  label: string;
  group: string;
  value: string;
  type: "TEXT" | "LONG_TEXT" | "URL" | "IMAGE" | "JSON";
  updatedAt: string;
};

type SettingsResponse = { settings: Setting[]; message?: string };

const groupOrder = ["Brand", "Homepage", "Contact", "Payments", "Rules", "Footer"];

export function AdminSettingsManager() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const groupedSettings = useMemo(() => {
    return groupOrder.map((group) => ({ group, items: settings.filter((setting) => setting.group === group) })).filter((section) => section.items.length > 0);
  }, [settings]);

  const loadSettings = useCallback(async () => {
    setError("");

    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = (await response.json()) as SettingsResponse;
      if (!response.ok) throw new Error(data.message ?? "Could not load website settings.");
      setSettings(data.settings);
      setValues(data.settings.reduce<Record<string, string>>((next, setting) => {
        next[setting.key] = setting.value;
        return next;
      }, {}));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not load website settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSettings]);

  async function saveSettings() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values }),
      });
      const data = (await response.json()) as SettingsResponse;
      if (!response.ok) throw new Error(data.message ?? "Could not save website settings.");
      setSettings(data.settings);
      setSuccess("Website content saved successfully.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not save website settings.");
    } finally {
      setSaving(false);
    }
  }

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl px-5 py-12 text-slate-300 lg:px-8">Loading website settings...</section>;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Website CMS</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Edit public website content</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Control homepage text, footer links, support contacts, payment bank details, FAQs, and default tournament rules.</p>
        </div>
        <button onClick={saveSettings} disabled={saving} type="button" className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {success ? <Message tone="success" text={success} /> : null}
      {error ? <Message tone="error" text={error} /> : null}

      <div className="mt-8 grid gap-6">
        {groupedSettings.map((section) => (
          <div key={section.group} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20 sm:p-6">
            <h2 className="text-lg font-black text-white">{section.group}</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {section.items.map((setting) => (
                <label key={setting.key} className={setting.type === "LONG_TEXT" || setting.type === "JSON" ? "md:col-span-2" : ""}>
                  <span className="mb-2 block text-sm font-black text-slate-200">{setting.label}</span>
                  {setting.type === "LONG_TEXT" || setting.type === "JSON" ? (
                    <textarea className="form-input min-h-32 resize-y" value={values[setting.key] ?? ""} onChange={(event) => updateValue(setting.key, event.target.value)} />
                  ) : (
                    <input className="form-input" value={values[setting.key] ?? ""} onChange={(event) => updateValue(setting.key, event.target.value)} />
                  )}
                  {setting.type === "JSON" ? <span className="mt-2 block text-xs text-slate-500">Use JSON format with label and href fields for each social link.</span> : null}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  const className = tone === "success" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-rose-300/30 bg-rose-300/10 text-rose-200";
  return <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${className}`}>{text}</div>;
}