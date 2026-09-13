"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes("@");

    let email = trimmed;

    if (!isEmail) {
      // Bukan format email -> anggap ini No. ID Pekerja, cari emailnya dulu.
      const { data: registeredEmail, error: lookupError } = await supabase.rpc(
        "get_email_by_employee_id",
        { p_employee_id: trimmed }
      );

      if (lookupError || !registeredEmail) {
        setError("No. ID Pekerja/email atau kata sandi salah. Coba lagi.");
        setLoading(false);
        return;
      }
      email = registeredEmail;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("No. ID Pekerja/email atau kata sandi salah. Coba lagi.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="h-2 hazard-strip rounded-t-sm" />
        <div className="bg-white border border-ink/10 border-t-0 rounded-b-sm shadow-sm px-8 py-10">
          <img
            src="/logo.jpg"
            alt="PT. Mitra Karya Bersama"
            className="h-16 w-auto mx-auto mb-6 block"
          />
          <p className="font-mono text-xs tracking-wide text-steel mb-1 text-center">K3 — SISTEM DOKUMEN</p>
          <h1 className="font-display text-2xl font-semibold text-ink mb-8 text-center">
            Masuk ke akun Anda
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-ink mb-1">
                No. ID Pekerja atau Email
              </label>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="focus-ring w-full rounded-sm border border-ink/20 px-3 py-2 text-sm"
                placeholder="0001 atau nama@perusahaan.com"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
                Kata sandi
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus-ring w-full rounded-sm border border-ink/20 px-3 py-2 text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-safety-red border-l-2 border-safety-red pl-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="focus-ring w-full bg-ink text-white text-sm font-medium py-2.5 rounded-sm hover:bg-steel transition-colors disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="text-xs text-ink/50 mt-6">
            Akun dibuat oleh administrator. Hubungi administrator perusahaan Anda
            jika belum memiliki akun.
          </p>
        </div>
      </div>
    </main>
  );
}
