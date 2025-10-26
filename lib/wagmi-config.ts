import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Define Sei networks
const seiMainnet = {
  id: 1329,
  name: 'Sei Network',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-rpc.sei-apis.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com' },
  },
} as const

const seiTestnet = {
  id: 713715,
  name: 'Sei Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-rpc-testnet.sei-apis.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com/?chain=atlantic-2' },
  },
} as const

const localNetwork = {
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
} as const

export const config = createConfig({
  chains: [seiMainnet, seiTestnet, localNetwork, mainnet, sepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [seiMainnet.id]: http(),
    [seiTestnet.id]: http(),
    [localNetwork.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}