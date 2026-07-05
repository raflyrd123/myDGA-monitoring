import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// 1. Inisialisasi Resend secara aman menggunakan Env Var yang lo set di Vercel tadi
const resend = new Resend(process.env.RESEND_API_KEY);

// 2. Inisialisasi Supabase menggunakan SERVICE_ROLE_KEY untuk bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Ambil payload data kiriman dari trigger hardware atau Webhook Supabase
    const { title, message, type } = await request.json();

    // Validasi input parameter dasar
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Payload data "title" dan "message" wajib dilampirkan.' }, 
        { status: 400 }
      );
    }

    // 3. Tarik data konfigurasi channel admin dari tabel app_settings secara real-time
    const { data: settings, error: dbError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'notification_channels')
      .single();

    if (dbError || !settings?.value) {
      return NextResponse.json(
        { error: 'Konfigurasi "notification_channels" tidak ditemukan di database Supabase.' }, 
        { status: 404 }
      );
    }

    const emailTargets = settings.value.admin_emails;
    const isEmailEnabled = settings.value.enable_email;

    // Proteksi: Cegah penembakan API jika status email OFF di Supabase
    if (!isEmailEnabled || !emailTargets || emailTargets.length === 0) {
      return NextResponse.json({ 
        message: 'Dispatcher dihentikan: Fitur notifikasi email berstatus nonaktif atau list penerima kosong.' 
      }, { status: 200 });
    }

    // 4. Eksekusi pengapalan surat alert ke Resend API Server
    const { data, error: resendError } = await resend.emails.send({
      from: 'Koper DGA Smart Alert <onboarding@resend.dev>', 
      to: emailTargets, // Menembak otomatis ke ["mydgatelkom@gmail.com"] hasil query SQL kemarin
      subject: `⚠️ [${(type || 'ALERT').toUpperCase()}] ${title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #2D365E; max-width: 600px; border: 1px solid #E2E8F0; border-radius: 24px; background-color: #FFFFFF; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          
          <div style="margin-bottom: 20px;">
            <span style="background-color: #FEE2E2; color: #EF4444; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase;">
              ${(type || 'CRITICAL_ALERT').toUpperCase()}
            </span>
          </div>

          <h2 style="color: #2D365E; font-size: 22px; font-weight: 900; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.02em; line-height: 1.2;">
            ${title}
          </h2>
          
          <p style="font-size: 14px; color: #4A5568; line-height: 1.6; margin-bottom: 24px; font-weight: 500;">
            Sistem telemetri nirkabel koper IoT DGA Sisgrid Lab mendeteksi adanya kegagalan fisis atau kontaminasi senyawa gas trafo yang keluar dari ambang batas aman:
          </p>
          
          <div style="background-color: #F4F7FE; padding: 20px; border-radius: 16px; font-size: 13px; font-family: 'Courier New', Courier, monospace; color: #2D365E; border-left: 5px solid #EF4444; font-weight: 700; line-height: 1.6; letter-spacing: 0.02em;">
            ${message}
          </div>
          
          <div style="margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: right;">
            <span style="font-size: 11px; color: #A0AEC0; font-weight: 700; uppercase;">
              Waktu Sistem: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'medium' })} WIB
            </span>
          </div>

        </div>
      `,
    });

    if (resendError) {
      return NextResponse.json({ error: resendError }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Email dispatcher alert koper DGA sukses di-broadcast ke akun bersama!', 
      data 
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
