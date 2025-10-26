import { NextResponse } from 'next/server'
import { getDefaultEntryFee } from '@/lib/onchain'

export async function GET() {
  try {
    const defaultFee = await getDefaultEntryFee()
    return NextResponse.json({ defaultFee: defaultFee.toString() }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to get default fee' }, { status: 500 })
  }
}