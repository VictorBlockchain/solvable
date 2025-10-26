// Minimal stubs to satisfy @x402-sovereign/core imports during build
// NOTE: These are development placeholders. Replace with real x402 integration.

export type VerificationResult = {
  isValid: boolean
  payer?: string
}

export type SettlementResult = {
  success: boolean
  errorReason?: string
  transaction: string
  network: string
  payer?: string
}

export async function verify(
  client: any,
  paymentPayload: any,
  paymentRequirements: { network: string }
): Promise<VerificationResult> {
  // Basic sanity check: ensure network matches
  const ok = !!paymentRequirements?.network && !!client
  return {
    isValid: ok,
    payer: paymentPayload?.payer || undefined,
  }
}

export async function settle(
  signer: any,
  paymentPayload: any,
  paymentRequirements: { network: string }
): Promise<SettlementResult> {
  // Development placeholder: do not broadcast
  return {
    success: false,
    errorReason: 'Stubbed settle: not implemented',
    transaction: '',
    network: paymentRequirements?.network || 'unknown',
    payer: paymentPayload?.payer || undefined,
  }
}