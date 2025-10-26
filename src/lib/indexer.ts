import { Address } from 'viem'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { publicClient, GOBIT_CONTRACT_ADDRESS } from '@/lib/onchain'
import { GoBitAbi } from '@/lib/abi/gobit'
import { getActiveGames, getGame } from '@/lib/onchain'

function zeroAddress(addr: string) {
  return addr.toLowerCase() === '0x0000000000000000000000000000000000000000'
}

function statusToText(statusNum: number): 'none'|'pending'|'active'|'verification_pending'|'solved'|'archived' {
  // Assumed mapping from contract enum to DB enum
  switch (statusNum) {
    case 0: return 'none'
    case 1: return 'pending'
    case 2: return 'active'
    case 3: return 'verification_pending'
    case 4: return 'solved'
    case 5: return 'archived'
    default: return 'pending'
  }
}

function puzzleTypeToText(pt: number): 'riddle'|'math'|'other' {
  if (pt === 0) return 'riddle'
  if (pt === 1) return 'math'
  return 'other'
}

async function upsertGameRow(id: bigint) {
  const g = await getGame(id)
  const row = {
    id: Number(id),
    puzzle: g.puzzle,
    solution_hash: g.oracleParams ? null : undefined, // no direct solution hash in tuple; placeholder
    status: statusToText(Number(g.status)),
    pot: g.pot.toString(),
    entry_fee: g.entryFee.toString(),
    token_address: g.token as string,
    proposer_address: g.proposer as string,
    winner_address: zeroAddress(g.winner) ? null : (g.winner as string),
    vote_threshold: Number(g.voteThreshold),
    challenge_threshold: Number(g.challengeThreshold),
    puzzle_type: puzzleTypeToText(Number(g.puzzleType)),
    require_submission_fee: g.requireSubmissionFee,
    exists: g.exists,
    first_solver_address: zeroAddress(g.firstSolver) ? null : (g.firstSolver as string),
    oracle_params: g.oracleParams,
    verification_deadline: Number(g.verificationDeadline) > 0 ? new Date(Number(g.verificationDeadline) * 1000).toISOString() : null,
  }
  const supabaseServer = getSupabaseServer()
  await supabaseServer.from('games').upsert(row)
}

async function insertDonation(gameId: bigint, donor: Address, amount: bigint) {
  const supabaseServer = getSupabaseServer()
  await supabaseServer.from('game_donations').insert({
    game_id: Number(gameId),
    donor_address: donor as string,
    amount: amount.toString(),
    token_address: null,
  })
}

export async function startIndexer() {
  console.log('[indexer] starting watchers')
  const tracked = new Set<number>()

  // Seed active games once
  try {
    const ids = await getActiveGames(BigInt(0), BigInt(200))
    for (const id of ids) {
      tracked.add(Number(id))
      await upsertGameRow(id)
    }
    console.log(`[indexer] seeded ${ids.length} active games`)
  } catch (err) {
    console.warn('[indexer] initial seed failed:', err)
  }

  // Watch PuzzleProposed → upsert games
  const unwatchProposed = publicClient.watchContractEvent({
    address: GOBIT_CONTRACT_ADDRESS,
    abi: GoBitAbi as any,
    eventName: 'PuzzleProposed',
    onLogs: async (logs) => {
      for (const log of logs as any[]) {
        try {
          const args = (log as any).args || {}
          const rawGameId = (args as any).gameId
          const gameId = typeof rawGameId === 'bigint' ? rawGameId : BigInt(rawGameId)
          tracked.add(Number(gameId))
          await upsertGameRow(gameId)
          console.log('[indexer] PuzzleProposed upserted game', gameId.toString())
        } catch (err) {
          console.error('[indexer] PuzzleProposed handling error:', err)
        }
      }
    },
    pollingInterval: 5000,
  })

  // Watch DonationReceived → insert donation and refresh game
  const unwatchDonation = publicClient.watchContractEvent({
    address: GOBIT_CONTRACT_ADDRESS,
    abi: GoBitAbi as any,
    eventName: 'DonationReceived',
    onLogs: async (logs) => {
      for (const log of logs as any[]) {
        try {
          const args = (log as any).args || {}
          const rawGameId = (args as any).gameId
          const donor: Address = (args as any).donor as Address
          const rawAmount = (args as any).amount
          const gameId = typeof rawGameId === 'bigint' ? rawGameId : BigInt(rawGameId)
          const amount = typeof rawAmount === 'bigint' ? rawAmount : BigInt(rawAmount)
          await insertDonation(gameId, donor, amount)
          await upsertGameRow(gameId)
          tracked.add(Number(gameId))
          console.log('[indexer] DonationRecorded for game', Number(gameId), 'amount', amount.toString())
        } catch (err) {
          console.error('[indexer] DonationReceived handling error:', err)
        }
      }
    },
    pollingInterval: 5000,
  })

  // Periodic reconciliation: refresh tracked games status/winner
  const interval = setInterval(async () => {
    try {
      for (const idNum of Array.from(tracked)) {
        await upsertGameRow(BigInt(idNum))
      }
    } catch (err) {
      console.warn('[indexer] reconciliation error:', err)
    }
  }, 15000)

  console.log('[indexer] watchers running')

  return () => {
    try { unwatchProposed?.() } catch {}
    try { unwatchDonation?.() } catch {}
    try { clearInterval(interval) } catch {}
    console.log('[indexer] stopped')
  }
}