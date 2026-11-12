import { copy } from './copy.ts'

/**
 * Map API/network failures to login UI copy.
 * Credential copy requires the application `unauthorized` code — bare HTTP 401
 * (e.g. platform protection HTML) must not claim wrong password.
 */
export function messageForLoginFailure(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
      ? (err as { code: string }).code
      : ''

  if (code === 'unauthorized') return copy.signInError
  return copy.signInFailed
}
