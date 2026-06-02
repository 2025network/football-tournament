"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerDashboard } from "@/components/PlayerDashboard";

const playerSessionKey = "football-tournament-player-session";

export type PlayerSession = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

function readPlayerSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedSession = sessionStorage.getItem(playerSessionKey);

  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(storedSession) as PlayerSession;
  } catch {
    sessionStorage.removeItem(playerSessionKey);
    return null;
  }
}

export function PlayerAuthGate() {
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerSession | null>(() => readPlayerSession());

  useEffect(() => {
    if (!player) {
      router.replace("/login");
    }
  }, [player, router]);

  function logout() {
    sessionStorage.removeItem(playerSessionKey);
    setPlayer(null);
    router.replace("/login");
  }

  if (!player) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 text-center shadow-2xl shadow-cyan-950/20">
          <p className="text-xl font-black text-white">Checking player access</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Redirecting to login if no player session is active.</p>
        </div>
      </section>
    );
  }

  return <PlayerDashboard player={player} onLogout={logout} />;
}
