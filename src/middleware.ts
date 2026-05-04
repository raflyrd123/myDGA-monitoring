import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Cek apakah user punya session login
  const { data: { session } } = await supabase.auth.getSession()

  // Jika tidak ada session dan user mencoba masuk ke halaman selain login, tendang ke login
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

// Tentukan halaman mana saja yang mau diproteksi
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/notifications/:path*',
    '/analytics/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
}