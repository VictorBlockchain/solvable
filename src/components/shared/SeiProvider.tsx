'use client'

import React from 'react'
import { SeiWalletProvider } from '@sei-js/react'

export function SeiProvider({ children }: { children: React.ReactNode }) {
  const chainId = process.env.NEXT_PUBLIC_SEI_CHAIN_ID || 'atlantic-2'
  const restUrl = process.env.NEXT_PUBLIC_SEI_REST_URL || 'https://rest.atlantic-2.seinetwork.io/'
  const rpcUrl = process.env.NEXT_PUBLIC_SEI_RPC_URL || 'https://rpc.atlantic-2.seinetwork.io'

  return (
    <SeiWalletProvider
      chainConfiguration={{ chainId, restUrl, rpcUrl }}
      wallets={['fin', 'compass']}
    >
      {children}
    </SeiWalletProvider>
  )
}