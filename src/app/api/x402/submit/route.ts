import { NextRequest, NextResponse } from 'next/server'
import { Address } from 'viem'
import { sendContractTx, getGame } from '@/lib/onchain'
import { upsertGameRow } from '@/lib/indexer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gameId, solution } = body || {}

    if (typeof gameId !== 'number' && typeof gameId !== 'string' && typeof gameId !== 'bigint') {
      return NextResponse.json({ error: 'Invalid gameId' }, { status: 400 })
    }
    if (!solution || typeof solution !== 'string') {
      return NextResponse.json({ error: 'Invalid solution' }, { status: 400 })
    }

    const id = BigInt(gameId)
    const game = await getGame(id)

    if (!game.exists) {
      return NextResponse.json({ error: 'Game does not exist' }, { status: 404 })
    }

    if (game.token !== ('0x0000000000000000000000000000000000000000' as Address)) {
      return NextResponse.json({ error: 'ERC20 submissions not supported by server wallet yet' }, { status: 400 })
    }

    // Normalize solution by removing all whitespace prior to on-chain submission
    const normalizedSolution = solution.replace(/\s+/g, '')

    const valueWei = game.requireSubmissionFee ? game.entryFee : undefined
    const args: [bigint, string] = [id, normalizedSolution]
    const { hash, receipt } = await sendContractTx({ functionName: 'submitSolution', args, valueWei })

    // Reflect status changes immediately
    try { await upsertGameRow(id) } catch {}

    return NextResponse.json({ ok: true, txHash: hash, status: receipt.status }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}