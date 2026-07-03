"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CheckStatus = "pass" | "warning" | "fail";

type ProductionCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  configured: boolean;
  message: string;
  category: "Database" | "Environment" | "Payments" | "Uploads" | "Build" | "Security";
};

type ChecklistResponse = {
  checks: ProductionCheck[];
  summary: Record<CheckStatus, number>;
  generatedAt: string;
  message?: string;
};

const categoryOrder: ProductionCheck["category"][] = ["Database", "Environment", "Payments", "Uploads", "Build", "Security"];

export function AdminProductionChecklist() {
  const [checks, setChecks] = useState<ProductionCheck[]>([]);
  const [summary, setSummary] = useState<Record<CheckStatus, number>>({ pass: 0, warning: 0, fail: 0 });
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const groupedChecks = useMemo(() => {
    return categoryOrder.map((category) => ({ category, items: checks.filter((check) => check.category === category) })).filter((group) => group.items.length > 0);
  }, [checks]);

  const launchReady = summary.fail === 0 && summary.warning === 0 && checks.length > 0;

  const loadChecklist = useCallback(async () => {
    setError("");
    setRefreshing(true);

    try {
      const response = await fetch("/api/admin/production-checklist", { cache: "no-store" });
      const data = (await response.json()) as ChecklistResponse;
      if (!response.ok) throw new Error(data.message ?? "Could not load production checklist.");
      setChecks(data.checks);
      setSummary(data.summary);
      setGeneratedAt(data.generatedAt);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not load production checklist.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadChecklist();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadChecklist]);

  if (loading) {
    return <section className="mx-auto max-w-7xl px-5 py-12 text-slate-300 lg:px-8">Loading production checklist...</section>;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Production readiness</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Deployment checklist</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Check the important settings your football tournament platform needs before moving from local development to a VPS or production host.</p>
        </div>
        <button onClick={() => void loadChecklist()} disabled={refreshing} type="button" className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">
          {refreshing ? "Checking..." : "Refresh Checks"}
        </button>
      </div>

      {error ? <div className="mt-5 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-200">{error}</div> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Ready" value={summary.pass} tone="pass" />
        <SummaryCard label="Warnings" value={summary.warning} tone="warning" />
        <SummaryCard label="Missing" value={summary.fail} tone="fail" />
      </div>

      <div className={`mt-6 rounded-2xl border px-5 py-4 text-sm font-bold ${launchReady ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}>
        {launchReady ? "Everything on this checklist is ready for production." : "Fix missing items and review warnings before deploying to production."}
        {generatedAt ? <span className="mt-1 block text-xs font-semibold opacity-80">Last checked: {new Date(generatedAt).toLocaleString()}</span> : null}
      </div>

      <div className="mt-8 grid gap-6">
        {groupedChecks.map((group) => (
          <div key={group.category} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-black text-white">{group.category}</h2>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{group.items.length} checks</span>
            </div>
            <div className="mt-5 grid gap-3">
              {group.items.map((check) => <CheckRow key={check.key} check={check} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: CheckStatus }) {
  const toneClass = {
    pass: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    warning: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    fail: "border-rose-300/30 bg-rose-300/10 text-rose-200",
  }[tone];

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-sm font-black uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-3 text-4xl font-black">{value}</p>
    </div>
  );
}

function CheckRow({ check }: { check: ProductionCheck }) {
  const statusClass = {
    pass: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    warning: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    fail: "border-rose-300/30 bg-rose-300/10 text-rose-200",
  }[check.status];

  const statusLabel = check.status === "pass" ? "Configured" : check.status === "warning" ? "Review" : "Missing";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-black text-white">{check.label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">{check.message}</p>
        </div>
        <span className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${statusClass}`}>{statusLabel}</span>
      </div>
    </div>
  );
}
