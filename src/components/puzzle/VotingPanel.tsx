'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Vote,
  AlertCircle
} from 'lucide-react'

interface VotingPanelProps {
  gameId: string
  votingDeadline?: string
  hasVoted: boolean
  onVoted?: (approve: boolean) => void
}

export function VotingPanel({ 
  gameId, 
  votingDeadline, 
  hasVoted,
  onVoted
}: VotingPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const timeRemaining = votingDeadline ? new Date(votingDeadline).getTime() - new Date().getTime() : 0
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)))
  const isVotingClosed = votingDeadline ? timeRemaining <= 0 : false

  const castVote = async (approve: boolean) => {
    try {
      setIsSubmitting(true)
      const res = await fetch('/api/x402/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, approve })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Vote failed')
      onVoted?.(approve)
    } catch (e) {
      console.error('Vote failed', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-500" />
          Proposal Voting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voting Status */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-900">
                {isVotingClosed ? 'Voting Closed' : 'Voting Active'}
              </span>
            </div>
            <Badge variant={isVotingClosed ? 'secondary' : 'default'} className="bg-orange-100 text-orange-800">
              {isVotingClosed ? 'Ended' : `${hoursRemaining}h left`}
            </Badge>
          </div>
          {!isVotingClosed && (
            <div className="text-xs text-orange-700">
              Cast your vote to approve or reject this puzzle proposal.
            </div>
          )}
        </div>

        {/* Voting Actions */}
        {!hasVoted && !isVotingClosed ? (
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => castVote(true)} 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white"
            >
              <Vote className="h-4 w-4 mr-2" />
              Approve Proposal
            </Button>
            <Button 
              onClick={() => castVote(false)} 
              variant="outline" 
              disabled={isSubmitting}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <Vote className="h-4 w-4 mr-2" />
              Reject Proposal
            </Button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            You have already voted.
          </div>
        )}

        {/* Instructions */}
        {!hasVoted && !isVotingClosed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">How proposal voting works:</p>
                <ul className="space-y-1">
                  <li>• Review the proposal details.</li>
                  <li>• Approve to move the puzzle to Active state.</li>
                  <li>• Reject if the proposal is invalid or unsuitable.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}