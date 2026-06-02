"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { publicGameOptions, type PublicGameTitle } from "@/types/public-tournament";
import { isValidEmail, isValidNigerianPhone } from "@/lib/player-validation";

const playerSessionKey = "football-tournament-player-session";

type PlayerSession = {
  id: string;
  fullName: string;
  email: string;
  platformId: string;
  phone: string;
  whatsapp: string;
  gamerTag: string;
  defaultGame: PublicGameTitle | "";
  defaultGamePlayerId: string;
};

const playableGames = publicGameOptions.filter((game) => game.value !== "All") as Array<{ label: string; value: PublicGameTitle }>;

export function PlayerSignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    gamerTag: "",
    preferredGame: "" as PublicGameTitle | "",
    defaultGamePlayerId: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Field extends keyof typeof formData>(field: Field, value: (typeof formData)[Field]) {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
  }

  function validateForm() {
    if (!formData.fullName.trim()) return "Full name is required.";
    if (!isValidEmail(formData.email)) return "Enter a valid email address.";
    if (!isValidNigerianPhone(formData.phone)) return "Phone number must be 11 digits and start with 070, 080, 081, 090, or 091.";
    if (!isValidNigerianPhone(formData.whatsapp)) return "WhatsApp number must be 11 digits and start with 070, 080, 081, 090, or 091.";
    if (!formData.gamerTag.trim()) return "Gamer tag is required.";
    if (!formData.password || formData.password.length < 6) return "Password must be at least 6 characters.";
    return "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = (await response.json()) as { message?: string; player?: PlayerSession };

      if (!response.ok || !data.player) {
        throw new Error(data.message ?? "Signup failed.");
      }

      sessionStorage.setItem(playerSessionKey, JSON.stringify(data.player));
      setSuccessMessage(`Your Platform ID is ${data.player.platformId}. Opening your player dashboard...`);
      router.push(`/player/dashboard?welcomePlatformId=${encodeURIComponent(data.player.platformId)}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Signup failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/30 sm:p-8">
      {errorMessage ? <FormAlert tone="error" message={errorMessage} /> : null}
      {successMessage ? <FormAlert tone="success" message={successMessage} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <FormInput label="Full name" value={formData.fullName} onChange={(value) => updateField("fullName", value)} placeholder="Your full name" />
        <FormInput label="Email" value={formData.email} onChange={(value) => updateField("email", value)} placeholder="player@example.com" type="email" />
        <FormInput label="Phone number" value={formData.phone} onChange={(value) => updateField("phone", value)} placeholder="08012345678" />
        <FormInput label="WhatsApp number" value={formData.whatsapp} onChange={(value) => updateField("whatsapp", value)} placeholder="08012345678" />
        <FormInput label="Gamer tag" value={formData.gamerTag} onChange={(value) => updateField("gamerTag", value)} placeholder="Your public esports name" />
        <label>
          <span className="mb-2 block text-sm font-black text-slate-200">Preferred game</span>
          <select value={formData.preferredGame} onChange={(event) => updateField("preferredGame", event.target.value as PublicGameTitle | "")} className="form-input">
            <option value="">Select preferred game</option>
            {playableGames.map((game) => <option key={game.value} value={game.value}>{game.label}</option>)}
          </select>
        </label>
        <FormInput label="Default Game Player ID / UID optional" value={formData.defaultGamePlayerId} onChange={(value) => updateField("defaultGamePlayerId", value)} placeholder="eFootball ID, PUBG UID, COD UID, Free Fire UID" />
        <FormInput label="Password" value={formData.password} onChange={(value) => updateField("password", value)} placeholder="At least 6 characters" type="password" />
      </div>

      <button type="submit" disabled={isSubmitting} className="mt-7 w-full rounded-lg bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.35)] transition hover:-translate-y-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
        {isSubmitting ? "Creating account..." : "Create Player Account"}
      </button>

      <p className="mt-5 text-center text-sm text-slate-400">
        Already have an account? <Link href="/login" className="font-bold text-cyan-300 hover:text-white">Login</Link>
      </p>
    </form>
  );
}

function FormInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-200">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="form-input" placeholder={placeholder} type={type} />
    </label>
  );
}

function FormAlert({ tone, message }: { tone: "error" | "success"; message: string }) {
  const className = tone === "success" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-rose-300/30 bg-rose-300/10 text-rose-200";

  return <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-bold ${className}`}>{message}</div>;
}
