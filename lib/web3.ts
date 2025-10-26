import { createPublicClient, http } from 'viem'
import { sei, seiTestnet } from 'viem/chains'
import { getNetworkConfig, isTestnet, isLocal, isMainnet, deployment } from './config/deployment'

// Get current network configuration
const networkConfig = getNetworkConfig()

// Local Hardhat network configuration
export const LOCAL_CHAIN_CONFIG = {
  id: 31337,
  name: 'GoChain Testnet',
  network: 'hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hardhat Explorer',
      url: 'http://127.0.0.1:8545',
    },
  },
} as const

// Sei blockchain configuration
export const SEI_CHAIN_CONFIG = {
  mainnet: {
    id: 1329,
    name: 'Sei Network',
    network: 'sei',
    nativeCurrency: {
      decimals: 18,
      name: 'Sei',
      symbol: 'SEI',
    },
    rpcUrls: {
      default: {
        http: ['https://evm-rpc.sei-apis.com'],
      },
      public: {
        http: ['https://evm-rpc.sei-apis.com'],
      },
    },
    blockExplorers: {
      default: {
        name: 'Sei Explorer',
        url: 'https://seitrace.com',
      },
    },
  },
  testnet: {
    id: 1328,
    name: 'Sei Testnet',
    network: 'sei-testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'Sei',
      symbol: 'SEI',
    },
    rpcUrls: {
      default: {
        http: ['https://evm-rpc-testnet.sei-apis.com'],
      },
      public: {
        http: ['https://evm-rpc-testnet.sei-apis.com'],
      },
    },
    blockExplorers: {
      default: {
        name: 'Sei Testnet Explorer',
        url: 'https://seitrace.com/?chain=testnet',
      },
    },
  },
} as const

// Create Viem client for Sei
export const seiClient = createPublicClient({
  chain: sei,
  transport: http(),
})

// Create Viem client for local Hardhat
export const localClient = createPublicClient({
  chain: LOCAL_CHAIN_CONFIG,
  transport: http(),
})

// Default client based on current environment
export const publicClient = createPublicClient({
  chain: isTestnet()
    ? SEI_CHAIN_CONFIG.testnet
    : isMainnet()
      ? SEI_CHAIN_CONFIG.mainnet
      : LOCAL_CHAIN_CONFIG,
  transport: http(networkConfig.rpcUrl),
})

// Contract addresses from centralized deployment configuration
export const CONTRACT_ADDRESSES = {
  CHALLENGE_FACTORY: deployment.contracts.challengeFactory,
} as const

// Web3 configuration based on current environment
export const WEB3_CONFIG = {
  chainId: networkConfig.chainId,
  chainName: networkConfig.name,
  nativeCurrency: networkConfig.nativeCurrency,
  rpcUrls: {
    default: {
      http: [networkConfig.rpcUrl],
    },
    public: {
      http: [networkConfig.rpcUrl],
    },
  },
  blockExplorerUrls: [networkConfig.blockExplorer],
} as const

// Dynamic Labs configuration based on current environment
export const DYNAMIC_CONFIG = {
  environmentId:
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || 'REPLACE-WITH-YOUR-ENVIRONMENT-ID',
  networks: [
    {
      blockExplorerUrls: [networkConfig.blockExplorer],
      chainId: networkConfig.chainId,
      chainName: networkConfig.name,
      iconUrls: isTestnet()
        ? ['https://app.dynamic.xyz/assets/networks/sei.svg']
        : isMainnet()
          ? ['https://app.dynamic.xyz/assets/networks/sei.svg']
          : ['https://app.dynamic.xyz/assets/networks/ethereum.svg'],
      name: networkConfig.name,
      nativeCurrency: networkConfig.nativeCurrency,
      networkId: networkConfig.chainId,
      rpcUrls: [networkConfig.rpcUrl],
      vanityName: networkConfig.name,
    },
  ],
} as const
