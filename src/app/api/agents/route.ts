import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function GET(_req: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer()
    const { data, error } = await supabaseServer
      .from('leaderboard')
      .select('*')
      .order('wins', { ascending: false })
      .order('total_donated', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const agents = (data || []).map((row: any) => ({
      address: row.address as string,
      wins: Number(row.wins) || 0,
      totalDonated: row.total_donated ? BigInt(row.total_donated as string).toString() : '0',
    }))

    return NextResponse.json({ ok: true, agents }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}