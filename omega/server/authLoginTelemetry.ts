/**
 * Secret-free login outcome telemetry for operators.
 * Outcomes only; never emails, ids, bodies, passwords, cookies, tokens, hashes, or stacks.
 */

export const AUTH_LOGIN_OUTCOMES = [
  'lookup_rejected',
  'verification_rejected',
  'server_exception',
  'session_created',
] as const

export type AuthLoginOutcome = (typeof AUTH_LOGIN_OUTCOMES)[number]

/** Bounded generated request id: 32 lowercase hex chars (16 bytes). */
const RID_RE = /^[a-f0-9]{32}$/

export function newLoginRequestId(): string {
  const rid = crypto.randomUUID().replace(/-/g, '')
  if (!RID_RE.test(rid)) {
    throw new Error('login request id generation failed validation')
  }
  return rid
}

export function isValidLoginRequestId(value: unknown): value is string {
  return typeof value === 'string' && RID_RE.test(value)
}

export function isAuthLoginOutcome(value: unknown): value is AuthLoginOutcome {
  return typeof value === 'string' && (AUTH_LOGIN_OUTCOMES as readonly string[]).includes(value)
}

/**
 * Format a single log line. Rejects non-validated rid/outcome rather than interpolating
 * arbitrary header or caller-supplied strings.
 */
export function formatAuthLoginTelemetry(input: { rid: string; outcome: AuthLoginOutcome }): string {
  if (!isValidLoginRequestId(input.rid)) {
    throw new Error('refusing to emit auth_login telemetry with invalid rid')
  }
  if (!isAuthLoginOutcome(input.outcome)) {
    throw new Error('refusing to emit auth_login telemetry with invalid outcome')
  }
  return `[omega] auth_login rid=${input.rid} outcome=${input.outcome}`
}

export function logAuthLoginOutcome(input: { rid: string; outcome: AuthLoginOutcome }): void {
  console.info(formatAuthLoginTelemetry(input))
}
