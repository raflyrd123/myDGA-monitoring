import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 🌟 DEBUGGER 1: Cetak payload mentah yang masuk dari hardware/Supabase ke Vercel Logs
    console.log("=== DISPATCHER TRANSMISSION LOG ===");
    console.log("Payload Masuk dari Source:", JSON.stringify(body, null, 2));

    // Ekstraksi data fleksibel (Mendukung format Supabase Webhook record, ESP32 raw, atau format teks)
    const dataSource = body.record || body; 
    
    let title = body.title || dataSource.title;
    let message = body.message || dataSource.message;
    let type = body.type || dataSource.type || 'CRITICAL_ALERT';

    // 🌟 AUTOMATIC FALLBACK MAPPER: Jika yang masuk adalah data sensor mentah, konversi otomatis jadi teks pesan email
    if (!title && dataSource.packet_id) {
      title = `ALERT TELEMETRI KOPER DGA: PACKET #PKT-${String(dataSource.packet_id).padStart(3, '0')}`;
    }
    
    if (!message && (dataSource.temperature_c || dataSource.lora_rssi)) {
      message = `LOG PARAMETER FISIS KOPER:\n` +
                `- Suhu Trafo: ${dataSource.temperature_c ?? '--'} °C\n` +
                `- Kelembaban SHT20: ${dataSource.humidity_pct ?? '--'} %\n` +
                `- Water Level JSN: ${dataSource.water_level_cm ?? '--'} CM\n` +
                `- Status Float: ${dataSource.safety_float ?? '--'}\n` +
                `- Sinyal RSSI Gateway: ${dataSource.lora_rssi ?? '--'} dBm\n` +
                `- Kualitas SNR: ${dataSource.lora_snr ?? '--'} dB`;
    }

    // Validasi akhir setelah auto-mapping
    if (!title || !message) {
      console.error("❌ ERROR: Data title atau message kosong setelah mapping.");
      return NextResponse.json({ error: 'Payload tidak dikenali atau kosong.' }, { status: 400 });
    }

    // 3. Tarik channel notifikasi dari database
    const { data: settings, error: dbError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'notification_channels')
      .single();

    if (dbError || !settings?.value) {
      console.error("❌ ERROR DATABASE SUPABASE:", dbError);
      return NextResponse.json({ error: 'Notification channel tidak ditemukan.' }, { status: 404 });
    }

    const emailTargets = settings.value.admin_emails;
    const isEmailEnabled = settings.value.enable_email;

    console.log(`📡 Status Email: ${isEmailEnabled} | Target:`, emailTargets);

    if (!isEmailEnabled || !emailTargets || emailTargets.length === 0) {
      console.log("⚠️ Prosedur dihentikan: Fitur email off atau penerima kosong.");
      return NextResponse.json({ message: 'Fitur email nonaktif di database.' }, { status: 200 });
    }

    // 4. Eksekusi pengiriman email ke Resend API
    console.log("🚀 Mencoba mengirim email via Resend API...");
    const { data, error: resendError } = await resend.emails.send({
      // Dipangkas display name-nya agar 100% lolos restriksi Sandbox strictness akun baru
      from: 'onboarding@resend.dev', 
      to: emailTargets, 
      subject: `⚠️ [${type.toUpperCase()}] ${title}`,
      html: `
        <div style="font-family: sans-serif; padding: 32px; color: #2D365E; max-width: 600px; border: 1px solid #E2E8F0; border-radius: 24px; background-color: #FFFFFF; margin: 0 auto;">
          <div style="margin-bottom: 20px;">
            <span style="background-color: #FEE2E2; color: #EF4444; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase;">
              ${type.toUpperCase()}
            </span>
          </div>
          <h2 style="color: #2D365E; font-size: 22px; font-weight: 900; margin-top: 0; margin-bottom: 12px; text-transform: uppercase;">
            ${title}
          </h2>
          <p style="font-size: 14px; color: #4A5568; line-height: 1.6; margin-bottom: 24px;">
            Sistem monitoring koper IoT DGA Sisgrid Lab mendeteksi parameter fisis trafo keluar dari batas aman:
          </p>
          <div style="background-color: #F4F7FE; padding: 20px; border-radius: 16px; font-size: 13px; font-family: monospace; color: #2D365E; border-left: 5px solid #EF4444; font-weight: 700; white-space: pre-line;">
            ${message}
          </div>
          <div style="margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: right;">
            <span style="font-size: 11px; color: #A0AEC0; font-weight: 700;">
              Waktu Log: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
            </span>
          </div>
        </div>
      `,
    });

    if (resendError) {
      // 🌟 DEBUGGER 2: Tangkap alasan penolakan fisis dari server Resend
      console.error("❌ RESEND API ERROR REJECTION:", JSON.stringify(resendError, null, 2));
      return NextResponse.json({ error: resendError }, { status: 400 });
    }

    console.log("✅ EMAIL DISPATCHED SUCCESSFULLY! Response Data:", data);
    return NextResponse.json({ message: 'Email alert sukses di-broadcast!', data }, { status: 200 });

  } catch (err: any) {
    console.error("💥 SYSTEM API CRASH:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
