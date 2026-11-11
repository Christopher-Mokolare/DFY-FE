import { createHmac } from 'node:crypto'
import type { APIRequestContext } from '@playwright/test'

function decodeBase32(value: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, '')
  if (!normalized) throw new Error('TOTP secret is empty or is not a valid Base32 authenticator secret.')
  let bits = ''
  for (const char of normalized) {
    const index = alphabet.indexOf(char)
    if (index < 0) throw new Error('TOTP secret is not valid Base32.')
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

export function generateTotp(secret: string, now = Date.now()): string {
  const key = decodeBase32(secret)
  const counter = BigInt(Math.floor(now / 30_000))
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(counter)
  const digest = createHmac('sha1', key).update(message).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

export async function loginTestAccount(
  api: APIRequestContext,
  email: string,
  password: string,
  totpSecret: string | undefined,
  accountLabel = 'test',
) {
  const url = (process.env.DFY_API_URL || 'https://dfy-be-staging.onrender.com/api/v1').replace(/\/$/, '') + '/auth/login'
  const first = await api.post(url, { data: { email, password } })
  let body: any
  try { body = await first.json() } catch { body = { message: await first.text() } }

  if (body?.requiresTwoFactor === true || body?.data?.requiresTwoFactor === true) {
    if (!totpSecret?.trim()) {
      throw new Error(
        `${accountLabel} account requires authenticator 2FA, but its GitHub Actions secret is missing. Configure DFY_${accountLabel.toUpperCase()}_TOTP_SECRET with the original Base32 authenticator setup key (not a six-digit code).`,
      )
    }
    const secondFactorCode = generateTotp(totpSecret)
    const second = await api.post(url, { data: { email, password, secondFactorCode } })
    let secondBody: any
    try { secondBody = await second.json() } catch { secondBody = { message: await second.text() } }
    if (!second.ok() || secondBody?.success === false || !(secondBody?.token || secondBody?.data?.token)) {
      throw new Error(`${accountLabel} authenticator verification failed: HTTP ${second.status()} ${JSON.stringify(secondBody)}. Check that the Base32 secret matches this staging account and the runner clock is synchronized.`)
    }
    return secondBody
  }

  if (!first.ok() || body?.success === false || !(body?.token || body?.data?.token)) {
    throw new Error(`${accountLabel} login failed: HTTP ${first.status()} ${JSON.stringify(body)}`)
  }
  return body
}
