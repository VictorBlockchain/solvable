import { Address, Hex } from 'viem'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { publicClient, SOLVABLE_CONTRACT_ADDRESS } from '@/lib/onchain'
import { SolvableAbi } from '@/lib/abi/solvable'
import { getGame } from '@/lib/onchain'
import { decodeEventLog } from 'viem'

function zeroAddress(addr: string) {
  return addr.toLowerCase() === '0x0000000000000000000000000000000000000000'
}

function statusToText(statusNum: number): 'none'|'pending'|'active'|'verification_pending'|'solved'|'archived' {
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

export async function upsertGameRow(id: bigint) {
  const g = await getGame(id)
  const row = {
    id: id.toString(),
    puzzle: g.puzzle,
    solution_hash: (g as any).solutionHash ? String((g as any).solutionHash) : null,
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
  const { error } = await supabaseServer.from('games').upsert(row)
  if (error) {
    console.error('[indexer] upsertGameRow error:', error)
  } else {
    console.log('[indexer] upserted game row', row.id, row.status)
  }
}

async function insertDonation(gameId: bigint, donor: Address, amount: bigint) {
  const supabaseServer = getSupabaseServer()
  await supabaseServer.from('game_donations').insert({
    game_id: gameId.toString(),
    donor_address: donor as string,
    amount: amount.toString(),
    token_address: null,
  })
}

function parseGameIdFromLog(log: any): bigint | null {
  // Prefer decoded args over topics to avoid bigint overflow from encoded topics
  const raw = (log?.args as any)?.gameId
  if (raw !== undefined && raw !== null) {
    try { return typeof raw === 'bigint' ? raw : BigInt(raw) } catch { return null }
  }
  const topic = log?.topics?.[1]
  if (typeof topic === 'string' && topic.startsWith('0x')) {
    try { return BigInt(topic) } catch { return null }
  }
  return null
}

export async function startIndexer() {
  console.log('[indexer] starting watchers')
  const tracked = new Set<string>()

  // Backfill proposals from chain history
  try {
    const proposedLogs = await publicClient.getLogs({
      address: SOLVABLE_CONTRACT_ADDRESS,
      abi: SolvableAbi as any,
      eventName: 'PuzzleProposed',
      fromBlock: BigInt(0),
      toBlock: 'latest',
    } as any)
    for (const log of proposedLogs as any[]) {
      try {
        // Explicitly decode to ensure args.gameId is available
        let gameId: bigint | null = null
        try {
          const decoded = decodeEventLog({ abi: SolvableAbi as any, eventName: 'PuzzleProposed', data: (log as any).data, topics: (log as any).topics }) as any
          const raw = decoded?.args?.gameId
          if (raw !== undefined && raw !== null) {
            gameId = typeof raw === 'bigint' ? raw : BigInt(raw)
          }
        } catch {}
        if (!gameId) {
          gameId = parseGameIdFromLog(log)
        }
        // Skip clearly out-of-range ids for Postgres bigint
        const MAX_PG_BIGINT = BigInt('9223372036854775807')
        if (gameId && gameId > MAX_PG_BIGINT) {
          console.warn('[indexer] skipping out-of-range gameId', gameId.toString())
          continue
        }
        if (!gameId) continue
        // Special handling for gameId 0 - check if it actually exists
        if (gameId === BigInt(0)) {
          try {
            const testGame = await publicClient.readContract({
              address: SOLVABLE_CONTRACT_ADDRESS,
              abi: SolvableAbi as any,
              functionName: 'getGameDetails',
              args: [gameId],
            })
            if (!(testGame as any)?.[1]?.exists) {
              console.warn('[indexer] skipping non-existent gameId 0')
              continue
            }
          } catch (err) {
            console.warn('[indexer] gameId 0 validation failed:', err)
            continue
          }
        }
        tracked.add(gameId.toString())
        await upsertGameRow(gameId)
      } catch (err) {
        console.error('[indexer] backfill error:', err)
      }
    }
    console.log(`[indexer] backfilled ${proposedLogs.length} proposed games`)
  } catch (err) {
    console.warn('[indexer] backfill failed:', err)
  }

  // Backfill from on-chain active games list as a reliable source
  try {
    const activeIds = await publicClient.readContract({
      address: SOLVABLE_CONTRACT_ADDRESS,
      abi: SolvableAbi as any,
      functionName: 'getActiveGames',
      args: [BigInt(0), BigInt(100)], // start=0, limit=100
    }) as unknown as bigint[]
    for (const id of activeIds) {
      try {
        tracked.add(id.toString())
        await upsertGameRow(id)
      } catch (err) {
        console.error('[indexer] activeGames backfill error:', err)
      }
    }
    console.log(`[indexer] backfilled active games ${activeIds.length}`)
  } catch (err) {
    console.warn('[indexer] activeGames backfill failed:', err)
  }

  // Watch PuzzleProposed → upsert games
  const unwatchProposed = publicClient.watchContractEvent({
    address: SOLVABLE_CONTRACT_ADDRESS,
    abi: SolvableAbi as any,
    eventName: 'PuzzleProposed',
    onLogs: async (logs) => {
      for (const log of logs as any[]) {
        try {
          const gameId = parseGameIdFromLog(log)
          if (!gameId) continue
          tracked.add(gameId.toString())
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
    address: SOLVABLE_CONTRACT_ADDRESS,
    abi: SolvableAbi as any,
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
          tracked.add(gameId.toString())
          console.log('[indexer] DonationRecorded for game', gameId.toString(), 'amount', amount.toString())
        } catch (err) {
          console.error('[indexer] DonationReceived handling error:', err)
        }
      }
    },
    pollingInterval: 5000,
  })

  const interval = setInterval(async () => {
    try {
      for (const idStr of Array.from(tracked)) {
        await upsertGameRow(BigInt(idStr))
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