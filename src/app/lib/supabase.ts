import { createBrowserClient } from '@supabase/ssr'

// Menggunakan createBrowserClient agar cookie otomatis sinkron antara Client dan Middleware[cite: 1]
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)