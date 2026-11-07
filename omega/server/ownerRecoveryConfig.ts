import { createHash, timingSafeEqual } from 'node:crypto'
import { AppError } from './errors.ts'

/** Exact staging admin retained by owner approval — never taken from the client. */
export const STAGING_OWNER_ADMIN_ID = '85929a87-fd66-4633-aa97-c4bb6e8ea8de'

/** Email that bootstraps with STAGING_OWNER_ADMIN_ID so recovery targets the same row. */
export const STAGING_OWNER_ADMIN_EMAIL = 'wisdomreignsnow@gmail.com'

/** Id to use when creating the first admin for the staging owner email. */
export function bootstrapAdminIdForEmail(email: string): string {
  return email.trim().toLowerCase() === STAGING_OWNER_ADMIN_EMAIL ? STAGING_OWNER_ADMIN_ID : crypto.randomUUID()
}

/** Internal settings row — not part of public Settings / getSettings mapping. */
export const OWNER_RECOVERY_SETTINGS_KEY = '__omega_owner_recovery'

export const RECOVERY_SECRET_MIN_LEN = 24
export const RECOVERY_PASSWORD_MIN_LEN = 10
export const RECOVERY_PASSWORD_MAX_LEN = 128
export const RECOVERY_AUTHORIZATION_MAX_LEN = 256

/** Generic client error — no reason discrimination for attackers. */
export function recoveryUnavailable(): never {
  throw new AppError('Recovery unavailable.', 403, 'recovery_unavailable')
}

export type OwnerRecoveryEnv = {
  allowFlag: boolean
  previewOk: boolean
  secretConfigured: boolean
  secret: string | null
  expiresAtMs: number | null
  expired: boolean
}

/**
 * Fail-closed gates. Does not mint or read live secrets into logs.
 * Test harness may set OMEGA_OWNER_RECOVERY_TEST_MODE=1 only when VERCEL is unset.
 */
export function readOwnerRecoveryEnv(env: NodeJS.ProcessEnv = process.env): OwnerRecoveryEnv {
  const allowFlag = env.OMEGA_ALLOW_OWNER_RECOVERY === '1'
  const onVercel = Boolean(env.VERCEL)
  const vercelEnv = env.VERCEL_ENV ?? ''
  const testMode = env.OMEGA_OWNER_RECOVERY_TEST_MODE === '1' && !onVercel
  const previewOk = vercelEnv === 'preview' || testMode

  const secretRaw = env.OMEGA_OWNER_RECOVERY_SECRET
  const secret =
    typeof secretRaw === 'string' && secretRaw.length >= RECOVERY_SECRET_MIN_LEN ? secretRaw : null
  const secretConfigured = secret !== null

  const expRaw = env.OMEGA_OWNER_RECOVERY_EXPIRES_AT?.trim()
  let expiresAtMs: number | null = null
  let expired = true
  if (expRaw) {
    const ms = Date.parse(expRaw)
    if (Number.isFinite(ms)) {
      expiresAtMs = ms
      expired = Date.now() >= ms
    }
  }

  return { allowFlag, previewOk, secretConfigured, secret, expiresAtMs, expired }
}

export function assertOwnerRecoveryEnabled(env: NodeJS.ProcessEnv = process.env): string {
  const cfg = readOwnerRecoveryEnv(env)
  if (!cfg.allowFlag || !cfg.previewOk || !cfg.secretConfigured || cfg.expired || !cfg.secret) {
    recoveryUnavailable()
  }
  return cfg.secret
}

export function fingerprintRecoverySecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

/** Constant-time compare of presented authorization to configured secret. */
export function authorizationMatchesSecret(presented: string, secret: string): boolean {
  const a = createHash('sha256').update(presented, 'utf8').digest()
  const b = createHash('sha256').update(secret, 'utf8').digest()
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * CSRF / cross-origin guard for recovery POST.
 * Requires Origin (or Referer) matching this host or OMEGA_ALLOWED_ORIGINS.
 */
export function assertRecoveryRequestOrigin(input: {
  origin: string | undefined
  referer: string | undefined
  host: string | undefined
  forwardedHost: string | undefined
  forwardedProto: string | undefined
  allowedOrigins: string[]
}): void {
  const raw = input.origin || (input.referer ? tryOriginFromReferer(input.referer) : '')
  if (!raw) recoveryUnavailable()

  let originUrl: URL
  try {
    originUrl = new URL(raw)
  } catch {
    recoveryUnavailable()
  }

  if (input.allowedOrigins.includes(originUrl.origin)) return

  const host = (input.forwardedHost || input.host || '').split(',')[0]?.trim()
  if (!host) recoveryUnavailable()
  // Prefer explicit forwarded proto; otherwise match the Origin scheme (local http vs preview https).
  const proto =
    (input.forwardedProto || originUrl.protocol.replace(':', '') || 'https').split(',')[0]?.trim() || 'https'
  const expected = `${proto}://${host}`
  if (originUrl.origin !== expected) recoveryUnavailable()
}

function tryOriginFromReferer(referer: string): string {
  try {
    return new URL(referer).origin
  } catch {
    return ''
  }
}
