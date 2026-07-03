"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const playerSessionKey = "football-tournament-player-session";

const publicLinks = [
  { label: "Home", href: "/" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Live", href: "/live" },
  { label: "Teams", href: "/teams" },
];

const profileLinks = [
  { label: "Player Dashboard", href: "/player/dashboard" },
  { label: "Account Settings", href: "/player/dashboard" },
  { label: "My Teams", href: "/player/teams" },
  { label: "Admin Seasons", href: "/admin/seasons" },
  { label: "Admin Achievements", href: "/admin/achievements" },
  { label: "Admin Login", href: "/admin/login" },
];

type NavLink = { label: string; href: string };

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [playerLoggedIn, setPlayerLoggedIn] = useState(() => typeof window !== "undefined" && sessionStorage.getItem(playerSessionKey) !== null);

  const mobileGroups = useMemo(() => [
    { title: "Navigation", links: publicLinks },
    { title: "Profile", links: profileLinks },
  ], []);

  function closeMenus() {
    setProfileOpen(false);
    setMobileOpen(false);
  }

  function logoutPlayer() {
    sessionStorage.removeItem(playerSessionKey);
    setPlayerLoggedIn(false);
    closeMenus();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full overflow-x-clip border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-8">
        <Link href="/" onClick={closeMenus} className="group flex w-auto max-w-[142px] shrink items-center gap-2 sm:max-w-[168px] 2xl:w-[178px] 2xl:max-w-[178px] 2xl:shrink-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-sm font-black text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.25)] sm:h-10 sm:w-10 sm:text-lg">
            AK
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-xs font-black uppercase text-white sm:text-sm">AfriKick</span>
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-4 2xl:flex">
          {publicLinks.map((link) => <DesktopLink key={link.href} link={link} pathname={pathname} onNavigate={closeMenus} />)}
        </div>

        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 sm:gap-3 2xl:w-[420px]">
          <Link href="/register" onClick={closeMenus} className={`whitespace-nowrap rounded-lg border border-cyan-300/40 px-3 py-2 text-xs font-black shadow-[0_0_28px_rgba(34,211,238,0.28)] transition hover:-translate-y-0.5 hover:bg-white sm:px-4 sm:text-sm ${isActive(pathname, "/register") ? "bg-white text-slate-950" : "bg-cyan-300 text-slate-950"}`}>
            Join Tournament
          </Link>
          <Link href="/signup" onClick={closeMenus} className={`hidden whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-black transition hover:border-cyan-300 hover:text-cyan-200 2xl:inline-flex ${isActive(pathname, "/signup") ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white"}`}>
            Create Account
          </Link>
          <ProfileDropdown pathname={pathname} open={profileOpen} setOpen={setProfileOpen} onNavigate={closeMenus} onLogout={logoutPlayer} showLogout={playerLoggedIn} />
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white transition hover:border-cyan-300 hover:text-cyan-200 2xl:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <span className="grid gap-1.5">
              <span className={`block h-0.5 w-5 rounded-full bg-current transition ${mobileOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-5 rounded-full bg-current transition ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 rounded-full bg-current transition ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-slate-950/98 px-4 pb-5 pt-2 shadow-2xl shadow-cyan-950/30 2xl:hidden">
          <div className="mx-auto grid max-w-7xl gap-4">
            <Link href="/signup" onClick={closeMenus} className={`rounded-lg border px-4 py-3 text-center text-sm font-black uppercase tracking-wide transition ${isActive(pathname, "/signup") ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white hover:border-cyan-300 hover:text-cyan-200"}`}>
              Create Account
            </Link>
            {mobileGroups.map((group) => (
              <div key={group.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{group.title}</p>
                <div className="grid gap-1">
                  {group.links.map((link) => <MobileLink key={link.href} link={link} pathname={pathname} onNavigate={closeMenus} />)}
                  {group.title === "Profile" && playerLoggedIn ? <DropdownAction label="Logout" onClick={logoutPlayer} /> : null}
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

function ProfileDropdown({ pathname, open, setOpen, onNavigate, onLogout, showLogout }: { pathname: string; open: boolean; setOpen: (open: boolean) => void; onNavigate: () => void; onLogout: () => void; showLogout: boolean }) {
  const active = profileLinks.some((link) => isActive(pathname, link.href));

  return (
    <div className="relative hidden 2xl:block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-cyan-300/15 text-cyan-200" : "text-slate-300 hover:bg-white/[0.04] hover:text-cyan-300"}`}
        aria-expanded={open}
      >
        Account
        <span className={`text-xs transition ${open ? "rotate-180" : ""}`}>v</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-cyan-950/30">
          {profileLinks.map((link) => <DropdownLink key={link.href} link={link} pathname={pathname} onNavigate={onNavigate} />)}
          {showLogout ? <div className="mt-2 border-t border-white/10 pt-2"><DropdownAction label="Logout" onClick={onLogout} /></div> : null}
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

