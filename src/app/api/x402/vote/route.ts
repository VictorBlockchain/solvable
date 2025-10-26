import { NextRequest, NextResponse } from 'next/server'
import { sendContractTx } from '@/lib/onchain'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gameId, approve } = body || {}

    if (typeof gameId !== 'number' && typeof gameId !== 'string' && typeof gameId !== 'bigint') {
      return NextResponse.json({ error: 'Invalid gameId' }, { status: 400 })
    }
    if (typeof approve !== 'boolean') {
      return NextResponse.json({ error: 'Invalid approve' }, { status: 400 })
    }

    const args: [bigint, boolean] = [BigInt(gameId), approve]
    const { hash, receipt } = await sendContractTx({ functionName: 'voteOnProposal', args })
    return NextResponse.json({ ok: true, txHash: hash, status: receipt.status }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}