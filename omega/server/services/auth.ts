import { AuthCredentialRejected } from '../authCredentialRejected.ts'
import { forbidden, unauthorized } from '../errors.ts'
import { hashPassword, hashToken, issueSessionToken, newId, nowIso, verifyPassword } from '../crypto.ts'
import { bootstrapAdminIdForEmail } from '../ownerRecoveryConfig.ts'
import type { OmegaStore } from '../store/types.ts'
import type { AuthUser, Role } from '../types.ts'

const SESSION_DAYS = 14

export async function login(
  store: OmegaStore,
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const user = await store.findUserByEmail(email.trim())
  if (!user || !user.active) throw new AuthCredentialRejected('lookup_rejected')
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) throw new AuthCredentialRejected('verification_rejected')
  const token = issueSessionToken()
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  await store.createSession({
    id: newId(),
    user_id: user.id,
    token_hash: hashToken(token),
    expires_at: expires,
    created_at: nowIso(),
  })
  return {
    token,
    user: { id: user.id, email: user.email, role: user.role, distributor_id: user.distributor_id },
  }
}

export async function logout(store: OmegaStore, token: string | null) {
  if (!token) return
  const session = await store.findSessionByTokenHash(hashToken(token))
  if (session) await store.deleteSession(session.id)
}

export async function requireUser(store: OmegaStore, token: string | null): Promise<AuthUser> {
  if (!token) throw unauthorized()
  const session = await store.findSessionByTokenHash(hashToken(token))
  if (!session) throw unauthorized()
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    distributor_id: session.user.distributor_id,
  }
}

export async function requireRole(store: OmegaStore, token: string | null, role: Role): Promise<AuthUser> {
  const user = await requireUser(store, token)
  if (user.role !== role) throw forbidden()
  return user
}

export async function createAccount(
  store: OmegaStore,
  input: {
    email: string
    password: string
    role: Role
    distributor_id: string | null
    actor: AuthUser
  },
) {
  if (input.actor.role !== 'admin') throw forbidden('Only admin may create accounts')
  if (input.password.length < 10) throw unauthorized('Password too short') // use badRequest via caller
  const password_hash = await hashPassword(input.password)
  return store.createUser({
    id: newId(),
    email: input.email.trim().toLowerCase(),
    password_hash,
    role: input.role,
    distributor_id: input.distributor_id,
    active: true,
  })
}

/**
 * Creates the first admin only when both bootstrap env vars are set and no admin exists.
 * Password never logged. Role is app `admin` (scrypt session) — not Supabase Auth metadata.
 * Owner inspects distributor Network via Admin → Distributors / Referrals (no fabricated
 * distributor membership required).
 */
export async function maybeBootstrapAdmin(store: OmegaStore) {
  const email = process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD
  if (!email || !password) return null
  if (password.length < 10) return null
  const existing = await store.findUserByEmail(email)
  if (existing) return existing
  const users = await store.listUsers()
  if (users.some((u) => u.role === 'admin')) return null
  return store.createUser({
    // Align staging owner email with recovery’s fixed admin id (Bugbot: bootstrap newId mismatch).
    id: bootstrapAdminIdForEmail(email),
    email,
    password_hash: await hashPassword(password),
    role: 'admin',
    distributor_id: null,
    active: true,
  })
}
