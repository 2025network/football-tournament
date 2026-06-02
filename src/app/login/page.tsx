import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PlayerLoginForm } from "@/components/PlayerLoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_25%_10%,rgba(34,211,238,0.2),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#020617)] px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Player login</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-black leading-tight text-white sm:text-6xl">Login to your player dashboard.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Check your tournament entries, payment review, and approval status from one place.</p>
        </div>
      </section>
      <section className="px-5 py-12 lg:px-8">
        <PlayerLoginForm />
      </section>
      <Footer />
    </main>
  );
}
