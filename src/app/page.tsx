import { Footer } from "@/components/Footer";
import { GamesSection } from "@/components/GamesSection";
import { HeroSection } from "@/components/HeroSection";
import { HomepagePlatformSections } from "@/components/HomepagePlatformSections";
import { Navbar } from "@/components/Navbar";
import { TrustSection } from "@/components/TrustSection";

export default async function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <HeroSection />
      <HomepagePlatformSections />
      <GamesSection />
      <TrustSection />
      <Footer />
    </main>
  );
}


