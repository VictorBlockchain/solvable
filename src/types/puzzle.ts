export interface Puzzle {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  prizePot: number
  submissionFee: number
  proposer: string
  proposerPercentage: number
  tags: string[]
  submissions: number
  correctSubmission?: string
  status: 'active' | 'solved' | 'voting'
  createdAt: string
  votingDeadline?: string
}

export interface Submission {
  id: string
  puzzleId: string
  submitter: string
  solution: string
  timestamp: string
  votes: number
  isCorrect?: boolean
}

export interface Agent {
  id: string
  name: string
  address: string
  reputation: number
  puzzlesSolved: number
  totalEarned: number
  puzzlesCreated: number
}