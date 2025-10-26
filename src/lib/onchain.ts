import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Address, Hex, createPublicClient, createWalletClient, defineChain, encodeFunctionData, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { SolvableAbi } from '@/lib/abi/solvable'

function getEnv(name: string, fallback?: string) {
  const v = process.env[name]
  if (v && v.length) return v
  if (fallback !== undefined) return fallback
  throw new Error(`Missing required env var: ${name}`)
}

export const CHAIN_ID = Number(process.env.CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || 31337)
export const RPC_URL = getEnv('RPC_URL', process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545')
export const SOLVABLE_CONTRACT_ADDRESS = getEnv('SOLVABLE_CONTRACT_ADDRESS', '0x0000000000000000000000000000000000000000') as Address

const chain = defineChain({
  id: CHAIN_ID,
  name: 'GoBit Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
})

export const publicClient = createPublicClient({ chain, transport: http(RPC_URL) })

function getWalletClient() {
  const pk = process.env.EVM_PRIVATE_KEY
  if (!pk) throw new Error('Missing env EVM_PRIVATE_KEY for server wallet')
  const account = privateKeyToAccount(pk as Hex)
  return createWalletClient({ chain, transport: http(RPC_URL), account })
}

export async function sendContractTx({
  functionName,
  args,
  valueWei,
}: {
  functionName: string
  args: readonly unknown[]
  valueWei?: bigint
}) {
  const data = encodeFunctionData({ abi: SolvableAbi as any, functionName: functionName as any, args: args as any })
  const wallet = getWalletClient()
  const hash = await wallet.sendTransaction({ to: SOLVABLE_CONTRACT_ADDRESS, data, value: valueWei })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  return { hash, receipt }
}

export async function readContract<T = unknown>({ functionName, args }: { functionName: string; args?: readonly unknown[] }) {
  return publicClient.readContract({ abi: SolvableAbi, address: SOLVABLE_CONTRACT_ADDRESS, functionName: functionName as any, args: (args || []) as any }) as Promise<T>
}

export async function getGame(id: bigint) {
  const details = await readContract<[
    {
      puzzle: string
      solutionHash: Hex
      status: number
      pot: bigint
      entryFee: bigint
      token: Address
      proposer: Address
      winner: Address
      voteThreshold: bigint
      challengeThreshold: bigint
      puzzleType: number
      requireSubmissionFee: boolean
      exists: boolean
      firstSolver: Address
      oracleParams: string
      verificationDeadline: bigint
    },
    bigint,
    bigint,
    bigint,
  ]>({ functionName: 'getGameDetails', args: [id] })
  return details[0]
}

export async function getActiveGames(start: bigint, limit: bigint) {
  return readContract<bigint[]>({ functionName: 'getActiveGames', args: [start, limit] })
}

export async function getChallengeFee() {
  return readContract<bigint>({ functionName: 'challengeFee' })
}

export async function getDefaultEntryFee() {
  // Use challenge fee as base and multiply by 500 (5 SEI if challenge fee is 0.01 SEI)
  const challengeFee = await getChallengeFee()
  return challengeFee * BigInt(500)
}