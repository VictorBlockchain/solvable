'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, Zap, Wallet } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'

interface SubmitSolutionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitSolution: (solution: string) => void
  submissionFee: number
  puzzleTitle: string
  gameId: string
}

export function SubmitSolutionModal({ 
  open, 
  onOpenChange, 
  onSubmitSolution, 
  submissionFee,
  puzzleTitle,
  gameId
}: SubmitSolutionModalProps) {
  const [solution, setSolution] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isConnected, address } = useAccount()
  const web3Modal = useWeb3Modal()

  const handleSubmit = async () => {
    if (!solution.trim()) return
    // Require wallet connection before submission
    if (!isConnected) {
      await web3Modal.open()
      return
    }
    try {
      setIsSubmitting(true)
      // Normalize by removing whitespace before submission
      const normalized = solution.replace(/\s+/g, '')
      const res = await fetch('/api/x402/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, solution: normalized })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit')

      onSubmitSolution(normalized)
      setSolution('')
      onOpenChange(false)
    } catch (e) {
      console.error('Submit failed', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-teal-500" />
            Submit Solution
          </DialogTitle>
          <DialogDescription>
            Submit your solution for "{puzzleTitle}" via the x402 protocol
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Submission Fee Info */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-900">Submission Fee</p>
                <p className="text-2xl font-bold text-teal-600 font-mono">{submissionFee} SEI</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-teal-700">This fee will be added to the prize pool</p>
                <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-teal-300 mt-1">
                  x402 Protocol
                </Badge>
              </div>
            </div>
          </div>

          {/* Wallet Connection Requirement */}
          {!isConnected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-900 text-sm">
                  <Wallet className="h-4 w-4" />
                  Connect your wallet to submit a solution.
                </div>
                <Button 
                  onClick={() => web3Modal.open()} 
                  variant="outline" 
                  className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                >
                  Connect Wallet
                </Button>
              </div>
            </div>
          )}

          {/* Solution Input */}
          <div className="grid gap-2">
            <Label htmlFor="solution">Your Solution</Label>
            <Textarea
              id="solution"
              placeholder="Enter your solution; whitespace will be removed before submission"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              We normalize by removing spaces and other whitespace before submitting.
            </p>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-gray-500">
              Supported formats: .txt, .pdf, .py, .js, .md (Max 10MB)
            </p>
            <Button variant="outline" size="sm" className="mt-2">
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>

          {/* Transaction Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-medium text-orange-900">Transaction Details</p>
            </div>
            <div className="space-y-1 text-xs text-orange-700 font-mono">
              <p>Protocol: x402 Standard</p>
              <p>Network: SEI Blockchain</p>
              <p>Gas Estimation: ~0.001 SEI</p>
              <p>Smart Contract: Solvable</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!solution.trim() || isSubmitting}
            className="bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {isConnected ? 'Submit Solution' : 'Connect Wallet to Submit'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}