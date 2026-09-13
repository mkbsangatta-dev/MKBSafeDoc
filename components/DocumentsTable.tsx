"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DocumentRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  issued_date: string | null;
  expiry_date: string | null;
  uploaded_by: string | null;
  created_at: string;
  profiles: { email: string } | null;
};

const CATEGORIES = ["Semua", "SOP", "Sertifikat", "Izin", "Laporan Insiden", "MSDS", "Lainnya"];

function expiryStatus(expiry: string | null): { label: string; className: string } | null {
  if (!expiry) return null;
  const days = Math.ceil(
    (new Date(expiry).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return { label: "Sudah kedaluwarsa", className: "bg-safety-red/10 text-safety-red" };
  if (days <= 30) return { label: `${days} hari lagi`, className: "bg-safety-amber/15 text-[#8a6414]" };
  return { label: "Berlaku", className: "bg-safety-green/10 text-safety-green" };
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsTable({
  initialDocuments,
  currentUserId,
  role,
}: {
  initialDocuments: DocumentRow[];
  currentUserId: string;
  role: string;
}) {
  const supabase = createClient();
  const [documents, setDocuments] = useState(initialDocuments);
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const matchCategory = category === "Semua" || d.category === category;
      const matchQuery =
        query.trim() === "" || d.title.toLowerCase().includes(query.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [documents, category, query]);

  async function handleDownload(doc: DocumentRow) {
    setBusyId(doc.id);
    const { data, error } = await supabase.storage
      .from("k3-documents")
      .createSignedUrl(doc.file_path, 60);
    setBusyId(null);

    if (error || !data) {
      alert("Gagal membuat tautan unduh. Coba lagi.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(doc: DocumentRow) {
    const canDelete = role === "administrator" || doc.uploaded_by === currentUserId;
    if (!canDelete) return;
    if (!confirm(`Hapus dokumen "${doc.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;

    setBusyId(doc.id);
    await supabase.storage.from("k3-documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    setBusyId(null);

    if (error) {
      alert("Gagal menghapus dokumen.");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`focus-ring text-xs px-3 py-1.5 rounded-sm border transition-colors ${
                category === c
                  ? "bg-ink text-white border-ink"
                  : "border-ink/15 text-ink/70 hover:border-ink/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Cari judul dokumen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="focus-ring ml-auto text-sm border border-ink/15 rounded-sm px-3 py-1.5 w-56"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-ink/20 rounded-sm py-16 text-center">
          <p className="text-ink/60 text-sm">
            {documents.length === 0
              ? "Belum ada dokumen. Unggah dokumen pertama untuk mulai."
              : "Tidak ada dokumen yang cocok dengan pencarian."}
          </p>
        </div>
      ) : (
        <div className="border border-ink/10 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink/[0.03] text-left text-xs text-ink/50 font-mono">
                <th className="px-4 py-2.5 font-medium">Dokumen</th>
                <th className="px-4 py-2.5 font-medium">Kategori</th>
                <th className="px-4 py-2.5 font-medium">Kedaluwarsa</th>
                <th className="px-4 py-2.5 font-medium">Ukuran</th>
                <th className="px-4 py-2.5 font-medium">Diunggah oleh</th>
                <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const status = expiryStatus(doc.expiry_date);
                const canDelete = role === "administrator" || doc.uploaded_by === currentUserId;
                return (
                  <tr key={doc.id} className="border-t border-ink/8">
                    <td className="px-4 py-3">
                      <p className="text-ink font-medium">{doc.title}</p>
                      <p className="text-xs text-ink/45">{doc.file_name}</p>
                    </td>
                    <td className="px-4 py-3 text-ink/70">{doc.category}</td>
                    <td className="px-4 py-3">
                      {status ? (
                        <span className={`text-xs px-2 py-0.5 rounded-sm ${status.className}`}>
                          {status.label}
                        </span>
                      ) : (
                        <span className="text-xs text-ink/35">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/60 font-mono text-xs">
                      {formatSize(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-ink/60 text-xs">
                      {doc.profiles?.email ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={busyId === doc.id}
                        className="focus-ring text-xs text-steel hover:underline disabled:opacity-40"
                      >
                        Unduh
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={busyId === doc.id}
                          className="focus-ring text-xs text-safety-red hover:underline disabled:opacity-40"
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
