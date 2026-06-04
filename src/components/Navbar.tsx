"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

const playerSessionKey = "football-tournament-player-session";

const publicLinks = [
  { label: "Home", href: "/" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Live", href: "/live" },
  { label: "Teams", href: "/teams" },
];

const playerLinks = [
  { label: "Player Dashboard", href: "/player/dashboard" },
  { label: "Player Matches", href: "/player/matches" },
  { label: "Notifications", href: "/player/notifications" },
  { label: "Player Teams", href: "/player/teams" },
  { label: "Referee Matches", href: "/referee/matches" },
];

const accountLinks = [
  { label: "Signup", href: "/signup" },
  { label: "Login", href: "/login" },
];

const adminLinks = [
  { label: "Admin Dashboard", href: "/admin" },
  { label: "Tournaments", href: "/admin/tournaments" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Production Checklist", href: "/admin/production-checklist" },
];

type NavLink = { label: string; href: string };
type DropdownName = "player" | "account" | "admin";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<DropdownName | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [playerLoggedIn, setPlayerLoggedIn] = useState(() => typeof window !== "undefined" && sessionStorage.getItem(playerSessionKey) !== null);

  const mobileGroups = useMemo(() => [
    { title: "Main", links: publicLinks },
    { title: "Player", links: playerLinks },
    { title: "Account", links: accountLinks },
    { title: "Admin", links: adminLinks },
  ], []);

  function closeMenus() {
    setOpenDropdown(null);
    setMobileOpen(false);
  }

  function logoutPlayer() {
    sessionStorage.removeItem(playerSessionKey);
    setPlayerLoggedIn(false);
    closeMenus();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-8">
        <Link href="/" onClick={closeMenus} className="group flex min-w-0 shrink items-center gap-2 sm:gap-3 xl:w-[235px] xl:shrink-0 2xl:w-[265px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-sm font-black text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.25)] sm:h-10 sm:w-10 sm:text-lg">
            FT
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black uppercase text-white sm:text-sm 2xl:text-base">football-tournament</span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300 sm:block">Mobile esports</span>
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-1 xl:flex">
          {publicLinks.map((link) => <DesktopLink key={link.href} link={link} pathname={pathname} onNavigate={closeMenus} />)}
          <DropdownButton name="player" label="Player" links={playerLinks} pathname={pathname} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} onNavigate={closeMenus} footer={playerLoggedIn ? <DropdownAction label="Logout" onClick={logoutPlayer} /> : null} />
          <DropdownButton name="account" label="Account" links={accountLinks} pathname={pathname} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} onNavigate={closeMenus} />
          <DropdownButton name="admin" label="Admin" links={adminLinks} pathname={pathname} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} onNavigate={closeMenus} />
        </div>

        <div className="hidden w-[285px] shrink-0 flex-nowrap items-center justify-end gap-2 xl:flex 2xl:w-[320px]">
          <Link href="/register" onClick={closeMenus} className={`whitespace-nowrap rounded-lg border border-cyan-300/40 px-4 py-2 text-sm font-black shadow-[0_0_28px_rgba(34,211,238,0.28)] transition hover:-translate-y-0.5 hover:bg-white ${isActive(pathname, "/register") ? "bg-white text-slate-950" : "bg-cyan-300 text-slate-950"}`}>
            Join Tournament
          </Link>
          <Link href="/signup" onClick={closeMenus} className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-black transition hover:border-cyan-300 hover:text-cyan-200 ${isActive(pathname, "/signup") ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white"}`}>
            Create Account
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white transition hover:border-cyan-300 hover:text-cyan-200 xl:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          <span className="grid gap-1.5">
            <span className={`block h-0.5 w-5 rounded-full bg-current transition ${mobileOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-current transition ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-current transition ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </span>
        </button>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-slate-950/98 px-4 pb-5 pt-2 shadow-2xl shadow-cyan-950/30 xl:hidden">
          <div className="mx-auto grid max-w-7xl gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/register" onClick={closeMenus} className={`rounded-lg px-4 py-3 text-center text-sm font-black uppercase tracking-wide transition ${isActive(pathname, "/register") ? "bg-white text-slate-950" : "bg-cyan-300 text-slate-950 hover:bg-white"}`}>
                Join Tournament
              </Link>
              <Link href="/signup" onClick={closeMenus} className={`rounded-lg border px-4 py-3 text-center text-sm font-black uppercase tracking-wide transition ${isActive(pathname, "/signup") ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white hover:border-cyan-300 hover:text-cyan-200"}`}>
                Create Account
              </Link>
            </div>
            {mobileGroups.map((group) => (
              <div key={group.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{group.title}</p>
                <div className="grid gap-1">
                  {group.links.map((link) => <MobileLink key={link.href} link={link} pathname={pathname} onNavigate={closeMenus} />)}
                  {group.title === "Player" && playerLoggedIn ? (
                    <button onClick={logoutPlayer} type="button" className="rounded-lg px-3 py-2 text-left text-sm font-bold text-rose-200 transition hover:bg-rose-300/10">
                      Logout
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function DesktopLink({ link, pathname, onNavigate }: { link: NavLink; pathname: string; onNavigate: () => void }) {
  const active = isActive(pathname, link.href);
  return (
    <Link href={link.href} onClick={onNavigate} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-cyan-300/15 text-cyan-200" : "text-slate-300 hover:bg-white/[0.04] hover:text-cyan-300"}`}>
      {link.label}
    </Link>
  );
}

function MobileLink({ link, pathname, onNavigate }: { link: NavLink; pathname: string; onNavigate: () => void }) {
  const active = isActive(pathname, link.href);
  return (
    <Link href={link.href} onClick={onNavigate} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-cyan-300/15 text-cyan-200" : "text-slate-300 hover:bg-white/[0.04] hover:text-cyan-300"}`}>
      {link.label}
    </Link>
  );
}

function DropdownButton({ name, label, links, pathname, openDropdown, setOpenDropdown, onNavigate, footer }: { name: DropdownName; label: string; links: NavLink[]; pathname: string; openDropdown: DropdownName | null; setOpenDropdown: (name: DropdownName | null) => void; onNavigate: () => void; footer?: ReactNode }) {
  const open = openDropdown === name;
  const active = links.some((link) => isActive(pathname, link.href));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpenDropdown(open ? null : name)}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-cyan-300/15 text-cyan-200" : "text-slate-300 hover:bg-white/[0.04] hover:text-cyan-300"}`}
        aria-expanded={open}
      >
        {label}
        <span className={`text-xs transition ${open ? "rotate-180" : ""}`}>v</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-cyan-950/30">
          {links.map((link) => <DropdownLink key={link.href} link={link} pathname={pathname} onNavigate={onNavigate} />)}
          {footer ? <div className="mt-2 border-t border-white/10 pt-2">{footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function DropdownLink({ link, pathname, onNavigate }: { link: NavLink; pathname: string; onNavigate: () => void }) {
  const active = isActive(pathname, link.href);
  return (
    <Link href={link.href} onClick={onNavigate} className={`block rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-cyan-300/15 text-cyan-200" : "text-slate-300 hover:bg-white/[0.04] hover:text-cyan-300"}`}>
      {link.label}
    </Link>
  );
}

function DropdownAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-rose-200 transition hover:bg-rose-300/10">
      {label}
    </button>
  );
}

function isActive(pathname: string, href: string) {
  const exactOnlyLinks = new Set(["/", "/admin", "/player/dashboard"]);
  if (exactOnlyLinks.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
