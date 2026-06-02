"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";

const adminSessionKey = "football-tournament-admin-session";

type AdminSession = {
  adminEmail: string;
  adminRole: "ADMIN";
};

type AdminAuthGateProps = {
  children?: React.ReactNode;
};

function readAdminSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedSession = sessionStorage.getItem(adminSessionKey);

  if (!storedSession) {
    return null;
  }

  if (storedSession === "true") {
    sessionStorage.removeItem(adminSessionKey);
    return null;
  }

  try {
    const session = JSON.parse(storedSession) as Partial<AdminSession>;
    return session.adminRole === "ADMIN" && typeof session.adminEmail === "string" ? session as AdminSession : null;
  } catch {
    sessionStorage.removeItem(adminSessionKey);
    return null;
  }
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const router = useRouter();
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => readAdminSession());

  useEffect(() => {
    if (!adminSession) {
      router.replace("/admin/login");
    }
  }, [adminSession, router]);

  function logout() {
    sessionStorage.removeItem(adminSessionKey);
    setAdminSession(null);
    router.replace("/admin/login");
  }

  if (!adminSession) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-14 text-center shadow-2xl shadow-cyan-950/20">
          <p className="text-xl font-black text-white">Checking admin access</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Redirecting to login if no database admin session is active.</p>
        </div>
      </section>
    );
  }

  return children ?? <AdminDashboard onLogout={logout} />;
}

