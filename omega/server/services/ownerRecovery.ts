import { hashPassword, nowIso } from '../crypto.ts'
import { badRequest } from '../errors.ts'
import {
  RECOVERY_AUTHORIZATION_MAX_LEN,
  RECOVERY_PASSWORD_MAX_LEN,
  RECOVERY_PASSWORD_MIN_LEN,
  STAGING_OWNER_ADMIN_ID,
  assertOwnerRecoveryEnabled,
  assertRecoveryRequestOrigin,
  authorizationMatchesSecret,
  fingerprintRecoverySecret,
  recoveryUnavailable,
} from '../ownerRecoveryConfig.ts'
import type { OmegaStore } from '../store/types.ts'

const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX = 10
const rateByKey = new Map<string, { count: number; resetAt: number }>()

export function resetOwnerRecoveryRateLimitForTests() {
  rateByKey.clear()
}

function hitRateLimit(key: string): boolean {
  const now = Date.now()
  const cur = rateByKey.get(key)
  if (!cur || now >= cur.resetAt) {
    rateByKey.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  cur.count += 1
  if (cur.count > RATE_MAX) return true
  return false
}

export type OwnerRecoveryRequestMeta = {
  origin: string | undefined
  referer: string | undefined
  host: string | undefined
  forwardedHost: string | undefined
  forwardedProto: string | undefined
  clientKey: string
  allowedOrigins: string[]
  env?: NodeJS.ProcessEnv
}

/**
 * Owner recovery: fixed admin id only; password from HTTPS form body; authorization from form.
 * Never logs authorization/password/hash. Does not auto-login.
 */
export async function executeOwnerPasswordRecovery(
  store: OmegaStore,
  body: { authorization?: string; password?: string; password_confirm?: string },
  meta: OwnerRecoveryRequestMeta,
): Promise<{ ok: true }> {
  assertRecoveryRequestOrigin({
    origin: meta.origin,
    referer: meta.referer,
    host: meta.host,
    forwardedHost: meta.forwardedHost,
    forwardedProto: meta.forwardedProto,
    allowedOrigins: meta.allowedOrigins,
  })

  if (hitRateLimit(meta.clientKey)) recoveryUnavailable()

  const env = meta.env ?? process.env
  const secret = assertOwnerRecoveryEnabled(env)
  // Staging/preview must use Postgres — never memory fallback when not in local test mode.
  if (store.kind !== 'postgres' && env.OMEGA_OWNER_RECOVERY_TEST_MODE !== '1') {
    recoveryUnavailable()
  }

  if (!body || typeof body !== 'object') throw badRequest('Invalid recovery request')

  const authorization = typeof body.authorization === 'string' ? body.authorization : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const passwordConfirm = typeof body.password_confirm === 'string' ? body.password_confirm : ''

  if (!authorization || !password || !passwordConfirm) throw badRequest('Invalid recovery request')
  if (authorization.length > RECOVERY_AUTHORIZATION_MAX_LEN) throw badRequest('Invalid recovery request')
  if (password.length < RECOVERY_PASSWORD_MIN_LEN || password.length > RECOVERY_PASSWORD_MAX_LEN) {
    throw badRequest('Invalid recovery request')
  }
  if (password !== passwordConfirm) throw badRequest('Invalid recovery request')

  if (!authorizationMatchesSecret(authorization, secret)) recoveryUnavailable()

  const fingerprint = fingerprintRecoverySecret(secret)
  const passwordHash = await hashPassword(password)
  let result: { applied: boolean }
  try {
    result = await store.applyOwnerPasswordRecovery({
      adminId: STAGING_OWNER_ADMIN_ID,
      passwordHash,
      recoveryFingerprint: fingerprint,
      consumedAt: nowIso(),
    })
  } catch {
    // Missing admin / persistence issues → same generic client signal (no enumeration).
    recoveryUnavailable()
  }
  if (!result.applied) recoveryUnavailable()

  console.info('[omega] owner_recovery outcome=password_updated')
  return { ok: true }
}
