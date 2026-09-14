// Edge Function: expiry-reminder
// Dijalankan otomatis tiap hari lewat pg_cron. Cek dokumen yang akan
// kedaluwarsa dalam 90 hari ke depan, lalu kirim satu email rangkuman
// ke semua user dengan role hse_admin.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const fromEmail = Deno.env.get("REMINDER_FROM_EMAIL") ?? "onboarding@resend.dev";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const in90Days = new Date();
    in90Days.setDate(today.getDate() + 90);

    const todayStr = today.toISOString().slice(0, 10);
    const in90DaysStr = in90Days.toISOString().slice(0, 10);

    // Ambil dokumen yang kedaluwarsa dalam 90 hari ke depan
    // dan BELUM pernah dikirimi email pengingat.
    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("id, title, category, expiry_date")
      .not("expiry_date", "is", null)
      .gte("expiry_date", todayStr)
      .lte("expiry_date", in90DaysStr)
      .is("expiry_reminder_sent_at", null);

    if (docError) throw docError;

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ message: "Tidak ada dokumen yang perlu diingatkan hari ini." }),
        { status: 200 }
      );
    }

    // Ambil semua email dengan role hse_admin
    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "hse_admin");

    if (adminError) throw adminError;

    const adminEmails = (admins ?? []).map((a) => a.email).filter(Boolean);

    if (adminEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: "Tidak ada user dengan role hse_admin terdaftar." }),
        { status: 200 }
      );
    }

    const rows = documents
      .map(
        (d) =>
          `<li><strong>${d.title}</strong> (${d.category}) — kedaluwarsa <strong>${d.expiry_date}</strong></li>`
      )
      .join("");

    const html = `
      <p>Halo,</p>
      <p>Dokumen K3 berikut akan <strong>kedaluwarsa dalam 3 bulan ke depan</strong>. Mohon segera ditindaklanjuti:</p>
      <ul>${rows}</ul>
      <p style="color:#888; font-size:12px;">Email otomatis dari Sistem Dokumen K3 PT. Mitra Karya Bersama.</p>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: adminEmails,
        subject: `Pengingat: ${documents.length} dokumen K3 akan kedaluwarsa`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      throw new Error(`Gagal kirim email: ${errText}`);
    }

    // Tandai dokumen-dokumen ini supaya tidak dikirim ulang besok
    const ids = documents.map((d) => d.id);
    await supabase
      .from("documents")
      .update({ expiry_reminder_sent_at: new Date().toISOString() })
      .in("id", ids);

    return new Response(
      JSON.stringify({
        message: `Email terkirim ke ${adminEmails.length} admin HSE untuk ${documents.length} dokumen.`,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
