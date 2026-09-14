-- ============================================================
-- SKEMA DATABASE K3 DOCUMENT MANAGER
-- Jalankan seluruh file ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabel profil user, menyimpan role (admin bawaan Supabase Auth
--    hanya punya id + email, role kita simpan di sini)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  employee_id text unique,
  full_name text,
  role text not null default 'hse_admin' check (role in ('administrator', 'hse_admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Semua user login bisa lihat daftar profil (untuk keperluan "diupload oleh siapa")
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Fungsi bantu ini WAJIB security definer -- kalau tidak, mengecek role
-- lewat query ke profiles akan memicu RLS profiles lagi, dan itu memicu
-- fungsi ini lagi, dst (infinite recursion).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'administrator'
  );
$$;

-- User hanya administrator yang boleh insert/update/delete profil orang lain
create policy "profiles_admin_write"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Trigger: otomatis buat row profiles saat user baru daftar via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'hse_admin')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Fungsi ini dipanggil SEBELUM user login (jadi harus bisa diakses tanpa sesi aktif).
-- Hanya mengembalikan email yang cocok dengan No. ID Pekerja, tidak membuka data
-- profil lain sama sekali -- supaya tabel profiles tetap aman dari akses publik.
create or replace function public.get_email_by_employee_id(p_employee_id text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.profiles where employee_id = p_employee_id limit 1;
$$;

grant execute on function public.get_email_by_employee_id(text) to anon, authenticated;


-- 2. Tabel dokumen K3
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (
    category in (
      'SOP',
      'Sertifikat',
      'Izin',
      'Laporan Insiden',
      'MSDS',
      'Karyawan',
      'Peralatan Listrik',
      'Peralatan Ketinggian',
      'Kebijakan PT. MKB',
      'Record Inspeksi Peralatan & Kendaraan',
      'Record Pemeliharaan Peralatan & Kendaraan',
      'Record (Prinasa, OSM, PTO)',
      'Safety Committee',
      'Safety Talk & Safety Meeting',
      'Survey',
      'Lainnya'
    )
  ),
  description text,
  file_path text not null,       -- path di dalam Supabase Storage bucket
  file_name text not null,       -- nama file asli
  file_size bigint,              -- ukuran dalam bytes
  issued_date date,              -- tanggal dokumen diterbitkan
  expiry_date date,              -- tanggal kedaluwarsa (opsional)
  uploaded_by uuid references public.profiles(id) on delete set null,
  expiry_reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

-- Semua user login (admin HSE & administrator) boleh lihat semua dokumen
create policy "documents_select_authenticated"
  on public.documents for select
  to authenticated
  using (true);

-- Semua user login boleh upload dokumen baru
create policy "documents_insert_authenticated"
  on public.documents for insert
  to authenticated
  with check (uploaded_by = auth.uid());

-- Update/delete: hanya administrator, atau si pengupload dokumen itu sendiri
create policy "documents_modify_own_or_admin"
  on public.documents for update
  to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrator')
  );

create policy "documents_delete_admin_only"
  on public.documents for delete
  to authenticated
  using (public.is_admin());

create index if not exists documents_category_idx on public.documents(category);
create index if not exists documents_expiry_idx on public.documents(expiry_date);


-- 3. Storage bucket untuk file dokumen
insert into storage.buckets (id, name, public)
values ('k3-documents', 'k3-documents', false)
on conflict (id) do nothing;

-- Hanya user yang login boleh upload ke bucket ini
create policy "storage_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'k3-documents');

-- Hanya user yang login boleh membaca/download file
create policy "storage_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'k3-documents');

-- Hapus file: pengupload sendiri atau administrator
create policy "storage_delete_admin_only"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'k3-documents'
    and public.is_admin()
  );

-- ============================================================
-- CATATAN SETELAH MENJALANKAN SCRIPT INI:
-- 1. Buat user pertama lewat Supabase Dashboard > Authentication > Add User.
-- 2. Lalu jalankan query berikut untuk menjadikannya administrator DAN
--    mengisi No. ID Pekerja (dipakai untuk login):
--    update public.profiles
--    set role = 'administrator', employee_id = '0001'
--    where email = 'email-anda@perusahaan.com';
-- ============================================================
