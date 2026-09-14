import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/TopBar";
import DocumentsTable from "@/components/DocumentsTable";

export default async function DashboardPage() {
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

  const { data: documents } = await supabase
    .from("documents")
    .select(
      "id, title, category, description, file_path, file_name, file_size, issued_date, expiry_date, uploaded_by, created_at, profiles(email)"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <TopBar role={profile?.role ?? "hse_admin"} email={profile?.email ?? user.email ?? ""} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Daftar Dokumen</h2>
            <p className="text-sm text-ink/50">
              {documents?.length ?? 0} dokumen tersimpan
            </p>
          </div>
          <Link
            href="/dashboard/upload"
            className="focus-ring bg-ink text-white text-sm font-medium px-4 py-2 rounded-sm hover:bg-steel transition-colors"
          >
            + Unggah Dokumen
          </Link>
        </div>

        <DocumentsTable
          initialDocuments={(documents as any) ?? []}
          currentUserId={user.id}
          role={profile?.role ?? "hse_admin"}
        />
      </main>
    </div>
  );
}
