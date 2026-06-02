"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const playerSessionKey = "football-tournament-player-session";

type PlayerSession = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

export function PlayerLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { message?: string; player?: PlayerSession };

      if (!response.ok || !data.player) {
        throw new Error(data.message ?? "Login failed.");
      }

      sessionStorage.setItem(playerSessionKey, JSON.stringify(data.player));
      router.push("/player/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/30 sm:p-8">
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-200">{errorMessage}</div>
      ) : null}

      <div className="grid gap-5">
        <label>
          <span className="mb-2 block text-sm font-black text-slate-200">Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} className="form-input" placeholder="player@example.com" type="email" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-black text-slate-200">Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} className="form-input" placeholder="Enter your password" type="password" />
        </label>
      </div>

      <button type="submit" disabled={isSubmitting} className="mt-7 w-full rounded-lg bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.35)] transition hover:-translate-y-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
        {isSubmitting ? "Signing in..." : "Login to Player Account"}
      </button>

      <p className="mt-5 text-center text-sm text-slate-400">
        New player? <Link href="/signup" className="font-bold text-cyan-300 hover:text-white">Create an account</Link>
      </p>
    </form>
  );
}
