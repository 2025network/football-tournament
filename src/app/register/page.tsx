import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { RegisterForm } from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_25%_10%,rgba(34,211,238,0.2),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#020617)] px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Registration</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Register for your next football tournament.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Submit your player details for review. Registrations are saved to PostgreSQL and reviewed by the admin team.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
        <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-slate-300">Loading form...</div>}>
          <RegisterForm />
        </Suspense>
      </section>
      <Footer />
    </main>
  );
}
