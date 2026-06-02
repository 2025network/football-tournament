"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { NotificationType } from "@/generated/prisma/client";

type PlayerSession = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

type PlayerNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  message?: string;
  unreadCount?: number;
  notifications?: PlayerNotification[];
};

const playerSessionKey = "football-tournament-player-session";

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

export function PlayerNotificationsManager() {
  const [player, setPlayer] = useState<PlayerSession | null>(() => readPlayerSession());
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    const currentPlayer = readPlayerSession();
    setPlayer(currentPlayer);

    if (!currentPlayer) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/notifications?email=${encodeURIComponent(currentPlayer.email)}`, { cache: "no-store" });
      const data = (await response.json()) as NotificationsResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Could not load notifications.");
      }

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadNotifications]);

  async function markAsRead(notificationId: string) {
    setActionLoading(notificationId);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: "PUT" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Could not mark notification as read.");
      }

      await loadNotifications();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not mark notification as read.");
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl px-5 py-12 text-slate-300 lg:px-8">Loading notifications...</section>;
  }

  if (!player) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-20 text-center lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14">
          <p className="text-2xl font-black text-white">Login required</p>
          <p className="mt-3 text-slate-400">Login to your player account to view notifications.</p>
          <Link href="/login" className="mt-6 inline-block rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white">Login</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Player notifications</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Notifications</h1>
          <p className="mt-3 text-sm text-slate-300">Tournament updates, match schedules, payment confirmations, and result decisions.</p>
        </div>
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Unread</p>
          <p className="mt-1 text-3xl font-black text-white">{unreadCount}</p>
        </div>
      </div>

      {errorMessage ? <div className="mt-6 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-200">{errorMessage}</div> : null}

      {notifications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 text-center">
          <p className="text-xl font-black text-white">No notifications yet</p>
          <p className="mt-3 text-slate-400">Updates will appear here as admin manages your registrations, matches, and results.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {notifications.map((notification) => (
            <article key={notification.id} className={`rounded-2xl border p-5 shadow-xl shadow-black/20 ${notification.read ? "border-white/10 bg-slate-900/70" : "border-cyan-300/30 bg-cyan-300/10"}`}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${typeClass(notification.type)}`}>{notification.type}</span>
                    {!notification.read ? <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">UNREAD</span> : null}
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white">{notification.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{notification.message}</p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{formatDate(notification.createdAt)}</p>
                </div>
                {!notification.read ? (
                  <button onClick={() => markAsRead(notification.id)} disabled={actionLoading === notification.id} type="button" className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:opacity-50">
                    {actionLoading === notification.id ? "Saving..." : "Mark as Read"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function typeClass(type: NotificationType) {
  const classes: Record<NotificationType, string> = {
    INFO: "border-slate-300/30 bg-slate-300/10 text-slate-100",
    MATCH: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    RESULT: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    APPROVAL: "border-violet-300/30 bg-violet-300/10 text-violet-100",
    PAYMENT: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  };

  return classes[type];
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
