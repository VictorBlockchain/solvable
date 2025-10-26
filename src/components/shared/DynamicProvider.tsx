'use client'

import React from 'react'
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { CosmosWalletConnectors } from '@dynamic-labs/cosmos'

interface Props {
  children: React.ReactNode
}

export function DynamicProvider({ children }: Props) {
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || 'REPLACE-WITH-YOUR-ENVIRONMENT-ID'

  return (
    <DynamicContextProvider
      settings={{
        environmentId,
        walletConnectors: [CosmosWalletConnectors],
      }}
    >
      {children}
    </DynamicContextProvider>
  )
}