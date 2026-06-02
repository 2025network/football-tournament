"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";

const adminSessionKey = "football-tournament-admin-session";

type AdminAuthGateProps = {
  children?: React.ReactNode;
};

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return sessionStorage.getItem(adminSessionKey) === "true";
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/admin/login");
    }
  }, [isLoggedIn, router]);

  function logout() {
    sessionStorage.removeItem(adminSessionKey);
    setIsLoggedIn(false);
    router.replace("/admin/login");
  }

  if (!isLoggedIn) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 text-center shadow-2xl shadow-cyan-950/20">
          <p className="text-xl font-black text-white">Checking admin access</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Redirecting to login if no admin session is active.</p>
        </div>
      </section>
    );
  }

  return children ?? <AdminDashboard onLogout={logout} />;
}
