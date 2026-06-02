import Link from "next/link";
import {
  formatCompetition,
  formatDate,
  formatGame,
  formatMoney,
  formatStatus,
  getAvailableSlots,
  type PublicTournament,
  type PublicTournamentStatus,
} from "@/types/public-tournament";

type TournamentCardProps = {
  tournament: PublicTournament;
};

const statusStyles: Record<PublicTournamentStatus, string> = {
  UPCOMING: "border-blue-300/30 bg-blue-300/10 text-blue-200",
  OPEN: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  CLOSED: "border-rose-300/30 bg-rose-300/10 text-rose-200",
};

export function TournamentCard({ tournament }: TournamentCardProps) {
  const availableSlots = getAvailableSlots(tournament);
  const registrationBadge = tournament.registrationType === "TEAM" ? "Team Tournament" : "Solo Tournament";

  return (
    <article className="group rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/20 transition hover:-translate-y-2 hover:border-cyan-300/60 hover:shadow-cyan-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{formatGame(tournament.game)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-cyan-100">{registrationBadge}</span>
            {tournament.teamSize ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-300">{tournament.teamSize} players</span> : null}
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{formatCompetition(tournament.competitionFormat)}</p>
          <h3 className="mt-3 text-xl font-black text-white">{tournament.title}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyles[tournament.status]}`}>
          {formatStatus(tournament.status)}
        </span>
      </div>

      <dl className="mt-6 grid gap-3 text-sm">
        <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-4 py-3">
          <dt className="text-slate-400">Prize pool</dt>
          <dd className="font-black text-emerald-300">{formatMoney(tournament.prizePool)}</dd>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-4 py-3">
          <dt className="text-slate-400">Slots available</dt>
          <dd className="font-black text-white">{tournament.allowUnlimitedRegistration ? "Unlimited" : `${availableSlots} / ${tournament.registrationLimit ?? tournament.slots}`}</dd>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-4 py-3">
          <dt className="text-slate-400">Start date</dt>
          <dd className="font-black text-white">{formatDate(tournament.startDate)}</dd>
        </div>
      </dl>

      <Link
        href={`/tournaments/${tournament.id}`}
        className="mt-6 block w-full rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black text-cyan-100 transition group-hover:bg-cyan-300 group-hover:text-slate-950"
      >
        View Details
      </Link>
    </article>
  );
}
