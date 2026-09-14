"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  "SOP",
  "Sertifikat",
  "Izin",
  "Laporan Insiden",
  "MSDS",
  "Karyawan",
  "Peralatan Listrik",
  "Peralatan Ketinggian",
  "Kebijakan PT. MKB",
  "Record Inspeksi Peralatan & Kendaraan",
  "Record Pemeliharaan Peralatan & Kendaraan",
  "Record (Prinasa, OSM, PTO)",
  "Safety Committee",
  "Safety Talk & Safety Meeting",
  "Survey",
  "Lainnya",
];

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Pilih file dokumen terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sesi login berakhir. Silakan masuk kembali.");
      setLoading(false);
      return;
    }

    const path = `${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("k3-documents")
      .upload(path, file);

    if (uploadError) {
      setError("Gagal mengunggah file: " + uploadError.message);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      title,
      category,
      description: description || null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      issued_date: issuedDate || null,
      expiry_date: expiryDate || null,
      uploaded_by: user.id,
    });

    if (insertError) {
      await supabase.storage.from("k3-documents").remove([path]);
      setError("Gagal menyimpan data dokumen: " + insertError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <div className="h-1.5 hazard-strip" />
      <main className="max-w-xl mx-auto px-6 py-10">
        <p className="font-mono text-xs tracking-wide text-steel mb-1">K3 — UNGGAH DOKUMEN</p>
        <h1 className="font-display text-xl font-semibold text-ink mb-8">
          Tambah Dokumen Baru
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Judul dokumen</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="focus-ring w-full rounded-sm border border-ink/20 px-3 py-2 text-sm"
              placeholder="Contoh: SOP Penggunaan APD Area Produksi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="focus-ring w-full rounded-sm border border-ink/20 px-3 py-2 text-sm bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Keterangan <span className="text-ink/40 font-normal">(opsional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="focus-ring w-full rounded-sm border border-ink/20 px-3 py-2 text-sm"
              placeholder="Catatan singkat mengenai dokumen ini"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Tanggal terbit <span className="text-ink/40 font-normal">(opsional)</span>
              </label>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="focus-ring w-full rounded-sm border border-ink/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Tanggal kedaluwarsa <span className="text-ink/40 font-normal">(opsional)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="focus-ring w-full rounded-sm border border-ink/20 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">File dokumen</label>
            <input
              required
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="focus-ring w-full text-sm border border-ink/20 rounded-sm px-3 py-2 bg-white file:mr-3 file:border-0 file:bg-ink/5 file:px-3 file:py-1 file:rounded-sm file:text-xs"
            />
            <p className="text-xs text-ink/40 mt-1">PDF, gambar, atau dokumen Office.</p>
          </div>

          {error && (
            <p className="text-sm text-safety-red border-l-2 border-safety-red pl-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="focus-ring bg-ink text-white text-sm font-medium px-5 py-2.5 rounded-sm hover:bg-steel transition-colors disabled:opacity-50"
            >
              {loading ? "Mengunggah..." : "Simpan Dokumen"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="focus-ring text-sm text-ink/60 px-5 py-2.5 rounded-sm border border-ink/15 hover:border-ink/30 transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
