"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlayerSession } from "@/components/PlayerAuthGate";
import type { PublicTeam, PublicTeamMember, TeamsResponse, TeamResponse } from "@/types/team";

const sessionKey = "football-tournament-player-session";

function readSession() {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(sessionKey);
  if (!stored) return null;
  try { return JSON.parse(stored) as PlayerSession; } catch { return null; }
}

export function PlayerTeamsManager() {
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerSession | null>(null);
  const [teams, setTeams] = useState<PublicTeam[]>([]);
  const [invitePlatformIds, setInvitePlatformIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadTeams = useCallback(async (email: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/teams?email=${encodeURIComponent(email)}`, { cache: "no-store" });
      const data = (await response.json()) as TeamsResponse;
      if (!response.ok) throw new Error(data.message ?? "Could not load teams.");
      setTeams(data.teams);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not load teams.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const session = readSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setPlayer(session);
      void loadTeams(session.email);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadTeams, router]);

  async function teamAction(teamId: string, endpoint: string, body: Record<string, string>) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/teams/${teamId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as TeamResponse;
      if (!response.ok) throw new Error(data.message ?? "Team action failed.");
      setMessage(data.message ?? "Team updated.");
      if (player) await loadTeams(player.email);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Team action failed.");
    }
  }

  async function deleteTeam(team: PublicTeam) {
    if (!player || !window.confirm(`Delete ${team.name}? This cannot be undone.`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/teams/${team.id}?captainEmail=${encodeURIComponent(player.email)}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not delete team.");
      setMessage(data.message ?? "Team deleted.");
      await loadTeams(player.email);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not delete team.");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">Player teams</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">My Teams & Clans</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Create squads, accept invites, invite members by Platform ID, and manage team tournament rosters.</p>
        </div>
        <Link href="/teams/create" className="rounded-lg bg-cyan-300 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-white">Create Team</Link>
      </div>

      {error ? <div className="mt-6 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-200">{error}</div> : null}
      {message ? <div className="mt-6 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-200">{message}</div> : null}

      {loading ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300">Loading your teams...</div>
      ) : teams.length === 0 ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center"><p className="text-xl font-black text-white">No teams yet</p><p className="mt-2 text-sm text-slate-400">Create a team or ask a captain to invite you using your Platform ID.</p><Link href="/teams/create" className="mt-5 inline-block rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-white">Create Team</Link></div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {teams.map((team) => {
            const isCaptain = player?.email.toLowerCase() === team.captainEmail.toLowerCase();
            const currentMembership = team.members.find((member) => member.email.toLowerCase() === player?.email.toLowerCase());
            const activeMembers = team.members.filter((member) => member.status === "ACTIVE");
            const pendingMembers = team.members.filter((member) => member.status === "INVITED");
            return (
              <article key={team.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_35px_rgba(14,165,233,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{team.gameLabel}</p><h2 className="mt-2 text-2xl font-black text-white">[{team.tag}] {team.name}</h2><p className="mt-2 text-sm text-slate-400">Captain: {team.captainName}</p></div>
                  <Link href={`/teams/${team.id}`} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-300 hover:text-slate-950">View</Link>
                </div>

                {currentMembership?.status === "INVITED" ? (
                  <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
                    <p className="w-full text-sm font-bold text-amber-100">You have a pending invite to this team.</p>
                    <button onClick={() => player && teamAction(team.id, "join", { email: player.email })} className="rounded-lg bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950">Accept Invite</button>
                    <button onClick={() => player && teamAction(team.id, "reject", { email: player.email })} className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-black text-rose-100">Reject Invite</button>
                  </div>
                ) : null}

                <MemberList title="Active members" members={activeMembers} isCaptain={isCaptain} currentPlayerEmail={player?.email ?? ""} onRemove={(member) => player && teamAction(team.id, "remove-member", { captainEmail: player.email, memberId: member.id })} onTransfer={(member) => player && teamAction(team.id, "transfer-captain", { captainEmail: player.email, memberId: member.id })} />
                <MemberList title="Pending invites" members={pendingMembers} isCaptain={false} currentPlayerEmail={player?.email ?? ""} />

                {isCaptain ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <input className="form-input" value={invitePlatformIds[team.id] ?? ""} onChange={(event) => setInvitePlatformIds((current) => ({ ...current, [team.id]: event.target.value }))} placeholder="Invite by Platform ID, e.g. FT-000001" />
                    <button onClick={() => player && teamAction(team.id, "invite", { captainEmail: player.email, platformId: invitePlatformIds[team.id] ?? "" })} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300 hover:text-slate-950">Invite</button>
                    <button onClick={() => deleteTeam(team)} className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-black text-rose-200 hover:bg-rose-300 hover:text-slate-950">Delete</button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MemberList({ title, members, isCaptain, currentPlayerEmail, onRemove, onTransfer }: { title: string; members: PublicTeamMember[]; isCaptain: boolean; currentPlayerEmail: string; onRemove?: (member: PublicTeamMember) => void; onTransfer?: (member: PublicTeamMember) => void }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{title}</p>
      {members.length === 0 ? <p className="mt-2 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-400">No {title.toLowerCase()} yet.</p> : <div className="mt-3 grid gap-2">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm"><span><span className="font-bold text-white">{member.gamerTag || member.fullName}</span><span className="ml-2 text-slate-500">{member.platformId ?? "No Platform ID"}</span></span><span className="text-slate-400">{member.role} - {member.status}</span>{isCaptain && member.role !== "CAPTAIN" && member.email.toLowerCase() !== currentPlayerEmail.toLowerCase() ? <span className="flex gap-2"><button onClick={() => onTransfer?.(member)} className="text-cyan-300 hover:text-white">Make Captain</button><button onClick={() => onRemove?.(member)} className="text-rose-300 hover:text-white">Remove</button></span> : null}</div>)}</div>}
    </div>
  );
}
