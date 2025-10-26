'use client'

import React from 'react'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { config as wagmiConfig } from '../../../lib/wagmi-config'

let web3ModalInitialized = false

export default function Web3ModalProvider({ children }: { children: React.ReactNode }) {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

  React.useEffect(() => {
    if (web3ModalInitialized) return
    web3ModalInitialized = true
    createWeb3Modal({
      wagmiConfig,
      projectId,
      enableAnalytics: false,
    })
  }, [projectId])

  return <>{children}</>
}