"use client";

import { useCallback, useEffect, useState } from "react";

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  awardedCount: number;
};

type AwardedAchievement = {
  id: string;
  playerName: string;
  playerEmail: string;
  platformId: string | null;
  achievementName: string;
  achievementIcon: string | null;
  unlockedAt: string;
};

export function AdminAchievementsManager() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [awarded, setAwarded] = useState<AwardedAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAchievements = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/achievements", { cache: "no-store" });
      const data = (await response.json()) as { achievements?: Achievement[]; awarded?: AwardedAchievement[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not load achievements.");
      setAchievements(data.achievements ?? []);
      setAwarded(data.awarded ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load achievements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAchievements();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAchievements]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="border-b border-white/10 pb-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Admin achievements</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Player Badges</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">View default achievement badges and the latest awards unlocked by players after rated penalty matches.</p>
      </div>

      {error ? <p className="mt-6 rounded-lg border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-2xl font-black text-white">Default Badges</h2>
          {loading ? <p className="mt-5 text-sm text-slate-400">Loading badges...</p> : (
            <div className="mt-5 grid gap-3">
              {achievements.map((achievement) => (
                <article key={achievement.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-white"><span className="mr-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-xs text-cyan-100">{achievement.icon ?? "BADGE"}</span>{achievement.name}</p>
                      <p className="mt-2 text-sm text-slate-400">{achievement.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">{achievement.awardedCount}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-2xl font-black text-white">Recently Awarded</h2>
          {loading ? <p className="mt-5 text-sm text-slate-400">Loading awarded badges...</p> : awarded.length === 0 ? (
            <p className="mt-5 rounded-lg border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">No player achievements have been awarded yet.</p>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
              {awarded.map((item) => (
                <article key={item.id} className="grid gap-2 border-b border-white/10 bg-slate-950/50 p-4 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
                  <div>
                    <p className="font-black text-white">{item.playerName}</p>
                    <p className="text-xs text-slate-500">{item.platformId ?? item.playerEmail}</p>
                  </div>
                  <p className="text-sm font-bold text-cyan-100">{item.achievementIcon ?? "BADGE"} {item.achievementName}</p>
                  <p className="text-xs text-slate-500">{formatDate(item.unlockedAt)}</p>
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
