import { Footer } from "@/components/Footer";
import { GamesSection } from "@/components/GamesSection";
import { HeroSection } from "@/components/HeroSection";
import { HomepagePlatformSections } from "@/components/HomepagePlatformSections";
import { Navbar } from "@/components/Navbar";
import { getSettingsMap } from "@/lib/settings";

export default async function Home() {
  const settings = await getSettingsMap();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <HeroSection title={settings.homepage_hero_title} subtitle={settings.homepage_hero_subtitle} />
      <HomepagePlatformSections />
      <GamesSection />
      <Footer />
    </main>
  );
}
