import { NextRequest, NextResponse } from 'next/server'
import { sendContractTx } from '@/lib/onchain'
import { upsertGameRow } from '@/lib/indexer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gameId } = body || {}

    if (typeof gameId !== 'number' && typeof gameId !== 'string' && typeof gameId !== 'bigint') {
      return NextResponse.json({ error: 'Invalid gameId' }, { status: 400 })
    }

    const args: [bigint] = [BigInt(gameId)]
    const { hash, receipt } = await sendContractTx({ functionName: 'resetGame', args })

    // Refresh DB to reflect reset status and fields
    try { await upsertGameRow(BigInt(gameId)) } catch {}

    return NextResponse.json({ ok: true, txHash: hash, status: receipt.status }, { status: 200 })
  } catch (err: any) {
    const msg = err?.message || 'Unknown error'
    // Often requires DEFAULT_ADMIN_ROLE on contract
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}