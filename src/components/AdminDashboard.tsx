"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  publicGameOptions,
  type PublicGameTitle,
  type PublicTournament,
  type PublicTournamentsResponse,
} from "@/types/public-tournament";

type PaymentStatus = "PENDING" | "PAID" | "FAILED";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

type LatestPayment = {
  id: string;
  method: string;
  provider: string;
  reference: string | null;
  receiptUrl: string | null;
  status: string;
  amount: number;
  currency: string;
};

type Registration = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gamerTag: string;
  game: PublicGameTitle;
  tournamentTitle: string;
  registrationType: "SOLO" | "TEAM";
  teamName: string | null;
  teamTag: string | null;
  teamCaptain: string | null;
  tournamentId: string | null;
  platformId: string;
  whatsappNumber: string;
  paymentStatus: PaymentStatus;
  approvalStatus: ApprovalStatus;
  proofOfPaymentText: string | null;
  adminNote: string | null;
  submittedAt: string;
  latestPayment: LatestPayment | null;
};

type RegistrationsResponse = {
  registrations: Registration[];
};

type PlatformStats = {
  totalMatchesPlayed: number;
  topRankedPlayer: { id: string; name: string; points: number } | null;
  totalPrizePools: number;
  activeTournaments: number;
};

type AdminDashboardProps = {
  onLogout?: () => void;
};

const paymentStatuses: PaymentStatus[] = ["PENDING", "PAID", "FAILED"];
const approvalStatuses: ApprovalStatus[] = ["PENDING", "APPROVED", "REJECTED"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: PaymentStatus | ApprovalStatus) {
  if (status === "PAID" || status === "APPROVED") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "FAILED" || status === "REJECTED") {
    return "border-red-400/40 bg-red-400/10 text-red-200";
  }

  return "border-amber-400/40 bg-amber-400/10 text-amber-200";
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState<"All" | PublicGameTitle>("All");
  const [tournamentFilter, setTournamentFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState<"All" | PaymentStatus>("All");
  const [approvalFilter, setApprovalFilter] = useState<"All" | ApprovalStatus>("All");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    try {
      const [registrationsResponse, tournamentsResponse, statsResponse] = await Promise.all([
        fetch("/api/registrations", { cache: "no-store" }),
        fetch("/api/tournaments", { cache: "no-store" }),
        fetch("/api/admin/stats", { cache: "no-store" }),
      ]);

      if (!registrationsResponse.ok) {
        throw new Error("Could not load registrations.");
      }

      if (!tournamentsResponse.ok) {
        throw new Error("Could not load tournaments.");
      }

      if (!statsResponse.ok) {
        throw new Error("Could not load platform stats.");
      }

      const registrationsData =
        (await registrationsResponse.json()) as RegistrationsResponse;
      const tournamentsData =
        (await tournamentsResponse.json()) as PublicTournamentsResponse;
      const statsData = (await statsResponse.json()) as PlatformStats;

      setRegistrations(registrationsData.registrations);
      setTournaments(tournamentsData.tournaments);
      setPlatformStats(statsData);
      setNotes(
        registrationsData.registrations.reduce<Record<string, string>>(
          (currentNotes, registration) => {
            currentNotes[registration.id] = registration.adminNote ?? "";
            return currentNotes;
          },
          {},
        ),
      );
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Something went wrong while loading the admin dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdminData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAdminData]);

  const filteredRegistrations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return registrations.filter((registration) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          registration.fullName,
          registration.gamerTag,
          registration.email,
          registration.phoneNumber,
          registration.whatsappNumber,
          registration.tournamentTitle,
          registration.game,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesGame =
        gameFilter === "All" || registration.game === gameFilter;
      const matchesTournament =
        tournamentFilter === "All" ||
        registration.tournamentTitle === tournamentFilter;
      const matchesPayment =
        paymentFilter === "All" || registration.paymentStatus === paymentFilter;
      const matchesApproval =
        approvalFilter === "All" ||
        registration.approvalStatus === approvalFilter;

      return (
        matchesSearch &&
        matchesGame &&
        matchesTournament &&
        matchesPayment &&
        matchesApproval
      );
    });
  }, [approvalFilter, gameFilter, paymentFilter, registrations, search, tournamentFilter]);

  const openTournaments = tournaments.filter(
    (tournament) => tournament.status === "OPEN",
  ).length;
  const uniqueGames = new Set(tournaments.map((tournament) => tournament.game));
  const tournamentTitles = Array.from(
    new Set(registrations.map((registration) => registration.tournamentTitle)),
  );

  async function updateRegistration(
    id: string,
    updates: Partial<
      Pick<Registration, "paymentStatus" | "approvalStatus" | "adminNote">
    >,
  ) {
    setActionLoadingId(id);
    setError("");

    try {
      const response = await fetch(`/api/registrations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update registration.");
      }

      setRegistrations((currentRegistrations) =>
        currentRegistrations.map((registration) =>
          registration.id === id ? data.registration : registration,
        ),
      );
      setNotes((currentNotes) => ({
        ...currentNotes,
        [id]: data.registration.adminNote ?? "",
      }));
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Something went wrong while updating the registration.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  async function deleteRegistration(id: string) {
    const confirmed = window.confirm(
      "Delete this registration? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(id);
    setError("");

    try {
      const response = await fetch(`/api/registrations/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete registration.");
      }

      setRegistrations((currentRegistrations) =>
        currentRegistrations.filter((registration) => registration.id !== id),
      );
      setNotes((currentNotes) => {
        const nextNotes = { ...currentNotes };
        delete nextNotes[id];
        return nextNotes;
      });
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Something went wrong while deleting the registration.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Admin control center
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              Registration Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Review players, confirm manual payments, approve entries, and keep
              tournament registration records organized.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/payments"
              className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/20"
            >
              Admin Payments
            </Link>
            <Link
              href="/admin/tournaments"
              className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/20"
            >
              Manage Tournaments
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-lg border border-violet-400/30 bg-violet-400/10 px-4 py-3 text-sm font-bold text-violet-100 transition hover:border-violet-300 hover:bg-violet-400/20"
            >
              Website Settings
            </Link>
            {onLogout ? (
              <button
                onClick={onLogout}
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:border-red-300 hover:bg-red-500/20"
                type="button"
              >
                Logout
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total registrations" value={registrations.length} />
          <StatCard label="Total tournaments" value={tournaments.length} />
          <StatCard label="Open tournaments" value={openTournaments} />
          <StatCard label="Games supported" value={uniqueGames.size} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Matches played" value={platformStats?.totalMatchesPlayed ?? 0} />
          <StatCard label="Total prize pools" value={platformStats?.totalPrizePools ?? 0} prefix="NGN " />
          <StatCard label="Active tournaments" value={platformStats?.activeTournaments ?? 0} />
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Top ranked player</p>
            {platformStats?.topRankedPlayer ? (
              <Link href={`/players/${platformStats.topRankedPlayer.id}`} className="mt-3 block text-xl font-black text-cyan-100 hover:text-white">
                {platformStats.topRankedPlayer.name} ({platformStats.topRankedPlayer.points} pts)
              </Link>
            ) : (
              <p className="mt-3 text-xl font-black text-white">No ranking yet</p>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Search
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
              placeholder="Name, email, gamer tag"
              type="search"
            />
          </label>

          <FilterSelect
            label="Game"
            value={gameFilter}
            onChange={(value) => setGameFilter(value as "All" | PublicGameTitle)}
            options={publicGameOptions.map((option) => option.value)}
          />
          <FilterSelect
            label="Tournament"
            value={tournamentFilter}
            onChange={setTournamentFilter}
            options={["All", ...tournamentTitles]}
          />
          <FilterSelect
            label="Payment"
            value={paymentFilter}
            onChange={(value) => setPaymentFilter(value as "All" | PaymentStatus)}
            options={["All", ...paymentStatuses]}
          />
          <FilterSelect
            label="Approval"
            value={approvalFilter}
            onChange={(value) => setApprovalFilter(value as "All" | ApprovalStatus)}
            options={["All", ...approvalStatuses]}
          />
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300">
            Loading registrations...
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <h2 className="text-xl font-black">No registrations found</h2>
            <p className="mt-2 text-sm text-slate-400">
              New player registrations will appear here after users submit the
              registration form.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {filteredRegistrations.map((registration) => {
              const isBusy = actionLoadingId === registration.id;

              return (
                <article
                  key={registration.id}
                  className="rounded-xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)]"
                >
                  <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr_1fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-white">
                          {registration.fullName}
                        </h2>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                            registration.paymentStatus,
                          )}`}
                        >
                          {registration.paymentStatus}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                            registration.approvalStatus,
                          )}`}
                        >
                          {registration.approvalStatus}
                        </span>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <Info label="Gamer tag" value={registration.gamerTag} />
                        <Info label="Game" value={registration.game} />
                        <Info
                          label="Tournament"
                          value={registration.tournamentTitle}
                        />
                        <Info
                          label="Player ID"
                          value={registration.platformId}
                        />
                        <Info label="Phone" value={registration.phoneNumber} />
                        <Info label="WhatsApp" value={registration.whatsappNumber} />
                        <Info label="Email" value={registration.email} />
                        <Info
                          label="Registered"
                          value={formatDate(registration.submittedAt)}
                        />
                        <Info label="Payment method" value={registration.latestPayment?.method ?? "None"} />
                        <Info label="Payment provider" value={registration.latestPayment?.provider ?? "None"} />
                        <Info label="Payment record" value={registration.latestPayment?.status ?? "No record"} />
                        <Info label="Reference" value={registration.latestPayment?.reference ?? "None"} />
                      </dl>
                      {registration.latestPayment?.receiptUrl ? <a href={registration.latestPayment.receiptUrl} target="_blank" className="mt-4 inline-block text-sm font-bold text-cyan-300 hover:text-white">View payment receipt</a> : null}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        Admin note
                      </p>
                      <textarea
                        value={notes[registration.id] ?? ""}
                        onChange={(event) =>
                          setNotes((currentNotes) => ({
                            ...currentNotes,
                            [registration.id]: event.target.value,
                          }))
                        }
                        className="mt-2 min-h-32 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
                        placeholder="Example: Payment confirmed by bank transfer."
                      />
                      <button
                        onClick={() =>
                          updateRegistration(registration.id, {
                            adminNote: notes[registration.id] ?? "",
                          })
                        }
                        disabled={isBusy}
                        className="mt-3 w-full rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                      >
                        Save Note
                      </button>
                    </div>

                    <div className="grid content-start gap-3 sm:grid-cols-2">
                      <button
                        onClick={() =>
                          updateRegistration(registration.id, {
                            approvalStatus: "APPROVED",
                          })
                        }
                        disabled={isBusy}
                        className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          updateRegistration(registration.id, {
                            approvalStatus: "REJECTED",
                          })
                        }
                        disabled={isBusy}
                        className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:border-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() =>
                          updateRegistration(registration.id, {
                            paymentStatus: "PAID",
                          })
                        }
                        disabled={isBusy}
                        className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() =>
                          updateRegistration(registration.id, {
                            paymentStatus: "FAILED",
                          })
                        }
                        disabled={isBusy}
                        className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                      >
                        Mark Failed
                      </button>
                      <button
                        onClick={() => deleteRegistration(registration.id)}
                        disabled={isBusy}
                        className="sm:col-span-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-red-300/50 hover:bg-red-500/10 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminDashboard;

function StatCard({ label, value, prefix = "" }: { label: string; value: number; prefix?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{prefix}{value.toLocaleString()}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-slate-200">{value}</dd>
    </div>
  );
}





