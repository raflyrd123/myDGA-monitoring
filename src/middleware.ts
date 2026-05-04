import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inisialisasi respons dasar agar header tetap sinkron
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Konfigurasi Client Supabase untuk lingkungan Server/Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update cookies agar session login terbaca di semua sisi
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Gunakan getUser() untuk proteksi yang lebih cepat dan aman (menghindari session loop)
  const { data: { user } } = await supabase.auth.getUser()

  // 4. LOGIKA PROTEKSI (LOCKDOWN):
  // Jika TIDAK ada user (belum login) dan mencoba akses apapun selain halaman /login
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. LOGIKA REDIRECT SETELAH LOGIN:
  // Jika SUDAH login tapi mencoba akses halaman /login, lempar ke halaman utama (Dashboard)
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

// 6. KONFIGURASI GERBANG (MATCHER)
export const config = {
  matcher: [
    /*
     * Matcher ini menjaga SEMUA link (termasuk root '/')
     * KECUALI yang didaftarkan di dalam kurung (?!...)
     * Kita izinkan: login, api, _next (sistem), dan semua file statis (gambar/favicon)
     */
    '/((?!login|api|_next/static|_next/image|.*\\..*).*)',
  ],
}