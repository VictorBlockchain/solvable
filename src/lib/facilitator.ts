import { Facilitator } from '@x402-sovereign/core'
import { sei, seiTestnet } from 'viem/chains'

let facilitatorSingleton: Facilitator | null = null

function getEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

export function getFacilitator() {
  if (facilitatorSingleton) return facilitatorSingleton

  const pk = getEnv('EVM_PRIVATE_KEY') as `0x${string}`
  const chainId = Number(process.env.CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || 1328)
  const networks = [chainId === 1329 ? sei : seiTestnet]

  facilitatorSingleton = new Facilitator({ evmPrivateKey: pk, networks })
  return facilitatorSingleton
}