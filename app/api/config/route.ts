import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.SUPABASE_URL || process.env.Kempe_baseSUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.Kempe_baseSUPABASE_ANON_KEY,
  })
}
