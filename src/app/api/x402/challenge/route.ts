import { NextRequest, NextResponse } from 'next/server'
import { Address } from 'viem'
import { sendContractTx, getChallengeFee, getGame } from '@/lib/onchain'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gameId, reason } = body || {}

    if (typeof gameId !== 'number' && typeof gameId !== 'string' && typeof gameId !== 'bigint') {
      return NextResponse.json({ error: 'Invalid gameId' }, { status: 400 })
    }
    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    const id = BigInt(gameId)
    const game = await getGame(id)
    if (!game.exists) {
      return NextResponse.json({ error: 'Game does not exist' }, { status: 404 })
    }
    if (game.token !== ('0x0000000000000000000000000000000000000000' as Address)) {
      return NextResponse.json({ error: 'ERC20 challenges not supported by server wallet yet' }, { status: 400 })
    }

    const fee = await getChallengeFee()
    const args: [bigint, string] = [id, reason]
    const { hash, receipt } = await sendContractTx({ functionName: 'challengeSolution', args, valueWei: fee })

    return NextResponse.json({ ok: true, txHash: hash, status: receipt.status }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}