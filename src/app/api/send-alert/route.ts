import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// 1. Inisialisasi Resend dengan API Key dari environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

// 2. Inisialisasi Supabase menggunakan SERVICE_ROLE_KEY (Bypass RLS)
// Wajib menggunakan Service Role agar server bisa membaca tabel app_settings tanpa terhalang policy
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Ambil payload JSON dari trigger webhook Supabase atau hardware
    const { title, message, type } = await request.json();

    // Validasi data input dasar
    if (!title || !message) {
      return NextResponse.json({ error: 'Payload title dan message wajib diisi.' }, { status: 400 });
    }

    // 3. Ambil daftar email multi-user dinamis dari tabel app_settings secara real-time
    const { data: settings, error: dbError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'notification_channels')
      .single();

    if (dbError || !settings?.value) {
      return NextResponse.json({ error: 'Konfigurasi channel notifikasi tidak ditemukan.' }, { status: 404 });
    }

    const emailTargets = settings.value.admin_emails;
    const isEmailEnabled = settings.value.enable_email;

    // 🌟 PROTEKSI UTAMA ANTI-CRASH (ZERO-STATE FALLBACK)
    // Jika email dimatikan atau array kosong karena operator menghapus semua email di web,
    // potong komando di sini dengan status 200 supaya webhook Supabase tidak mendeteksi log error/gagal.
    if (!isEmailEnabled || !emailTargets || emailTargets.length === 0) {
      return NextResponse.json({ 
        message: 'Prosedur dihentikan: Fitur email nonaktif atau tidak ada email penerima yang terdaftar.' 
      }, { status: 200 });
    }

    // 4. Eksekusi pengiriman email broadcast secara paralel via Resend API
    const { data, error: resendError } = await resend.emails.send({
      from: 'Koper DGA Smart Alert <alerts@resend.dev>', // Ganti dengan domain kustommu jika sudah ada di dashboard Resend
      to: emailTargets,                                 // Mendukung array string langsung untuk kirim massal sekaligus
      subject: `⚠️ [${(type || 'ALERT').toUpperCase()}] ${title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #2D365E; max-width: 600px; border: 1px solid #E2E8F0; border-radius: 16px; background-color: #FFFFFF;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <span style="background-color: #FEE2E2; color: #EF4444; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; uppercase;">
              ${(type || 'CRITICAL').toUpperCase()}
            </span>
          </div>
          <h2 style="color: #2D365E; font-size: 20px; font-weight: 900; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: -0.02em;">
            ${title}
          </h2>
          <p style="font-size: 13px; color: #4A5568; line-height: 1.6; margin-bottom: 20px; font-weight: 500;">
            Sistem monitoring koper IoT DGA Sisgrid Lab mendeteksi adanya parameter fisis trafo yang keluar dari ambang batas aman:
          </p>
          <div style="background-color: #F4F7FE; padding: 16px; border-radius: 12px; font-size: 12px; font-family: monospace; color: #2D365E; border-left: 4px solid #EF4444; font-weight: 700; line-height: 1.5;">
            ${message}
          </div>
          <div style="margin-top: 24px; border-top: 1px solid #E2E8F0; pt: 16px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; color: #A0AEC0; font-weight: 700;">
              Waktu Log: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
            </span>
          </div>
        </div>
      `,
    });

    // Jika pihak Resend menolak pengiriman (misal karena limitasi sandbox/free-tier)
    if (resendError) {
      return NextResponse.json({ error: resendError }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Email dispatcher alert sukses di-broadcast!', 
      data 
    }, { status: 200 });

  } catch (err: any) {
    // Mengamankan server jika ada internal structural crash
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}