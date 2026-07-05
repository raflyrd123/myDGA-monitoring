import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dataSource = body.record || body; 
    
    let title = body.title || dataSource.title || '⚠️ SYSTEM ALERT TRANSMISSION';
    let message = body.message || dataSource.message || '';
    let type = body.type || dataSource.type || 'critical';

    // Ambil alamat email tujuan
    const { data: settings } = await supabase.from('app_settings').select('value').eq('id', 'notification_channels').single();
    const emailTargets = settings?.value?.admin_emails || ["mydgatelkom@gmail.com"];
    const isEmailEnabled = settings?.value?.enable_email ?? true;

    if (!isEmailEnabled || emailTargets.length === 0) {
      return NextResponse.json({ message: 'Fitur notifikasi nonaktif.' }, { status: 200 });
    }

    // 🌟 PARSER SAKTI: Pecah baris teks chr(10) dari database untuk dimasukkan ke baris tabel HTML
    const messageLines = message.split('\n').filter((line: string) => line.trim() !== '');

    const { data, error: resendError } = await resend.emails.send({
      from: 'onboarding@resend.dev', 
      to: emailTargets, 
      subject: `⚠️ [${type.toUpperCase()}] ${title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 24px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 4px 25px rgba(0,0,0,0.04);">
          
          <div style="background-color: #2D365E; padding: 24px; text-align: center;">
            <h1 style="color: #FFFFFF; font-size: 16px; font-weight: 900; letter-spacing: 0.15em; margin: 0; text-transform: uppercase;">
              MYDGA ALERT SYSTEM
            </h1>
          </div>

          <div style="padding: 32px;">
            
            <div style="text-align: center; margin-bottom: 28px;">
              <h2 style="color: #2D365E; font-size: 20px; font-weight: 800; margin: 0 0 6px 0; text-transform: uppercase; tracking-tight;">
                ${title}
              </h2>
              <p style="color: #718096; font-size: 13px; margin: 0; font-weight: 500;">
                Peringatan terdeteksi secara otomatis pada sistem monitoring koper nirkabel.
              </p>
            </div>

            <div style="background-color: #F4F7FE; border-radius: 18px; padding: 12px 20px; margin-bottom: 28px; border: 1px solid #E4E9F7;">
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${messageLines.map((line: string) => {
                    const parts = line.split(':');
                    const label = parts[0] || '';
                    const val = parts.slice(1).join(':') || '';
                    
                    return `
                      <tr style="border-bottom: 1px dashed #E2E8F0;">
                        <td style="padding: 14px 0; font-size: 13px; font-weight: 700; color: #4A5568; text-transform: capitalize;">${label.trim()}</td>
                        <td style="padding: 14px 0; font-size: 13px; font-weight: 800; color: #2D365E; text-align: right;">${val.trim()}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div style="border-left: 4px solid #EF4444; background-color: #FFF5F5; padding: 16px; border-radius: 0 16px 16px 0; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; font-weight: 800; color: #C53030; line-height: 1.5;">
                <strong>Tindakan Disarankan:</strong> Segera lakukan pengecekan fisis koper IoT DGA Sisgrid Lab atau periksa kondisi gardu induk terkait.
              </p>
            </div>

            <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; text-align: center;">
              <span style="font-size: 10px; color: #A0AEC0; font-weight: 700; tracking-wide; text-transform: uppercase;">
                WAKTU KEJADIAN: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} UTC+7
              </span>
            </div>

          </div>
        </div>
      `,
    });

    if (resendError) return NextResponse.json({ error: resendError }, { status: 400 });
    return NextResponse.json({ message: 'Email alert sukses di-broadcast!', data }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
