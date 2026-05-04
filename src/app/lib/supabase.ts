import { createBrowserClient } from '@supabase/ssr'

// Gunakan createBrowserClient agar cookie otomatis tersinkron antara 
// Client (halaman login lo) dan Server (Middleware lo)
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)