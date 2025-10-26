'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { VotingPanel } from '@/components/puzzle/VotingPanel'
import { SubmitSolutionModal } from '@/components/puzzle/SubmitSolutionModal'
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Trophy, 
  Zap,
  Brain,
  Hash,
  Calendar,
  DollarSign,
  CheckCircle
} from 'lucide-react'
import { Puzzle, Submission } from '@/types/puzzle'

function weiToSei(wei: string | number | bigint): number {
  const b = typeof wei === 'bigint' ? wei : BigInt(wei as any)
  return Number(b) / 1e18
}

function mapStatus(s: number): 'active' | 'voting' | 'solved' {
  switch (s) {
    case 1: return 'active' // Active
    case 2: return 'voting' // VerificationPending -> treat as voting
    case 3: return 'solved'
    case 4: return 'solved' // Archived -> show as solved
    default: return 'voting' // Pending
  }
}

export default function PuzzleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const puzzleId = params.id as string

  const [puzzle, setPuzzle] = useState<Puzzle | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [submissions, setSubmissions] = useState<Submission[]>([])

  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/x402/games/${puzzleId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load game')
        const g = json.game || json // support either shape
        const puzzleText: string = g.puzzle || ''
        const [firstLine, ...rest] = puzzleText.split('\n')
        const title = firstLine || `Puzzle ${puzzleId}`
        const description = rest.join('\n').trim()
        const mapped: Puzzle = {
          id: puzzleId,
          title,
          description,
          difficulty: 'medium',
          prizePot: weiToSei(g.pot || g.prizePot || 0),
          submissionFee: weiToSei(g.entryFee || 0),
          proposer: g.proposer || '0x0000000000000000000000000000000000000000',
          tags: [],
          submissions: submissions.length,
          status: mapStatus(g.status || 0),
          createdAt: new Date().toISOString(),
          votingDeadline: g.verificationDeadline ? new Date(Number(g.verificationDeadline) * 1000).toISOString() : undefined,
          proposerPercentage: 10
        }
        setPuzzle(mapped)
        setError(null)
      } catch (e: any) {
        console.error('Failed to fetch game', e)
        setError(e.message || 'Error loading game')
      } finally {
        setLoading(false)
      }
    }
    fetchGame()
  }, [puzzleId])

  const handleSubmitSolution = (solution: string) => {
    const newSubmission: Submission = {
      id: (submissions.length + 1).toString(),
      puzzleId: puzzleId,
      submitter: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45',
      solution,
      timestamp: new Date().toISOString(),
      votes: 0
    }
    setSubmissions([...submissions, newSubmission])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Puzzle</h2>
          <p className="text-gray-600 mb-4">Fetching on-chain state for game {puzzleId}...</p>
        </div>
      </div>
    )
  }

  if (error || !puzzle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Puzzle Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The puzzle you're looking for doesn't exist."}</p>
          <Button onClick={() => router.push('/')} className="bg-teal-500 hover:bg-teal-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Puzzles
          </Button>
        </div>
      </div>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-50 text-green-700 border-green-200'
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'hard': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'expert': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-teal-50 text-teal-700 border-teal-200'
      case 'voting': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'solved': return 'bg-green-50 text-green-700 border-green-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-teal-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Puzzles
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={getDifficultyColor(puzzle.difficulty)}>
                {puzzle.difficulty.toUpperCase()}
              </Badge>
              <Badge variant="secondary" className={getStatusColor(puzzle.status)}>
                {puzzle.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title and Description */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{puzzle.title}</h1>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  {puzzle.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {puzzle.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="bg-gray-50 border-gray-200"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Trophy className="h-6 w-6 text-teal-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 font-mono">
                      {puzzle.prizePot.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">SEI Prize Pool</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarSign className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 font-mono">
                      {puzzle.submissionFee}
                    </p>
                    <p className="text-xs text-gray-500">Submission Fee</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Brain className="h-6 w-6 text-teal-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 font-mono">
                      {puzzle.submissions}
                    </p>
                    <p className="text-xs text-gray-500">Submissions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <User className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                    <p className="text-lg font-bold text-gray-900 font-mono">
                      {puzzle.proposer.slice(0, 6)}...{puzzle.proposer.slice(-4)}
                    </p>
                    <p className="text-xs text-gray-500">Proposer</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions ({submissions.length})</TabsTrigger>
                  <TabsTrigger value="voting">Voting</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5 text-teal-500" />
                        Puzzle Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Created</p>
                          <p className="font-mono text-sm">
                            {new Date(puzzle.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Proposer Cut</p>
                          <p className="font-mono text-sm">{puzzle.proposerPercentage}%</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Smart Contract Details</p>
                        <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-1">
                          <p><span className="text-gray-600">Contract:</span> GoBit.sol</p>
                          <p><span className="text-gray-600">Network:</span> SEI</p>
                          <p><span className="text-gray-600">Protocol:</span> x402 Standard</p>
                          <p><span className="text-gray-600">Gas Limit:</span> 100,000</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="submissions" className="space-y-4">
                  {submissions.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
                        <p className="text-gray-600 mb-4">Be the first to submit a solution!</p>
                        <Button
                          onClick={() => setIsSubmitModalOpen(true)}
                          className="bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Submit Solution
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {submissions.map((submission) => (
                        <Card key={submission.id}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-mono text-sm">
                                  {submission.submitter.slice(0, 6)}...{submission.submitter.slice(-4)}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {submission.votes} votes
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(submission.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {submission.solution}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="voting">
                  {puzzle.status === 'voting' ? (
                    <VotingPanel
                      gameId={puzzleId}
                      votingDeadline={puzzle.votingDeadline || ''}
                      hasVoted={hasVoted}
                      onVoted={() => setHasVoted(true)}
                    />
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Voting Not Active</h3>
                        <p className="text-gray-600">
                          {puzzle.status === 'active' 
                            ? 'Voting will begin once submissions are received.'
                            : 'This puzzle has been solved.'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Submit Solution Card */}
              <Card className="border-teal-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-teal-700">
                    <Zap className="h-5 w-5" />
                    Submit Solution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Submit your solution via the x402 protocol to compete for the prize pool.
                  </div>
                  
                  <div className="bg-teal-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-teal-700">Submission Fee</span>
                      <span className="font-bold text-teal-900 font-mono">{puzzle.submissionFee} SEI</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-teal-700">Current Prize</span>
                      <span className="font-bold text-teal-900 font-mono">{puzzle.prizePot.toFixed(1)} SEI</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsSubmitModalOpen(true)}
                    disabled={puzzle.status !== 'active'}
                    className="w-full bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600"
                  >
                    {puzzle.status === 'active' ? (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Submit Solution
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {puzzle.status === 'solved' ? 'Puzzle Solved' : 'Voting Active'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Proposer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Proposer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-mono text-sm">
                        {puzzle.proposer.slice(0, 8)}...{puzzle.proposer.slice(-6)}
                      </p>
                      <p className="text-xs text-gray-500">Puzzle Creator</p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    <p>Earns {puzzle.proposerPercentage}% of all submission fees</p>
                    <p className="mt-1">Total earned: {(submissions.length * puzzle.submissionFee * puzzle.proposerPercentage / 100).toFixed(2)} SEI</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Solution Modal */}
      <SubmitSolutionModal
        open={isSubmitModalOpen}
        onOpenChange={setIsSubmitModalOpen}
        onSubmitSolution={handleSubmitSolution}
        submissionFee={puzzle.submissionFee}
        puzzleTitle={puzzle.title}
        gameId={puzzleId}
      />
    </div>
  )
}