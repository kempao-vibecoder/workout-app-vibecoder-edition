import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

export function createClient() {
  if (client) {
    return client
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hudbavbhohmxcresequb.supabase.co"
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZGJhdmJob2hteGNyZXNlcXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MDczMTQsImV4cCI6MjA4MjA4MzMxNH0.Y5vmGg3GzFLGGTLk9Bgx6W2AEEZDt2W39qpPXHv658M"

  client = createBrowserClient(supabaseUrl, supabaseKey)

  return client
}
