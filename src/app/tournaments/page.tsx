import Link from "next/link";
import { headers } from "next/headers";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TournamentCard } from "@/components/TournamentCard";
import { publicGameOptions, type PublicTournamentsResponse } from "@/types/public-tournament";

type TournamentsPageProps = {
  searchParams?: Promise<{
    game?: string;
  }>;
};

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
  const params = await searchParams;
  const selectedGame = params?.game ?? "All";
  const { tournaments, error } = await getTournaments();
  const filteredTournaments = selectedGame === "All" ? tournaments : tournaments.filter((tournament) => tournament.game === selectedGame);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_32%),linear-gradient(135deg,#020617,#0f172a_55%,#020617)] px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Tournament center</p>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black text-white sm:text-6xl">Available tournaments</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Browse live tournament records created by the admin team.
              </p>
            </div>
            <Link href="/register" className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-center text-sm font-black text-cyan-100 transition hover:-translate-y-1 hover:bg-cyan-300 hover:text-slate-950">
              Register Tournament
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-wrap gap-3">
          {publicGameOptions.map((game) => {
            const href = game.value === "All" ? "/tournaments" : `/tournaments?game=${encodeURIComponent(game.value)}`;
            const isActive = selectedGame === game.value;

            return (
              <Link
                key={game.value}
                href={href}
                className={`rounded-lg border px-4 py-2 text-sm font-black transition ${
                  isActive
                    ? "border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.3)]"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300 hover:text-cyan-200"
                }`}
              >
                {game.label}
              </Link>
            );
          })}
        </div>

        {error ? (
          <StateBlock title="Could not load tournaments" message={error} />
        ) : filteredTournaments.length === 0 ? (
          <StateBlock title="No tournaments available" message="No database tournaments match this filter yet. Create one from Admin Tournaments." />
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {filteredTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

async function getTournaments() {
  try {
    const response = await fetch(`${await getBaseUrl()}/api/tournaments`, { cache: "no-store" });
    const data = (await response.json()) as PublicTournamentsResponse;

    if (!response.ok) {
      throw new Error(data.message ?? "Failed to fetch tournaments.");
    }

    return { tournaments: data.tournaments, error: "" };
  } catch (error) {
    return {
      tournaments: [],
      error: error instanceof Error ? error.message : "Failed to fetch tournaments.",
    };
  }
}

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function StateBlock({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 text-center shadow-2xl shadow-cyan-950/20">
      <p className="text-2xl font-black text-white">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">{message}</p>
    </div>
  );
}
