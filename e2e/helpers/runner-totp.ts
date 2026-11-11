import { createHmac } from 'node:crypto'

let lastAcceptedStep = Math.floor(Date.now() / 30_000)

function decodeBase32(value: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = value.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase()
  let bits = 0
  let buffer = 0
  const bytes: number[] = []
  for (const character of clean) {
    const index = alphabet.indexOf(character)
    if (index < 0) throw new Error('DFY_RUNNER_TOTP_SECRET must be a valid Base32 authenticator secret.')
    buffer = (buffer << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((buffer >> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function codeForStep(secret: string, step: number): string {
  const key = decodeBase32(secret)
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const digest = createHmac('sha1', key).update(counter).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

/** Returns a non-replayed TOTP code for the serialized staging runner login flow. */
export async function runnerSecondFactorCode(): Promise<string> {
  const secret = process.env.DFY_RUNNER_TOTP_SECRET
  if (!secret) {
    throw new Error('DFY_RUNNER_TOTP_SECRET is required when the staging runner account has authenticator-based 2FA enabled.')
  }

  let currentStep = Math.floor(Date.now() / 30_000)
  while (currentStep < lastAcceptedStep) {
    const waitMs = (lastAcceptedStep - currentStep) * 30_000 + 250
    await new Promise(resolve => setTimeout(resolve, waitMs))
    currentStep = Math.floor(Date.now() / 30_000)
  }

  // Use the next time-step. The backend accepts the adjacent TOTP window and
  // records the matched counter, preventing reuse across sequential CI tests.
  const step = currentStep + 1
  lastAcceptedStep = step
  return codeForStep(secret, step)
}
