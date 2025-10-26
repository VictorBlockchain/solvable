"use client"

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { KeyRound, Copy } from 'lucide-react'
import { keccak256, toHex } from 'viem'

export default function HashPage() {
  const [solution, setSolution] = useState('')
  const [copied, setCopied] = useState(false)

  const hash = useMemo(() => {
    try {
      // Normalize by removing all whitespace before hashing
      const normalized = solution.replace(/\s+/g, '')
      const hex = toHex(normalized)
      return keccak256(hex)
    } catch {
      return '0x'
    }
  }, [solution])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <KeyRound className="h-6 w-6 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">Solution Hashing</h1>
          </div>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Compute `keccak256(abi.encodePacked(solution))`</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                Spaces are removed before hashing to standardize answers. The hash is
                <span className="font-mono"> keccak256</span> over the UTF-8 bytes of your normalized solution.
              </p>

              <div className="space-y-2">
                <label className="text-sm text-gray-600">Solution String</label>
                <Input
                  placeholder="e.g. 4 2"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">We remove whitespace characters before hashing.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-600">Solution Hash (bytes32)</label>
                <div className="flex gap-2">
                  <Input value={hash} readOnly className="font-mono" />
                  <Button variant="outline" onClick={handleCopy} className="shrink-0">
                    <Copy className="h-4 w-4 mr-1" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                For riddles/other puzzles, submit the normalized answer. For math/oracle puzzles, the oracle verifies independently.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}