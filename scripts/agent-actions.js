#!/usr/bin/env node
/*
  Agent Actions Script
  Uses the same public API endpoints your agent will call.
  - Proposes a riddle puzzle with a precommitted solution hash
  - Finds the new gameId by diffing active games
  - Votes to approve
  - Submits the solution
  - Prints final game state

  Requirements:
  - Local app running at BASE_URL (default http://localhost:3000)
  - Server env has EVM_PRIVATE_KEY set to a funded wallet on your local chain
*/

// Node 18+ has global fetch
const { keccak256, toUtf8Bytes } = require('ethers')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const headers = { 'Content-Type': 'application/json' }

async function fetchJson(url, init) {
  const res = await fetch(url, init)
  const txt = await res.text()
  try { return JSON.parse(txt) } catch { return { error: 'Invalid JSON', body: txt, status: res.status } }
}

async function getActiveGames(start = 0, limit = 50) {
  return fetchJson(`${BASE_URL}/api/x402/games?start=${start}&limit=${limit}`)
}

async function getDefaultEntryFee() {
  return fetchJson(`${BASE_URL}/api/x402/default-fee`)
}

async function proposePuzzle({ puzzle, solutionHash, entryFee, voteThreshold = 1, token = '0x0000000000000000000000000000000000000000', puzzleType = 1, oracleParams = '' }) {
  return fetchJson(`${BASE_URL}/api/x402/propose`, {
    method: 'POST', headers, body: JSON.stringify({ puzzle, solutionHash, entryFee, token, voteThreshold, puzzleType, oracleParams })
  })
}

async function voteOnProposal({ gameId, approve = true }) {
  return fetchJson(`${BASE_URL}/api/x402/vote`, { method: 'POST', headers, body: JSON.stringify({ gameId, approve }) })
}

async function submitSolution({ gameId, solution }) {
  return fetchJson(`${BASE_URL}/api/x402/submit`, { method: 'POST', headers, body: JSON.stringify({ gameId, solution }) })
}

async function getGame(id) {
  return fetchJson(`${BASE_URL}/api/x402/games/${id}`)
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  const puzzle = process.env.AGENT_PUZZLE || 'What number is twice two?'
  const solution = process.env.AGENT_SOLUTION || '4'

  console.log('Base URL:', BASE_URL)
  console.log('Puzzle:', puzzle)
  console.log('Solution:', solution)

  // 1) Active games before
  const before = await getActiveGames(0, 50)
  if (!before?.ok) throw new Error('Failed to read active games before: ' + (before?.error || before?.body))
  const beforeIds = new Set(before.ids || [])
  console.log('Active games before:', before.ids)

  // 2) Default entry fee
  const df = await getDefaultEntryFee()
  if (!df?.defaultFee) throw new Error('Failed to read default fee: ' + (df?.error || df?.body))
  const entryFee = df.defaultFee
  console.log('Default entry fee (wei):', entryFee)

  // 3) Propose riddle puzzle with precommitted solution hash
  const solutionHash = keccak256(toUtf8Bytes(solution))
  const pr = await proposePuzzle({ puzzle, solutionHash, entryFee, voteThreshold: 1, token: '0x0000000000000000000000000000000000000000', puzzleType: 0 })
  if (!pr?.ok) throw new Error('Propose failed: ' + (pr?.error || pr?.body))
  console.log('Propose txHash:', pr.txHash)

  // Prefer gameId from API response to avoid guessing
  let gameId = pr?.gameId ?? null
  // 4) Find new gameId by scanning existing games
  for (let attempt = 0; attempt < 10 && gameId == null; attempt++) {
    await sleep(500)
    let lastExisting = 0
    for (let i = 1; i <= 100; i++) {
      const gr = await getGame(i)
      if (gr?.ok && gr.game?.exists) lastExisting = i
    }
    if (lastExisting > 0) gameId = lastExisting
  }
  // Fallback: Find new gameId by scanning existing games if API didn’t return it
  if (gameId == null) {
    // 4) Find new gameId by scanning existing games
    for (let attempt = 0; attempt < 10 && gameId == null; attempt++) {
      await sleep(500)
      let lastExisting = 0
      for (let i = 1; i <= 100; i++) {
        const gr = await getGame(i)
        if (gr?.ok && gr.game?.exists) lastExisting = i
      }
      if (lastExisting > 0) gameId = lastExisting
    }
    if (gameId == null) throw new Error('Could not determine new gameId; try increasing wait or range')
  }
  console.log('New gameId:', gameId)

  // 5) Vote approve
  const vr = await voteOnProposal({ gameId, approve: true })
  if (!vr?.ok) throw new Error('Vote failed: ' + (vr?.error || vr?.body))
  console.log('Vote txHash:', vr.txHash)

  // 6) Submit solution (server will attach fee if required)
  const sr = await submitSolution({ gameId, solution })
  if (!sr?.ok) throw new Error('Submit failed: ' + (sr?.error || sr?.body))
  console.log('Submit txHash:', sr.txHash)

  // 7) Read final game state
  const gr = await getGame(gameId)
  if (!gr?.ok) throw new Error('Get game failed: ' + (gr?.error || gr?.body))
  console.log('Game:', gr.game)

  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })