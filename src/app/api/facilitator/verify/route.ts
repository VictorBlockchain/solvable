import { NextRequest, NextResponse } from 'next/server'
import { getFacilitator } from '@/lib/facilitator'

export async function POST(req: NextRequest) {
  try {
    const { paymentPayload, paymentRequirements } = await req.json()
    if (!paymentPayload || !paymentRequirements) {
      return NextResponse.json({ error: 'Missing paymentPayload or paymentRequirements' }, { status: 400 })
    }
    const facilitator = getFacilitator()
    const result = await facilitator.verifyPayment(paymentPayload, paymentRequirements)
    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}