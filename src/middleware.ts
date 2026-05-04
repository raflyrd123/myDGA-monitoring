import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inisialisasi respons dasar
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Konfigurasi Client Supabase khusus Server (Middleware)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update cookies di request dan response agar session tetap sinkron
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

  // 3. Cek Session User
  const { data: { session } } = await supabase.auth.getSession()

  // 4. LOGIKA LOCKDOWN: 
  // Jika TIDAK ada session dan user TIDAK sedang di halaman /login, 
  // paksa pindah ke /login
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. LOGIKA LOGOUT/ALREADY LOGGED IN:
  // Jika SUDAH ada session dan user coba buka halaman /login lagi,
  // langsung lempar ke dashboard utama
  if (session && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// 6. KONFIGURASI MATCHER (SATTPAM GERBANG UTAMA)
export const config = {
  matcher: [
    /*
     * Mencakup SEMUA route kecuali yang ada di daftar pengecualian:
     * - login (halaman masuk)
     * - api (jalur data/webhook)
     * - _next/static & _next/image (file sistem tampilan)
     * - favicon.ico (ikon tab browser)
     */
    '/((?!login|api|_next/static|_next/image|favicon.ico).*)',
  ],
}