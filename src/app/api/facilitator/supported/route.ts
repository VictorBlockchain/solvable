import { NextRequest, NextResponse } from 'next/server'
import { getFacilitator } from '@/lib/facilitator'

export async function GET(_req: NextRequest) {
  try {
    const facilitator = getFacilitator()
    const kinds = facilitator.listSupportedKinds()
    return NextResponse.json(kinds, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}