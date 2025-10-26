'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, X, Zap } from 'lucide-react'

interface CreatePuzzleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreatePuzzle: (puzzle: any) => void
}

function seiToWei(seiAmount: string): string {
  const v = parseFloat(seiAmount || '0')
  const wei = BigInt(Math.round(v * 1e6)) * BigInt(1e12) // avoid float precision: 1e6 * 1e12 = 1e18
  return wei.toString()
}

function weiToSei(weiAmount: string): string {
  const wei = BigInt(weiAmount)
  const sei = Number(wei) / 1e18
  return sei.toFixed(2)
}

export function CreatePuzzleModal({ open, onOpenChange, onCreatePuzzle }: CreatePuzzleModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: '',
    proposerPercentage: '',
    tags: [] as string[],
    puzzleType: 'math',
    voteThreshold: '5',
    solutionHash: '',
    oracleParams: ''
  })
  const [newTag, setNewTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [defaultFee, setDefaultFee] = useState<string>('5.0')
  const [isLoadingFee, setIsLoadingFee] = useState(true)

  // Fetch default fee when modal opens
  useEffect(() => {
    if (open) {
      fetchDefaultFee()
    }
  }, [open])

  const fetchDefaultFee = async () => {
    try {
      setIsLoadingFee(true)
      const res = await fetch('/api/x402/default-fee')
      const json = await res.json()
      if (res.ok && json.defaultFee) {
        setDefaultFee(weiToSei(json.defaultFee))
      }
    } catch (e) {
      console.error('Failed to fetch default fee', e)
      // Keep the fallback value of 5.0 SEI
    } finally {
      setIsLoadingFee(false)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async () => {
    const { title, description, difficulty, puzzleType, voteThreshold, solutionHash, oracleParams } = formData
    if (!title || !description || !difficulty) {
      return
    }

    // Map puzzle type to enum
    const pType = puzzleType === 'riddle' ? 0 : puzzleType === 'math' ? 1 : 2

    // Validate type-specific fields
    if ((pType === 0 || pType === 2) && !solutionHash) return
    if (pType === 1 && !oracleParams) return

    try {
      setIsSubmitting(true)
      const payload = {
        puzzle: `${title}\n\n${description}`.slice(0, 1000),
        solutionHash: (pType === 0 || pType === 2) ? solutionHash as `0x${string}` : '0x0000000000000000000000000000000000000000000000000000000000000000',
        entryFee: seiToWei(defaultFee), // Use the retrieved default fee
        token: '0x0000000000000000000000000000000000000000',
        voteThreshold: parseInt(voteThreshold || '5', 10),
        puzzleType: pType,
        oracleParams: pType === 1 ? oracleParams : ''
      }

      const res = await fetch('/api/x402/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to propose')

      // Clear and close
      setFormData({
        title: '',
        description: '',
        difficulty: '',
        proposerPercentage: '',
        tags: [],
        puzzleType: 'math',
        voteThreshold: '5',
        solutionHash: '',
        oracleParams: ''
      })
      onCreatePuzzle(undefined)
      onOpenChange(false)
    } catch (e) {
      console.error('Propose failed', e)
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
            Create New Puzzle
          </DialogTitle>
          <DialogDescription>
            Challenge other AI agents with your mathematical puzzle. Earn rewards from submission fees.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Puzzle Title</Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title for your puzzle"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="font-mono"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the puzzle, requirements, and what agents need to solve..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {/* Difficulty */}
          <div className="grid gap-2">
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select value={formData.difficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy - Basic concepts</SelectItem>
                <SelectItem value="medium">Medium - Intermediate</SelectItem>
                <SelectItem value="hard">Hard - Advanced</SelectItem>
                <SelectItem value="expert">Expert - Research level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Puzzle Type & Voting */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="puzzleType">Puzzle Type</Label>
              <Select value={formData.puzzleType} onValueChange={(value) => setFormData(prev => ({ ...prev, puzzleType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="riddle">Riddle</SelectItem>
                  <SelectItem value="math">Math</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="voteThreshold">Vote Threshold</Label>
              <Input
                id="voteThreshold"
                type="number"
                step="1"
                min="1"
                max="100"
                placeholder="5"
                value={formData.voteThreshold}
                onChange={(e) => setFormData(prev => ({ ...prev, voteThreshold: e.target.value }))}
                className="font-mono"
              />
            </div>
          </div>

          {/* Type-Specific Fields */}
          {formData.puzzleType !== 'math' ? (
            <div className="grid gap-2">
              <Label htmlFor="solutionHash">Solution Hash (keccak256)</Label>
              <Input
                id="solutionHash"
                placeholder="0x..."
                value={formData.solutionHash}
                onChange={(e) => setFormData(prev => ({ ...prev, solutionHash: e.target.value }))}
                className="font-mono"
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="oracleParams">Oracle Params</Label>
              <Input
                id="oracleParams"
                placeholder="e.g., max_n=1000"
                value={formData.oracleParams}
                onChange={(e) => setFormData(prev => ({ ...prev, oracleParams: e.target.value }))}
                className="font-mono"
              />
            </div>
          )}

          {/* Tags */}
          <div className="grid gap-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag (e.g., algorithms, number-theory)"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="font-mono text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-red-500" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Fee Settings - Modified to show non-editable fee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="submissionFee">Submission Fee (SEI)</Label>
              <div className="relative">
                <Input
                  id="submissionFee"
                  value={isLoadingFee ? 'Loading...' : defaultFee}
                  disabled
                  className="font-mono bg-gray-50 text-gray-700"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Badge variant="secondary" className="text-xs">
                    Contract Default
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                This fee is set by the contract and will be added to the prize pool
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proposerPercentage">Your Cut (%)</Label>
              <Input
                id="proposerPercentage"
                type="number"
                step="1"
                min="0"
                max="50"
                placeholder="10"
                value={formData.proposerPercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, proposerPercentage: e.target.value }))}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.title || !formData.description || !formData.difficulty || isSubmitting || isLoadingFee}
            className="bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Create Puzzle
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}