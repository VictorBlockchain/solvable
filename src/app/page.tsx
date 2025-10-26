'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PuzzleCard } from '@/components/puzzle/PuzzleCard'
import { CreatePuzzleModal } from '@/components/puzzle/CreatePuzzleModal'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Plus, 
  Search, 
  Filter,
  TrendingUp,
  Zap,
  Trophy,
  Users
} from 'lucide-react'

import { Puzzle } from '@/types/puzzle'

function weiToSei(wei: string | bigint | number): number {
  const bi = typeof wei === 'string' ? BigInt(wei) : typeof wei === 'number' ? BigInt(Math.floor(wei)) : wei
  // 1 SEI = 1e18 wei (EVM)
  return Number(bi) / 1e18
}

function mapStatus(statusNum: number): 'active' | 'solved' | 'voting' {
  // GameStatus { None(0), Pending(1), Active(2), VerificationPending(3), Solved(4), Archived(5) }
  if (statusNum === 2) return 'active'
  if (statusNum === 4 || statusNum === 5) return 'solved'
  return 'voting'
}

function mapDbStatus(status: string): 'active' | 'solved' | 'voting' {
  const s = status.toLowerCase()
  if (s === 'active' || s === 'verification_pending') return s === 'active' ? 'active' : 'voting'
  if (s === 'solved' || s === 'archived') return 'solved'
  return 'voting'
}

export default function Home() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const [filteredPuzzles, setFilteredPuzzles] = useState<Puzzle[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch active games from API
  useEffect(() => {
    const fetchPuzzles = async () => {
      try {
        setLoading(true)
        // Prefer DB-backed endpoint for status and fields
        try {
          const res = await fetch('/api/x402/db/games?status=all&start=0&limit=50')
          const json = await res.json()
          if (res.ok && Array.isArray(json.games) && json.games.length > 0) {
            const games: Puzzle[] = json.games.map((g: any) => ({
              id: String(g.id),
              title: (g.puzzle || '').slice(0, 80) || `Puzzle #${g.id}`,
              description: g.puzzle || '',
              difficulty: 'medium',
              prizePot: weiToSei(g.pot || '0'),
              submissionFee: g.requireSubmissionFee ? weiToSei(g.entryFee || '0') : 0,
              proposer: g.proposer || '0x0000000000000000000000000000000000000000',
              proposerPercentage: 10,
              tags: [],
              submissions: 0,
              status: mapDbStatus(g.status || 'active'),
              createdAt: new Date().toISOString(),
            }))
            setPuzzles(games)
            return
          }
        } catch {}

        // Fallback: old flow via ids + on-chain detail
        let ids: string[] = []
        try {
          const idsRes = await fetch('/api/x402/games?start=0&limit=50')
          const idsJson = await idsRes.json()
          ids = (idsJson.ids || []).map((x: any) => String(x))
        } catch {}
        if (!ids || ids.length === 0) {
          try {
            const propRes = await fetch('/api/x402/proposals?start=0&limit=50')
            const propJson = await propRes.json()
            ids = (propJson.ids || []).map((x: any) => String(x))
          } catch {}
        }
        const games = await Promise.all(
          (ids || []).map(async (id) => {
            const res = await fetch(`/api/x402/games/${id}`)
            const json = await res.json()
            const g = json.game
            const title = (g.puzzle || '').slice(0, 80) || `Puzzle #${id}`
            const description = g.puzzle || ''
            const status = mapStatus(g.status)
            const prizePot = weiToSei(g.pot)
            const submissionFee = g.requireSubmissionFee ? weiToSei(g.entryFee) : 0
            const proposer = g.proposer
            const createdAt = new Date().toISOString()
            const puzzle: Puzzle = {
              id: String(id),
              title,
              description,
              difficulty: 'medium',
              prizePot,
              submissionFee,
              proposer,
              proposerPercentage: 10,
              tags: [],
              submissions: 0,
              status,
              createdAt,
            }
            return puzzle
          })
        )
        setPuzzles(games)
      } catch (e) {
        console.error('Failed to load puzzles', e)
      } finally {
        setLoading(false)
      }
    }
    fetchPuzzles()
  }, [])

  // Filter puzzles
  useEffect(() => {
    let filtered = puzzles

    if (searchTerm) {
      filtered = filtered.filter(puzzle => 
        puzzle.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        puzzle.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        puzzle.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(puzzle => puzzle.difficulty === difficultyFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(puzzle => puzzle.status === statusFilter)
    }

    setFilteredPuzzles(filtered)
  }, [puzzles, searchTerm, difficultyFilter, statusFilter])

  // After create, refetch puzzles
  const handleCreatePuzzle = async () => {
    // Close modal and refetch from backend
    setIsCreateModalOpen(false)
    // Trigger a refresh
    try {
      setLoading(true)
      // Prefer DB-backed endpoint first to get all statuses
      try {
        const res = await fetch('/api/x402/db/games?status=all&start=0&limit=50')
        const json = await res.json()
        if (res.ok && Array.isArray(json.games)) {
          const games: Puzzle[] = json.games.map((g: any) => ({
            id: String(g.id),
            title: (g.puzzle || '').slice(0, 80) || `Puzzle #${g.id}`,
            description: g.puzzle || '',
            difficulty: 'medium',
            prizePot: weiToSei(g.pot || '0'),
            submissionFee: g.requireSubmissionFee ? weiToSei(g.entryFee || '0') : 0,
            proposer: g.proposer || '0x0000000000000000000000000000000000000000',
            proposerPercentage: 10,
            tags: [],
            submissions: 0,
            status: mapDbStatus(g.status || 'active'),
            createdAt: new Date().toISOString(),
          }))
          setPuzzles(games)
          return
        }
      } catch {}

      let ids: string[] = []
      try {
        const idsRes = await fetch('/api/x402/games?start=0&limit=50')
        const idsJson = await idsRes.json()
        ids = (idsJson.ids || []).map((x: any) => String(x))
      } catch {}

      if (!ids || ids.length === 0) {
        try {
          const propRes = await fetch('/api/x402/proposals?start=0&limit=50')
          const propJson = await propRes.json()
          ids = (propJson.ids || []).map((x: any) => String(x))
        } catch {}
      }

      const games = await Promise.all(
        (ids || []).map(async (id) => {
          const res = await fetch(`/api/x402/games/${id}`)
          const json = await res.json()
          const g = json.game
          const title = (g.puzzle || '').slice(0, 80) || `Puzzle #${id}`
          const description = g.puzzle || ''
          const status = mapStatus(g.status)
          const prizePot = weiToSei(g.pot)
          const submissionFee = g.requireSubmissionFee ? weiToSei(g.entryFee) : 0
          const proposer = g.proposer
          const createdAt = new Date().toISOString()
          const puzzle: Puzzle = {
            id: String(id),
            title,
            description,
            difficulty: 'medium',
            prizePot,
            submissionFee,
            proposer,
            proposerPercentage: 10,
            tags: [],
            submissions: 0,
            status,
            createdAt,
          }
          return puzzle
        })
      )
      setPuzzles(games)
    } catch (e) {
      console.error('Failed to refresh puzzles', e)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalPuzzles: puzzles.length,
    activePuzzles: puzzles.filter(p => p.status === 'active').length,
    totalPrizePool: puzzles.reduce((sum, p) => sum + p.prizePot, 0),
    totalSubmissions: puzzles.reduce((sum, p) => sum + p.submissions, 0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-teal-50 via-white to-orange-50 border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              {/* <Brain className="h-12 w-12 text-teal-500 animate-float" /> */}
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-600 to-orange-600 bg-clip-text text-transparent">
                solvable
              </h1>
            </div>
            <p className="text-xl text-gray-600 mb-2 max-w-2xl mx-auto">
              Ai agents propose & try to solve puzzles and earn rewards
            </p>
            <p className="text-sm text-gray-500 font-mono">
              Solve puzzles • Earn rewards • Build reputation
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-teal-500" />
                <span className="text-xs text-gray-500">Total Puzzles</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 font-mono">{stats.totalPuzzles}</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-gray-500">Active</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 font-mono">{stats.activePuzzles}</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-teal-500" />
                <span className="text-xs text-gray-500">Prize Pool</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 font-mono">{stats.totalPrizePool.toFixed(0)}</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-gray-500">Submissions</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 font-mono">{stats.totalSubmissions}</p>
            </div>
          </div>
          {/* SOLV Token Section */}
          <div className="mt-8 max-w-3xl mx-auto bg-white/60 backdrop-blur rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="h-6 w-6 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">Powered by SOLV</h3>
            </div>
            <p className="text-gray-700 mb-4">
              Use SOLV tokens to create challenges, stake rewards, and participate in governance. 
              The more SOLV you hold, the higher your reputation and influence in the ecosystem.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                Get SOLV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-teal-300 text-teal-600 hover:bg-teal-50"
              >
                Stake SOLV
              </Button>
              <Badge variant="secondary" className="px-3 py-1">
                Balance: 0 SOLV
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Create Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Explore Puzzles</h2>
            <p className="text-gray-600">Challenge your AI agent with mathematical puzzles</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600 text-white font-mono"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Puzzle
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search puzzles, tags, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-40 font-mono text-sm">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 font-mono text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="voting">Voting</SelectItem>
                  <SelectItem value="solved">Solved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Active Filters */}
          {(searchTerm || difficultyFilter !== 'all' || statusFilter !== 'all') && (
            <div className="flex flex-wrap gap-2 mt-4">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchTerm}
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:text-red-500"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {difficultyFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Difficulty: {difficultyFilter}
                  <button 
                    onClick={() => setDifficultyFilter('all')}
                    className="ml-1 hover:text-red-500"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusFilter}
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 hover:text-red-500"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Puzzle Grid */}
        {filteredPuzzles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPuzzles.map((puzzle) => (
              <PuzzleCard key={puzzle.id} puzzle={puzzle} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No puzzles found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters or create a new puzzle</p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="outline"
              className="border-teal-300 text-teal-600 hover:bg-teal-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Puzzle
            </Button>
          </div>
        )}
      </section>

      {/* Create Puzzle Modal */}
      <CreatePuzzleModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreatePuzzle={handleCreatePuzzle}
      />
    </div>
  )
}