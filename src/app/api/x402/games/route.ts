import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

// List game IDs from Supabase since on-chain getActiveGames is deprecated
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const start = Number(searchParams.get('start') || '0')
    const limit = Number(searchParams.get('limit') || '50')
    const statusParam = (searchParams.get('status') || 'all').toLowerCase()

    const supabase = getSupabaseServer()
    let query = supabase.from('games').select('id,status').order('created_at', { ascending: false })

    // Filter statuses: include pending so proposals appear
    if (statusParam === 'active') {
      query = query.in('status', ['active', 'verification_pending'])
    } else if (statusParam === 'pending') {
      query = query.eq('status', 'pending')
    } else if (statusParam === 'solved') {
      query = query.in('status', ['solved', 'archived'])
    } else {
      // default: show active, verification_pending, pending
      query = query.in('status', ['active', 'verification_pending', 'pending'])
    }

    // Pagination via range
    query = query.range(start, Math.max(start, start + limit - 1))

    const { data, error } = await query
    // Preserve precision by returning ids as strings (NUMERIC in Postgres)
    let ids = (data || []).map((row: any) => String(row.id))

    // Fallback to on-chain logs if DB is empty or query errored
    if (error || ids.length === 0) {
      try {
        const logs = await (await import('@/lib/onchain')).publicClient.getLogs({
          address: (await import('@/lib/onchain')).SOLVABLE_CONTRACT_ADDRESS,
          abi: (await import('@/lib/abi/solvable')).GoBitAbi as any,
          eventName: 'PuzzleProposed',
          fromBlock: BigInt(0),
          toBlock: 'latest',
        } as any)
        const proposedIds = (logs as any[]).map((log: any) => {
          const topic = log?.topics?.[1]
          if (typeof topic === 'string' && topic.startsWith('0x')) {
            try { return BigInt(topic).toString() } catch {}
          }
          const raw = log?.args?.gameId
          if (raw === undefined || raw === null) return null
          const bi = typeof raw === 'bigint' ? raw : BigInt(raw)
          return bi.toString()
        }).filter((x: any) => x !== null)
        // Unique + newest first
        const unique = Array.from(new Set(proposedIds)).reverse()
        ids = unique.slice(start, start + limit) as any
      } catch (e) {
        // ignore fallback errors
      }
    }

    return NextResponse.json({ ok: true, ids }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}