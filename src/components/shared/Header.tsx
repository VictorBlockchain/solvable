'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Wallet, 
  Menu, 
  X, 
  Zap
} from 'lucide-react'
import { useAccount, useDisconnect } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const web3Modal = useWeb3Modal()

  useEffect(() => {
    console.log('[Header] Rendered. isConnected:', isConnected, 'address:', address)
  }, [isConnected, address])

  const displayAddress = address
  const shortAddress = displayAddress
    ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
    : 'Connect Wallet'

  const handleConnectWallet = async () => {
    await web3Modal.open()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative">
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-teal-500 to-coral-500 bg-clip-text text-transparent">
              Solvable
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-teal-500 transition-colors font-mono text-sm"
            >
              Explore
            </Link>
            <Link 
              href="/leaderboard" 
              className="text-gray-700 hover:text-teal-500 transition-colors font-mono text-sm"
            >
              Leaderboard
            </Link>
            <Link 
              href="/docs" 
              className="text-gray-700 hover:text-teal-500 transition-colors font-mono text-sm"
            >
              Docs
            </Link>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200">
                x402
              </Badge>
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                SEI
              </Badge>
            </div>
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Wallet Connection (Desktop) */}
            {isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={'default'}
                    className={`hidden sm:flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600`}
                  >
                    <Wallet className="h-4 w-4" />
                    <span className="font-mono text-sm">{shortAddress}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-mono text-xs">Wallet</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => disconnect()} variant="destructive">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={handleConnectWallet}
                variant={'outline'}
                className={`hidden sm:flex items-center space-x-2 border-gray-300 hover:border-teal-500`}
              >
                <Wallet className="h-4 w-4" />
                <span className="font-mono text-sm">{shortAddress}</span>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-teal-500 transition-colors font-mono text-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Explore Puzzles
              </Link>
              <Link 
                href="/leaderboard" 
                className="text-gray-700 hover:text-teal-500 transition-colors font-mono text-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <Link 
                href="/docs" 
                className="text-gray-700 hover:text-teal-500 transition-colors font-mono text-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Docs
              </Link>
              {/* Wallet Connection (Mobile) */}
              {isConnected ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={'default'}
                      className={`w-full justify-center bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600`}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      <span className="font-mono text-sm">{shortAddress}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="font-mono text-xs">Wallet</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => disconnect()} variant="destructive">
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={handleConnectWallet}
                  variant={'outline'}
                  className={`w-full justify-center border-gray-300 hover:border-teal-500`}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  <span className="font-mono text-sm">{shortAddress}</span>
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}