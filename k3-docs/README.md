# Sistem Dokumen K3

Web app internal untuk mengunggah dan menyimpan dokumen K3 (SOP, sertifikat, izin,
laporan insiden, MSDS, dll) di Supabase Storage, dengan dua role: **Administrator**
dan **Admin HSE**.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase: Auth, Postgres (metadata dokumen + profil user), Storage (file dokumen)
- Deploy ke Netlify

## 1. Setup Supabase

1. Buka project Supabase yang sudah ada (atau buat baru di supabase.com).
2. Masuk ke **SQL Editor**, tempel seluruh isi `supabase/schema.sql`, lalu jalankan (Run).
   Script ini otomatis membuat:
   - Tabel `profiles` (role user) dan `documents` (metadata dokumen)
   - Row Level Security policy untuk kedua tabel
   - Storage bucket privat `k3-documents` beserta policy aksesnya
3. Buat user pertama Anda di **Authentication > Users > Add User** (isi email + password,
   centang "Auto Confirm User" supaya tidak perlu verifikasi email).
4. Jadikan user tersebut administrator dan isi No. ID Pekerja-nya (dipakai untuk login)
   dengan menjalankan di SQL Editor:
   ```sql
   update public.profiles
   set role = 'administrator', employee_id = '0001'
   where email = 'email-anda@perusahaan.com';
   ```
5. Ambil **Project URL** dan **anon public key** dari **Project Settings > API** —
   dipakai di langkah berikutnya.

## 2. Setup environment

Salin `.env.example` menjadi `.env.local`, lalu isi dengan URL dan anon key dari Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Jalankan secara lokal (opsional, untuk uji coba)

```bash
npm install
npm run dev
```

Buka http://localhost:3000 dan login dengan akun yang dibuat di langkah 1.3.

## 4. Deploy ke Netlify

1. Push folder ini ke repository Git (GitHub/GitLab/Bitbucket).
2. Di Netlify: **Add new site > Import an existing project**, pilih repo tersebut.
   `netlify.toml` sudah mengatur build command dan plugin Next.js secara otomatis.
3. Di **Site settings > Environment variables**, tambahkan dua variabel yang sama
   seperti di `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. Setelah selesai, buka domain Netlify Anda — akan otomatis mengarah ke halaman login.

## Menambah pengguna baru

Dibuat lewat Supabase Dashboard (**Authentication > Add User**), bukan lewat aplikasi —
supaya proses verifikasi akun ditangani langsung oleh Supabase. Setelah dibuat, WAJIB
isi juga `employee_id` di tabel `profiles` lewat SQL Editor:
```sql
update public.profiles
set employee_id = '0002', role = 'hse_admin'
where email = 'user-baru@perusahaan.com';
```
Tanpa `employee_id` terisi, user tersebut tidak akan bisa login karena halaman login
mencocokkan No. ID Pekerja terlebih dahulu, bukan email.

## Struktur folder

```
app/
  login/            halaman masuk
  dashboard/         daftar & filter dokumen
  dashboard/upload/  form unggah dokumen baru
  admin/users/       kelola role pengguna (khusus administrator)
lib/supabase/        klien Supabase (browser & server)
components/          komponen UI yang dipakai bersama
supabase/schema.sql  skema database + storage policy
middleware.ts        proteksi halaman berdasarkan status login
```

## Batasan yang perlu diketahui

- Belum ada notifikasi email otomatis untuk dokumen yang akan kedaluwarsa —
  saat ini hanya ditandai dengan badge warna di daftar dokumen. Bisa ditambahkan
  lewat Supabase Edge Function + cron jika dibutuhkan.
- Penambahan user baru sengaja lewat Supabase Dashboard, bukan lewat aplikasi,
  supaya tidak perlu menyimpan service role key di sisi client (risiko keamanan).
