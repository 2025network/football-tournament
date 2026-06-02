import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TeamCreateForm } from "@/components/TeamCreateForm";

export default function CreateTeamPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Suspense fallback={<section className="mx-auto max-w-3xl px-5 py-10 text-slate-300 lg:px-8">Loading team form...</section>}>
        <TeamCreateForm />
      </Suspense>
      <Footer />
    </main>
  );
}
