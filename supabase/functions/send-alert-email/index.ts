import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Ambil Environment Variables dari Supabase Secrets
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

serve(async (req: Request) => {
  try {
    const { record } = await req.json()

    // 1. IDENTIFIKASI ISU SECARA DINAMIS
    const issues = []
    if (record.temperature_c > 100) issues.push("🔥 OVERHEAT")
    if (record.humidity_pct > 70) issues.push("💧 HUMIDITY")
    if (record.water_level_cm > 150) issues.push("🌊 FLOOD")

    if (issues.length > 0) {
      // 2. LOGIKA JUDUL & PESAN UNTUK DATABASE
      const dynamicTitle = issues.join(" & ")
      const alertType = (record.temperature_c > 100 || record.water_level_cm > 150) ? 'critical' : 'warning'
      
      // Pesan ini yang akan tampil di Page Notifications Dashboard lo
      const fullMessage = `Parameter Abnormal: Temp ${record.temperature_c}°C, Hum ${record.humidity_pct}%, Water ${record.water_level_cm}cm.`

      // 3. SIMPAN KE DATABASE (Tabel Notifications)
      const { error: dbError } = await supabase.from('notifications').insert([{ 
        title: dynamicTitle, 
        message: fullMessage, 
        type: alertType 
      }])
      
      if (dbError) console.error("Gagal simpan ke DB:", dbError.message)

      // 4. KIRIM EMAIL DENGAN TEMPLATE CLEAN (HOSTING-READY)
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'myDGA Alert <onboarding@resend.dev>',
          to: ['raflyrizqi786@gmail.com'], // Email lo
          subject: `🚨 ALERT: ${dynamicTitle}`, 
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e4ec; border-radius: 20px; overflow: hidden;">
              <div style="background-color: #2D365E; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 18px; letter-spacing: 2px; text-transform: uppercase;">myDGA ALERT SYSTEM</h1>
              </div>
              
              <div style="padding: 30px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <h2 style="color: #cb6060; margin: 0; font-size: 20px; text-transform: uppercase; font-weight: 900;">🚨 ${dynamicTitle}</h2>
                  <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Peringatan terdeteksi pada sistem monitoring trafo.</p>
                </div>

                <div style="background-color: #F4F7FE; border-radius: 15px; padding: 20px; margin-bottom: 25px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; color: #2D365E; font-weight: bold; font-size: 14px;">🌡️ Suhu Minyak</td>
                      <td style="padding: 10px 0; text-align: right; color: ${record.temperature_c > 100 ? '#cb6060' : '#2D365E'}; font-weight: 900;">${record.temperature_c}°C</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #2D365E; font-weight: bold; font-size: 14px;">💧 Kelembapan Ruang</td>
                      <td style="padding: 10px 0; text-align: right; color: ${record.humidity_pct > 70 ? '#f59e0b' : '#2D365E'}; font-weight: 900;">${record.humidity_pct}%</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #2D365E; font-weight: bold; font-size: 14px;">🌊 Level Air (Banjir)</td>
                      <td style="padding: 10px 0; text-align: right; color: ${record.water_level_cm > 150 ? '#cb6060' : '#2D365E'}; font-weight: 900;">${record.water_level_cm} cm</td>
                    </tr>
                  </table>
                </div>

                <div style="border-left: 4px solid #cb6060; padding-left: 15px; margin-bottom: 10px;">
                  <p style="font-size: 14px; color: #2D365E; margin: 0; font-weight: bold;">
                    Tindakan Disarankan: Segera lakukan pengecekan trafo secara langsung.
                  </p>
                </div>
              </div>

              <div style="background-color: #F4F7FE; padding: 20px; text-align: center; border-top: 1px solid #e0e4ec;">
                <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">
                  Waktu Kejadian: ${new Date(record.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' })}
                </p>
              </div>
            </div>
          `,
        }),
      })

      return new Response(JSON.stringify({ sent: true }), { status: 200 })
    }

    return new Response(JSON.stringify({ sent: false }), { status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})