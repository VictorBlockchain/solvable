import { NextRequest, NextResponse } from 'next/server'
import { Address, decodeEventLog } from 'viem'
import { sendContractTx, SOLVABLE_CONTRACT_ADDRESS } from '@/lib/onchain'
import { GoBitAbi } from '@/lib/abi/solvable'
import { upsertGameRow } from '@/lib/indexer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      puzzle,
      solutionHash = '0x0000000000000000000000000000000000000000000000000000000000000000',
      entryFee,
      token = '0x0000000000000000000000000000000000000000',
      voteThreshold,
      puzzleType,
      oracleParams = '',
    } = body || {}

    if (!puzzle || typeof puzzle !== 'string') {
      return NextResponse.json({ error: 'Invalid puzzle' }, { status: 400 })
    }
    if (typeof entryFee !== 'string' && typeof entryFee !== 'number' && typeof entryFee !== 'bigint') {
      return NextResponse.json({ error: 'Invalid entryFee' }, { status: 400 })
    }
    if (typeof voteThreshold !== 'number' || voteThreshold <= 0) {
      return NextResponse.json({ error: 'Invalid voteThreshold' }, { status: 400 })
    }
    if (typeof puzzleType !== 'number') {
      return NextResponse.json({ error: 'Invalid puzzleType' }, { status: 400 })
    }

    const args: [string, `0x${string}`, bigint, Address, bigint, number, string] = [
      puzzle,
      solutionHash as `0x${string}`,
      BigInt(entryFee),
      token as Address,
      BigInt(voteThreshold),
      puzzleType,
      oracleParams,
    ]

    const { hash, receipt } = await sendContractTx({ functionName: 'proposePuzzle', args })

    // Decode PuzzleProposed event to return authoritative gameId
    let gameId: string | undefined
    try {
      for (const log of receipt?.logs || []) {
        if ((log as any).address?.toLowerCase() !== SOLVABLE_CONTRACT_ADDRESS.toLowerCase()) continue
        const decoded = decodeEventLog({ abi: GoBitAbi as any, data: (log as any).data, topics: (log as any).topics }) as any
        if (decoded?.eventName === 'PuzzleProposed') {
          const raw = decoded?.args?.gameId
          const idBig = typeof raw === 'bigint' ? raw : BigInt(raw)
          gameId = idBig.toString()
          break
        }
      }
    } catch {}

    // Ensure DB is updated immediately for UI
    try {
      if (gameId) {
        await upsertGameRow(BigInt(gameId))
      }
    } catch {}

    return NextResponse.json({ ok: true, txHash: hash, status: receipt.status, gameId }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}