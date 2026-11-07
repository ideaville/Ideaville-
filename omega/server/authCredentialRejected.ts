import { AppError } from './errors.ts'

/** Internal-only discriminant; JSON still serializes as generic unauthorized. */
export type AuthCredentialRejectOutcome = 'lookup_rejected' | 'verification_rejected'

/**
 * Credential rejection that is indistinguishable to the client from other 401s
 * (same status, code, and message) while carrying a server-only outcome tag.
 */
export class AuthCredentialRejected extends AppError {
  readonly outcome: AuthCredentialRejectOutcome

  constructor(outcome: AuthCredentialRejectOutcome) {
    super('Invalid credentials', 401, 'unauthorized')
    this.name = 'AuthCredentialRejected'
    this.outcome = outcome
  }
}
