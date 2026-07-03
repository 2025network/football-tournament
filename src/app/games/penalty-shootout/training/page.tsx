import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PenaltyShootoutGame } from "@/components/PenaltyShootoutGame";

export default function PenaltyShootoutTrainingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <Navbar />
      <Suspense fallback={<section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><p className="text-slate-300">Loading penalty training...</p></section>}>
        <PenaltyShootoutGame trainingMode />
      </Suspense>
      <Footer />
    </main>
  );
}
