import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/TopBar";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "administrator") {
    redirect("/dashboard");
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen">
      <TopBar role={profile.role} email={profile.email} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="font-display text-xl font-semibold text-ink mb-1">Pengguna</h2>
        <p className="text-sm text-ink/50 mb-6">
          Kelola akses admin HSE dan administrator lain.
        </p>

        <div className="border border-amber-200 bg-safety-amber/10 rounded-sm px-4 py-3 mb-6 text-sm text-ink/80">
          Menambah pengguna baru dilakukan lewat{" "}
          <strong>Supabase Dashboard &gt; Authentication &gt; Add User</strong>, karena
          pembuatan akun butuh verifikasi email yang paling aman ditangani langsung oleh
          Supabase. Setelah user dibuat, atur rolenya di tabel di bawah.
        </div>

        <div className="border border-ink/10 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink/[0.03] text-left text-xs text-ink/50 font-mono">
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Nama</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Bergabung</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-t border-ink/8">
                  <td className="px-4 py-3 text-ink">{u.email}</td>
                  <td className="px-4 py-3 text-ink/70">{u.full_name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-sm ${
                        u.role === "administrator"
                          ? "bg-steel/10 text-steel"
                          : "bg-ink/5 text-ink/60"
                      }`}
                    >
                      {u.role === "administrator" ? "Administrator" : "Admin HSE"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/50 text-xs">
                    {new Date(u.created_at).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-ink/40 mt-4">
          Untuk mengubah role seseorang, jalankan query berikut di Supabase SQL Editor:{" "}
          <code className="bg-ink/5 px-1.5 py-0.5 rounded-sm font-mono">
            update profiles set role = &apos;administrator&apos; where email = &apos;...&apos;;
          </code>
        </p>
      </main>
    </div>
  );
}
