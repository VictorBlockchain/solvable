import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

// Return DB-backed games with statuses and key fields
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const start = Number(searchParams.get('start') || '0')
    const limit = Number(searchParams.get('limit') || '50')
    const statusParam = (searchParams.get('status') || 'active').toLowerCase()

    const supabase = getSupabaseServer()
    let query = supabase
      .from('games')
      .select(
        [
          'id',
          'puzzle',
          'status',
          'pot',
          'entry_fee',
          'token_address',
          'proposer_address',
          'winner_address',
          'vote_threshold',
          'challenge_threshold',
          'puzzle_type',
          'require_submission_fee',
          'oracle_params',
          'verification_deadline',
          'created_at',
        ].join(',')
      )
      .order('created_at', { ascending: false })

    // Status filtering similar to /api/x402/games
    if (statusParam === 'active') {
      query = query.in('status', ['active', 'verification_pending'])
    } else if (statusParam === 'pending') {
      query = query.eq('status', 'pending')
    } else if (statusParam === 'solved') {
      query = query.in('status', ['solved', 'archived'])
    } else if (statusParam === 'all') {
      // no filter
    } else {
      query = query.in('status', ['active', 'verification_pending', 'pending'])
    }

    query = query.range(start, Math.max(start, start + limit - 1))

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const games = (data || []).map((row: any) => ({
      id: String(row.id),
      puzzle: row.puzzle,
      status: row.status,
      pot: String(row.pot ?? '0'),
      entryFee: String(row.entry_fee ?? '0'),
      token: row.token_address,
      proposer: row.proposer_address,
      winner: row.winner_address,
      voteThreshold: Number(row.vote_threshold ?? 0),
      challengeThreshold: Number(row.challenge_threshold ?? 0),
      puzzleType: Number(row.puzzle_type ?? 0),
      requireSubmissionFee: Boolean(row.require_submission_fee ?? false),
      oracleParams: row.oracle_params ?? '',
      verificationDeadline: Number(row.verification_deadline ?? 0),
    }))

    return NextResponse.json({ ok: true, games }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}