import { createHmac } from 'node:crypto'
import type { APIRequestContext } from '@playwright/test'

type AuthSession = { token: string; user: any }

function decodeBase32(secret: string): Buffer {
  const normalized = secret.replace(/[\s=-]/g, '').toUpperCase()
  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) {
    throw new Error('The configured TOTP secret is not valid Base32.')
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bytes: number[] = []
  let buffer = 0
  let bitsLeft = 0
  for (const character of normalized) {
    const value = alphabet.indexOf(character)
    if (value < 0) throw new Error('The configured TOTP secret is not valid Base32.')
    buffer = (buffer << 5) | value
    bitsLeft += 5
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff)
      bitsLeft -= 8
    }
  }
  return Buffer.from(bytes)
}

export function generateTotp(secret: string, now = Date.now()): string {
  const key = decodeBase32(secret)
  const counter = BigInt(Math.floor(now / 1000 / 30))
  const counterBytes = Buffer.alloc(8)
  counterBytes.writeBigUInt64BE(counter)
  const digest = createHmac('sha1', key).update(counterBytes).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

export function getTotpSecretForEmail(email: string): string | undefined {
  const normalizedEmail = email.trim().toLowerCase()
  const accounts = [
    [process.env.DFY_RUNNER_EMAIL, process.env.DFY_RUNNER_TOTP_SECRET],
    [process.env.DFY_CREATOR_EMAIL, process.env.DFY_CREATOR_TOTP_SECRET],
    [process.env.DFY_ADMIN_EMAIL, process.env.DFY_ADMIN_TOTP_SECRET],
  ]
  const match = accounts.find(([accountEmail, secret]) =>
    !!accountEmail && !!secret && accountEmail.trim().toLowerCase() === normalizedEmail
  )
  return match?.[1]?.trim() || undefined
}

function totpSecretNameForEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase()
  if (process.env.DFY_RUNNER_EMAIL?.trim().toLowerCase() === normalizedEmail) return 'DFY_RUNNER_TOTP_SECRET'
  if (process.env.DFY_CREATOR_EMAIL?.trim().toLowerCase() === normalizedEmail) return 'DFY_CREATOR_TOTP_SECRET'
  if (process.env.DFY_ADMIN_EMAIL?.trim().toLowerCase() === normalizedEmail) return 'DFY_ADMIN_TOTP_SECRET'
  return 'the matching DFY_*_TOTP_SECRET'
}

/**
 * Authenticate against the real staging API. If the account has 2FA enabled,
 * generate a fresh RFC 6238 code from its GitHub Actions secret and complete
 * the same two-step login flow used by the application.
 */
export async function loginWithTotp(
  api: APIRequestContext,
  apiBaseUrl: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const postLogin = (secondFactorCode?: string) => api.post(`${apiBaseUrl.replace(/\/$/, '')}/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password, ...(secondFactorCode ? { secondFactorCode } : {}) },
  })

  let response = await postLogin()
  let body = await response.json()

  if (body?.requiresTwoFactor === true || body?.RequiresTwoFactor === true) {
    const secret = getTotpSecretForEmail(email)
    if (!secret) {
      throw new Error(
        `The staging account ${email} requires authenticator 2FA. Add the original Base32 enrollment key as GitHub Actions secret ${totpSecretNameForEmail(email)}; never use a rotating six-digit code as the secret.`
      )
    }
    // Generate immediately before the second request. The backend accepts the
    // current TOTP time step with its normal clock-skew window.
    response = await postLogin(generateTotp(secret))
    body = await response.json()
  }

  if (!response.ok() || body?.success === false) {
    throw new Error(`Login failed for configured staging account ${email}: HTTP ${response.status()} ${body?.message || body?.Message || 'authentication rejected'}`)
  }

  const token = body?.token ?? body?.data?.token
  const user = body?.user ?? body?.data?.user
  if (!token || !user) {
    throw new Error(`Staging login for ${email} did not return both a token and user profile.`)
  }

  return { token: String(token), user }
}
