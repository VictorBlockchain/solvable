'use client'

import React from 'react'
import { WagmiProvider } from 'wagmi'
import { config as wagmiConfig } from '../../lib/wagmi-config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Web3ModalProvider from '@/components/shared/Web3ModalProvider'
import GlobalWalletRegister from '@/components/shared/GlobalWalletRegister'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    console.log('[Providers] Mounted: WagmiProvider + Web3Modal initialized')
  }, [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Web3ModalProvider>
          <GlobalWalletRegister />
          {children}
        </Web3ModalProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}