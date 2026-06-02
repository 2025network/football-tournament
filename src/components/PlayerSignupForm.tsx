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

export function PlayerSignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setSuccessMessage("Account created. Opening your player dashboard...");
      router.push("/player/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Signup failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/30 sm:p-8">
      {errorMessage ? <FormAlert tone="error" message={errorMessage} /> : null}
      {successMessage ? <FormAlert tone="success" message={successMessage} /> : null}

      <div className="grid gap-5">
        <FormInput label="Full name" value={formData.fullName} onChange={(value) => updateField("fullName", value)} placeholder="Your full name" />
        <FormInput label="Email" value={formData.email} onChange={(value) => updateField("email", value)} placeholder="player@example.com" type="email" />
        <FormInput label="Phone" value={formData.phone} onChange={(value) => updateField("phone", value)} placeholder="08012345678" />
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
