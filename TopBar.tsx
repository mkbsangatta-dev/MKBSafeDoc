"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TopBar({
  role,
  email,
}: {
  role: string;
  email: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ink/10 bg-white">
      <div className="h-1.5 hazard-strip" />
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <p className="font-mono text-[11px] tracking-wide text-steel">K3 — SISTEM DOKUMEN</p>
            <h1 className="font-display text-lg font-semibold text-ink leading-tight">
              Dokumen Keselamatan Kerja
            </h1>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-ink/70 hover:text-ink transition-colors">
              Dokumen
            </Link>
            {role === "administrator" && (
              <Link href="/admin/users" className="text-ink/70 hover:text-ink transition-colors">
                Pengguna
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-ink">{email}</p>
            <p className="text-xs text-ink/50 capitalize">
              {role === "administrator" ? "Administrator" : "Admin HSE"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="focus-ring text-sm text-steel hover:text-ink border border-ink/15 rounded-sm px-3 py-1.5 transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
