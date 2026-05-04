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

  // 3. Gunakan getUser() untuk validasi session yang aman di sisi server[cite: 1]
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isLoginPage = url.pathname.startsWith('/login')

  // 4. LOGIKA PROTEKSI (LOCKDOWN):
  // Jika TIDAK ada user (belum login) dan mencoba akses apapun selain halaman /login[cite: 1]
  if (!user && !isLoginPage) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 5. LOGIKA REDIRECT SETELAH LOGIN:
  // Jika SUDAH login dan mencoba akses /login atau root '/', lempar ke /dashboard[cite: 1]
  if (user && (isLoginPage || url.pathname === '/')) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

// 6. KONFIGURASI GERBANG (MATCHER)[cite: 1]
export const config = {
  matcher: [
    /*
     * Matcher ini menjaga path aplikasi[cite: 1]
     * KECUALI: api, _next (sistem), dan semua file statis/gambar (.*\\..*)[cite: 1]
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}