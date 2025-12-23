import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hudbavbhohmxcresequb.supabase.co"
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZGJhdmJob2hteGNyZXNlcXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MDczMTQsImV4cCI6MjA4MjA4MzMxNH0.Y5vmGg3GzFLGGTLk9Bgx6W2AEEZDt2W39qpPXHv658M"

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from Server Component
        }
      },
    },
  })
}
