import Link from "next/link";
import { headers } from "next/headers";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TournamentCard } from "@/components/TournamentCard";
import { formatCompetition, publicGameOptions, type PublicCompetitionFormat, type PublicTournamentsResponse } from "@/types/public-tournament";

type TournamentsPageProps = {
  searchParams?: Promise<{ game?: string; format?: string }>;
};

const formatOptions = ["All", "OPEN_KNOCKOUT", "DOUBLE_ELIMINATION", "LEAGUE", "CHAMPIONS_LEAGUE", "SWISS_SYSTEM"] as const;

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
  const params = await searchParams;
  const selectedGame = params?.game ?? "All";
  const selectedFormat = params?.format ?? "All";
  const { tournaments, error } = await getTournaments();
  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesGame = selectedGame === "All" || tournament.game === selectedGame;
    const matchesFormat = selectedFormat === "All" || tournament.competitionFormat === selectedFormat;
    return matchesGame && matchesFormat;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_32%),linear-gradient(135deg,#020617,#0f172a_55%,#020617)] px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Tournament center</p>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black text-white sm:text-6xl">Available tournaments</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Browse open tournaments created by admins and organizers.</p>
            </div>
            <Link href="/register" className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-center text-sm font-black text-cyan-100 transition hover:-translate-y-1 hover:bg-cyan-300 hover:text-slate-950">Join Tournament</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <FilterRow selectedGame={selectedGame} selectedFormat={selectedFormat} />

        {error ? (
          <StateBlock title="Could not load tournaments" message={error} />
        ) : filteredTournaments.length === 0 ? (
          <StateBlock title="No tournaments available" message="No tournaments are open yet. Please check back soon." />
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {filteredTournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

function FilterRow({ selectedGame, selectedFormat }: { selectedGame: string; selectedFormat: string }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        {publicGameOptions.map((game) => {
          const href = buildTournamentFilterHref(game.value, selectedFormat);
          const isActive = selectedGame === game.value;
          return <FilterLink key={game.value} href={href} active={isActive} label={game.label} />;
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {formatOptions.map((format) => {
          const href = buildTournamentFilterHref(selectedGame, format);
          const isActive = selectedFormat === format;
          const label = format === "All" ? "All Formats" : formatCompetition(format as PublicCompetitionFormat);
          return <FilterLink key={format} href={href} active={isActive} label={label} />;
        })}
      </div>
    </div>
  );
}

function buildTournamentFilterHref(game: string, format: string) {
  const query = new URLSearchParams();
  if (game !== "All") query.set("game", game);
  if (format !== "All") query.set("format", format);
  const queryString = query.toString();
  return queryString ? `/tournaments?${queryString}` : "/tournaments";
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return <Link href={href} className={`rounded-lg border px-4 py-2 text-sm font-black transition ${active ? "border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.3)]" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300 hover:text-cyan-200"}`}>{label}</Link>;
}

async function getTournaments() {
  try {
    const response = await fetch(`${await getBaseUrl()}/api/tournaments`, { cache: "no-store" });
    const data = (await response.json()) as PublicTournamentsResponse;
    if (!response.ok) throw new Error(data.message ?? "Failed to fetch tournaments.");
    return { tournaments: data.tournaments.filter((tournament) => tournament.status === "OPEN" && tournament.registrationOpen), error: "" };
  } catch (error) {
    return { tournaments: [], error: error instanceof Error ? error.message : "Failed to fetch tournaments." };
  }
}

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function StateBlock({ title, message }: { title: string; message: string }) {
  return <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 text-center shadow-2xl shadow-cyan-950/20"><p className="text-2xl font-black text-white">{title}</p><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">{message}</p></div>;
}
