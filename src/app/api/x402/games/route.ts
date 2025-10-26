import { NextRequest, NextResponse } from 'next/server'
import { getActiveGames } from '@/lib/onchain'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const start = BigInt(searchParams.get('start') || '0')
    const limit = BigInt(searchParams.get('limit') || '50')
    const ids = await getActiveGames(start, limit)
    return NextResponse.json({ ok: true, ids: ids.map(Number) }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}