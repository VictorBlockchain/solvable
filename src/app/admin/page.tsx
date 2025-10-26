'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle, Shield, Settings, Wallet, Zap, Pause, Play, KeyRound, ExternalLink } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseEther } from 'viem'
import { SolvableAdminAbi } from '@/lib/abi/solvable-admin'

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_SOLVABLE_CONTRACT_ADDRESS || '0x8D4C3640d39C9333bB240dA4881a76269A8A387D') as `0x${string}`

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const { data: defaultAdminRole } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SolvableAdminAbi,
    functionName: 'DEFAULT_ADMIN_ROLE',
  })
  const { data: isAdmin } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SolvableAdminAbi,
    functionName: 'hasRole',
    args: [defaultAdminRole as `0x${string}` ?? '0x0000000000000000000000000000000000000000000000000000000000000000', address as `0x${string}`],
    query: { enabled: !!address },
  })

  const { data: houseAddress } = useReadContract({ address: CONTRACT_ADDRESS, abi: SolvableAdminAbi, functionName: 'houseAddress' })
  const { data: houseCut } = useReadContract({ address: CONTRACT_ADDRESS, abi: SolvableAdminAbi, functionName: 'houseCutPercentage' })
  const { data: challengeFee } = useReadContract({ address: CONTRACT_ADDRESS, abi: SolvableAdminAbi, functionName: 'challengeFee' })
  const { data: voteDefault } = useReadContract({ address: CONTRACT_ADDRESS, abi: SolvableAdminAbi, functionName: 'voteThresholdDefault' })
  const { data: paused } = useReadContract({ address: CONTRACT_ADDRESS, abi: SolvableAdminAbi, functionName: 'paused' })

  const { writeContractAsync, isPending } = useWriteContract()

  const [newHouseAddress, setNewHouseAddress] = useState('')
  const [newHouseCutBp, setNewHouseCutBp] = useState('')
  const [newChallengeFeeSei, setNewChallengeFeeSei] = useState('')
  const [newVoteDefault, setNewVoteDefault] = useState('')
  const [newChallengeThreshold, setNewChallengeThreshold] = useState('')

  const [entryGameId, setEntryGameId] = useState('')
  const [newEntryFeeSei, setNewEntryFeeSei] = useState('')

  const [toggleGameId, setToggleGameId] = useState('')
  const [toggleRequireFee, setToggleRequireFee] = useState(false)

  const [newAdminAddr, setNewAdminAddr] = useState('')
  const [newOracleAddr, setNewOracleAddr] = useState('')

  const adminRole = useMemo(() => (defaultAdminRole as `0x${string}`) || '0x0000000000000000000000000000000000000000000000000000000000000000', [defaultAdminRole])

  async function tx(fn: string, args?: readonly unknown[]) {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: SolvableAdminAbi,
      functionName: fn as any,
      args: args as any,
    } as any)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-50 via-white to-orange-50 border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              <Shield className="h-12 w-12 text-teal-500 animate-pulse-slow" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-600 to-orange-600 bg-clip-text text-transparent">
                Contract Administration
              </h1>
              <Settings className="h-8 w-8 text-orange-500 animate-float" />
            </div>
            <p className="text-xl text-gray-600 mb-2 max-w-2xl mx-auto">
              Manage Solvable contract parameters, roles, and controls on SEI.
            </p>
            <p className="text-sm text-gray-500 font-mono">Mainnet • Chain ID 1329 • Sei EVM</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <Card className="sticky top-24 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-teal-500" />
                  Admin Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3 p-4 text-sm font-mono">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{isConnected ? address : 'Wallet not connected'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={isAdmin ? 'text-green-700' : 'text-red-700'}>
                      {isAdmin ? 'Admin Access Granted' : 'Admin Access Required'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">Contract</Badge>
                    <span className="truncate">{CONTRACT_ADDRESS}</span>
                  </div>
                  <a
                    href={`https://seitrace.com/address/${CONTRACT_ADDRESS}?chain=pacific-1&tab=contract`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700"
                  >
                    <ExternalLink className="h-4 w-4" /> View on Seitrace
                  </a>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 space-y-8">
            {/* Access Notice */}
            {!isAdmin && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-orange-900 mb-2">Admin Wallet Required</h3>
                      <p className="text-sm text-orange-800">
                        Connect a wallet that has <Badge variant="outline" className="font-mono text-xs">DEFAULT_ADMIN_ROLE</Badge> on the Solvable contract to make changes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Settings */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5 text-teal-500" />
                  Current Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-sm font-mono text-gray-700">
                <div className="flex items-center gap-2"><span className="text-teal-700">houseAddress</span><span>{houseAddress as string || '—'}</span></div>
                <div className="flex items-center gap-2"><span className="text-teal-700">houseCutPercentage</span><span>{houseCut?.toString() ?? '—'} bp</span></div>
                <div className="flex items-center gap-2"><span className="text-teal-700">challengeFee</span><span>{challengeFee?.toString() ?? '—'} wei</span></div>
                <div className="flex items-center gap-2"><span className="text-teal-700">voteThresholdDefault</span><span>{voteDefault?.toString() ?? '—'}</span></div>
                <div className="flex items-center gap-2"><span className="text-teal-700">paused</span><span>{paused ? 'true' : 'false'}</span></div>
              </CardContent>
            </Card>

            {/* Fees & House */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-orange-500" />
                  Fees & House Address
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm">House Address</Label>
                    <Input placeholder="0x..." value={newHouseAddress} onChange={(e) => setNewHouseAddress(e.target.value)} />
                    <Button className="mt-2" disabled={!isAdmin || isPending || !newHouseAddress}
                      onClick={() => tx('setHouseAddress', [newHouseAddress as `0x${string}`])}
                    >Update House Address</Button>
                  </div>
                  <div>
                    <Label className="text-sm">House Cut (basis points)</Label>
                    <Input placeholder="e.g. 500" value={newHouseCutBp} onChange={(e) => setNewHouseCutBp(e.target.value)} />
                    <Button className="mt-2" disabled={!isAdmin || isPending || !newHouseCutBp}
                      onClick={() => tx('setHouseCutPercentage', [BigInt(newHouseCutBp)])}
                    >Update House Cut</Button>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm">Challenge Fee (SEI)</Label>
                    <Input placeholder="e.g. 0.01" value={newChallengeFeeSei} onChange={(e) => setNewChallengeFeeSei(e.target.value)} />
                    <Button className="mt-2" disabled={!isAdmin || isPending || !newChallengeFeeSei}
                      onClick={() => tx('setChallengeFee', [parseEther(newChallengeFeeSei)])}
                    >Update Challenge Fee</Button>
                  </div>
                  <div>
                    <Label className="text-sm">Default Vote Threshold</Label>
                    <Input placeholder="e.g. 5" value={newVoteDefault} onChange={(e) => setNewVoteDefault(e.target.value)} />
                    <Button className="mt-2" disabled={!isAdmin || isPending || !newVoteDefault}
                      onClick={() => tx('setVoteThresholdDefault', [BigInt(newVoteDefault)])}
                    >Update Vote Threshold</Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Challenge Threshold</Label>
                  <Input placeholder="e.g. 3" value={newChallengeThreshold} onChange={(e) => setNewChallengeThreshold(e.target.value)} />
                  <Button className="mt-2" disabled={!isAdmin || isPending || !newChallengeThreshold}
                    onClick={() => tx('setChallengeThreshold', [BigInt(newChallengeThreshold)])}
                  >Update Challenge Threshold</Button>
                </div>
              </CardContent>
            </Card>

            {/* Game-level Fees */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-teal-500" />
                  Game Fees & Submission Toggle
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm">Game ID</Label>
                    <Input placeholder="e.g. 1" value={entryGameId} onChange={(e) => setEntryGameId(e.target.value)} />
                    <Label className="text-sm mt-2">Entry Fee (SEI)</Label>
                    <Input placeholder="e.g. 0.05" value={newEntryFeeSei} onChange={(e) => setNewEntryFeeSei(e.target.value)} />
                    <Button className="mt-2" disabled={!isAdmin || isPending || !entryGameId || !newEntryFeeSei}
                      onClick={() => tx('setEntryFee', [BigInt(entryGameId), parseEther(newEntryFeeSei)])}
                    >Set Entry Fee</Button>
                  </div>
                  <div>
                    <Label className="text-sm">Game ID</Label>
                    <Input placeholder="e.g. 1" value={toggleGameId} onChange={(e) => setToggleGameId(e.target.value)} />
                    <div className="mt-2 flex items-center gap-2">
                      <input type="checkbox" checked={toggleRequireFee} onChange={(e) => setToggleRequireFee(e.target.checked)} />
                      <span className="text-sm">Require Submission Fee</span>
                    </div>
                    <Button className="mt-2" disabled={!isAdmin || isPending || !toggleGameId}
                      onClick={() => tx('toggleSubmissionFee', [BigInt(toggleGameId), toggleRequireFee])}
                    >Toggle Submission Fee</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Roles & Admins */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound className="h-5 w-5 text-teal-500" />
                  Roles & Access Control
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm">New Admin Address</Label>
                    <Input placeholder="0x..." value={newAdminAddr} onChange={(e) => setNewAdminAddr(e.target.value)} />
                    <Button className="mt-2" disabled={!isAdmin || isPending || !newAdminAddr}
                      onClick={() => tx('grantRole', [adminRole, newAdminAddr as `0x${string}`])}
                    >Grant DEFAULT_ADMIN_ROLE</Button>
                  </div>
                  <div>
                    <Label className="text-sm">Oracle Verifier Address</Label>
                    <Input placeholder="0x..." value={newOracleAddr} onChange={(e) => setNewOracleAddr(e.target.value)} />
                    <Button className="mt-2" disabled={!isAdmin || isPending || !newOracleAddr}
                      onClick={() => tx('grantOracleVerifierRole', [newOracleAddr as `0x${string}`])}
                    >Grant ORACLE_VERIFIER_ROLE</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract Controls */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {paused ? <Play className="h-5 w-5 text-teal-500" /> : <Pause className="h-5 w-5 text-teal-500" />}
                  Contract Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <Button variant="outline" disabled={!isAdmin || isPending || paused} onClick={() => tx('pause')}>Pause</Button>
                  <Button disabled={!isAdmin || isPending || !paused} onClick={() => tx('unpause')}>Unpause</Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  )
}