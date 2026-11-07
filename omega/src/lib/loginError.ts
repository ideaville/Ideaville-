import { copy } from './copy.ts'

/** Map API/network failures to login UI copy without claiming wrong password for non-401. */
export function messageForLoginFailure(err: unknown): string {
  const status =
    err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 0
  const code =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
      ? (err as { code: string }).code
      : ''

  if (status === 401 || code === 'unauthorized') return copy.signInError
  return copy.signInFailed
}
