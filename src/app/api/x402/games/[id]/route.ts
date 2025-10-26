import { NextRequest, NextResponse } from 'next/server'
import { getGame } from '@/lib/onchain'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const idStr = params.id
    const id = BigInt(idStr)
    const g = await getGame(id)
    return NextResponse.json({ ok: true, game: {
      puzzle: g.puzzle,
      status: g.status,
      pot: g.pot.toString(),
      entryFee: g.entryFee.toString(),
      token: g.token,
      proposer: g.proposer,
      winner: g.winner,
      voteThreshold: Number(g.voteThreshold),
      challengeThreshold: Number(g.challengeThreshold),
      puzzleType: g.puzzleType,
      requireSubmissionFee: g.requireSubmissionFee,
      exists: g.exists,
      firstSolver: g.firstSolver,
      oracleParams: g.oracleParams,
      verificationDeadline: Number(g.verificationDeadline),
    } }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}