import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const start = Number(searchParams.get('start') || '0')
    const limit = Number(searchParams.get('limit') || '50')

    // Try Supabase first for pending proposals
    try {
      const { getSupabaseServer } = await import('@/lib/supabaseServer')
      const supabase = getSupabaseServer()
      let q = supabase.from('games').select('id,status').order('created_at', { ascending: false })
      q = q.in('status', ['pending'])
      q = q.range(start, Math.max(start, start + limit - 1))
      const { data, error } = await q
      if (!error && data && data.length > 0) {
        const ids = (data || []).map((row: any) => Number(row.id))
        return NextResponse.json({ ok: true, ids }, { status: 200 })
      }
    } catch {}

    // Fallback to on-chain logs
    const onchain = await import('@/lib/onchain')
    const abiMod = await import('@/lib/abi/solvable')

    const event = (abiMod as any).SolvableAbi.find((x: any) => x.type === 'event' && x.name === 'PuzzleProposed')
    const logs = await onchain.publicClient.getLogs({
      address: onchain.SOLVABLE_CONTRACT_ADDRESS,
      event: event as any,
      fromBlock: BigInt(0),
      toBlock: 'latest',
    } as any)

    const proposedIds = (logs as any[])
      .map((log: any) => {
        // Prefer topic[1] for indexed uint256 gameId
        const topic = log?.topics?.[1]
        if (typeof topic === 'string' && topic.startsWith('0x')) {
          try { return BigInt(topic) } catch {}
        }
        // Fallback to args if available
        const raw = (log?.args as any)?.gameId
        if (raw !== undefined && raw !== null) {
          try { return typeof raw === 'bigint' ? raw : BigInt(raw) } catch {}
        }
        return null
      })
      .filter((id: any) => typeof id === 'bigint')

    const ids = proposedIds.map((id: bigint) => Number(id))
    return NextResponse.json({ ok: true, ids }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}