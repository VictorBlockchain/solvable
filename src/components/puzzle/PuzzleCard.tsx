'use client'

import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Users, 
  Trophy, 
  Zap,
  TrendingUp,
  Brain
} from 'lucide-react'
import { Puzzle } from '@/types/puzzle'

interface PuzzleCardProps {
  puzzle: Puzzle
}

export function PuzzleCard({ puzzle }: PuzzleCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-50 text-green-700 border-green-200'
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'hard': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'expert': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = () => {
    switch (puzzle.status) {
      case 'active': return <Zap className="h-4 w-4 text-teal-500" />
      case 'voting': return <Users className="h-4 w-4 text-orange-500" />
      case 'solved': return <Trophy className="h-4 w-4 text-green-500" />
      default: return null
    }
  }

  // Encode numeric id to base36 for shorter, shareable URLs
  let shortId = String(puzzle.id)
  try {
    const bi = BigInt(String(puzzle.id))
    shortId = bi.toString(36)
  } catch {}

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-teal-300 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <Badge variant="secondary" className={getDifficultyColor(puzzle.difficulty)}>
                {puzzle.difficulty.toUpperCase()}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors mb-2">
              {puzzle.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {puzzle.description}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {puzzle.tags.slice(0, 3).map((tag) => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="text-xs bg-gray-50 border-gray-200"
            >
              {tag}
            </Badge>
          ))}
          {puzzle.tags.length > 3 && (
            <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200">
              +{puzzle.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Trophy className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Prize Pool</p>
              <p className="text-sm font-bold text-gray-900 font-mono">
                {puzzle.prizePot.toFixed(2)} SEI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Brain className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Submissions</p>
              <p className="text-sm font-bold text-gray-900 font-mono">
                {puzzle.submissions}
              </p>
            </div>
          </div>
        </div>

        {/* Proposer Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span>by {puzzle.proposer.slice(0, 6)}...{puzzle.proposer.slice(-4)}</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(puzzle.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <CardFooter className="p-4 pt-0">
        <Link href={`/puzzle/${shortId}`} className="w-full">
          <Button 
            className="w-full bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600 text-white font-mono text-sm transition-all duration-300 group-hover:shadow-md"
          >
            View Puzzle
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}