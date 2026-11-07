import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import { createApp } from './app.ts'
import { hashPassword, newId, verifyPassword } from './crypto.ts'
import {
  STAGING_OWNER_ADMIN_ID,
  fingerprintRecoverySecret,
  readOwnerRecoveryEnv,
} from './ownerRecoveryConfig.ts'
import { resetOwnerRecoveryRateLimitForTests } from './services/ownerRecovery.ts'
import { login } from './services/auth.ts'
import { getStore, resetStoreSingleton } from './store/index.ts'

const SECRET = 'owner-recovery-test-secret-xx'
const EXPIRES = new Date(Date.now() + 60 * 60 * 1000).toISOString()

function setRecoveryEnv() {
  process.env.OMEGA_ALLOW_MEMORY_STORE = '1'
  delete process.env.DATABASE_URL
  process.env.OMEGA_ALLOW_OWNER_RECOVERY = '1'
  process.env.OMEGA_OWNER_RECOVERY_TEST_MODE = '1'
  process.env.OMEGA_OWNER_RECOVERY_SECRET = SECRET
  process.env.OMEGA_OWNER_RECOVERY_EXPIRES_AT = EXPIRES
  delete process.env.VERCEL
  delete process.env.VERCEL_ENV
}

function clearRecoveryEnv() {
  delete process.env.OMEGA_ALLOW_OWNER_RECOVERY
  delete process.env.OMEGA_OWNER_RECOVERY_TEST_MODE
  delete process.env.OMEGA_OWNER_RECOVERY_SECRET
  delete process.env.OMEGA_OWNER_RECOVERY_EXPIRES_AT
  delete process.env.OMEGA_ALLOW_MEMORY_STORE
  resetStoreSingleton()
  resetOwnerRecoveryRateLimitForTests()
}

async function seedAdmin(password: string) {
  const store = await getStore()
  await store.createUser({
    id: STAGING_OWNER_ADMIN_ID,
    email: 'wisdomreignsnow@gmail.com',
    password_hash: await hashPassword(password),
    role: 'admin',
    distributor_id: null,
    active: true,
  })
  return store
}

async function postRecovery(
  app: ReturnType<typeof createApp>,
  body: unknown,
  headers: Record<string, string> = {},
) {
  const res = await app.request('http://127.0.0.1/api/auth/owner-recovery', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://127.0.0.1',
      host: '127.0.0.1',
      ...headers,
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, json }
}

describe('OMEGA owner recovery', () => {
  beforeEach(() => {
    resetStoreSingleton()
    resetOwnerRecoveryRateLimitForTests()
    setRecoveryEnv()
  })
  afterEach(() => {
    clearRecoveryEnv()
  })

  it('fail-closed when allow flag / preview / secret / expiry missing', () => {
    delete process.env.OMEGA_ALLOW_OWNER_RECOVERY
    assert.equal(readOwnerRecoveryEnv().allowFlag, false)
    process.env.OMEGA_ALLOW_OWNER_RECOVERY = '1'
    delete process.env.OMEGA_OWNER_RECOVERY_TEST_MODE
    process.env.VERCEL = '1'
    process.env.VERCEL_ENV = 'production'
    assert.equal(readOwnerRecoveryEnv().previewOk, false)
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    process.env.OMEGA_OWNER_RECOVERY_TEST_MODE = '1'
    delete process.env.OMEGA_OWNER_RECOVERY_SECRET
    assert.equal(readOwnerRecoveryEnv().secretConfigured, false)
    process.env.OMEGA_OWNER_RECOVERY_SECRET = SECRET
    process.env.OMEGA_OWNER_RECOVERY_EXPIRES_AT = new Date(Date.now() - 1000).toISOString()
    assert.equal(readOwnerRecoveryEnv().expired, true)
  })

  it('success updates only fixed admin hash, invalidates sessions, then normal login works', async () => {
    const store = await seedAdmin('OldPassword!!')
    await store.createSession({
      id: newId(),
      user_id: STAGING_OWNER_ADMIN_ID,
      token_hash: 'deadbeef',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
    })
    const app = createApp()
    const lines: string[] = []
    const prev = console.info
    console.info = (...a: unknown[]) => lines.push(a.map(String).join(' '))

    try {
      const res = await postRecovery(app, {
        authorization: SECRET,
        password: 'NewPassword!!',
        password_confirm: 'NewPassword!!',
      })
      assert.equal(res.status, 200)
      assert.deepEqual(res.json, { ok: true })
      assert.equal('password' in res.json, false)
      assert.equal('token' in res.json, false)
      assert.equal('authorization' in res.json, false)

      const user = await store.findUserById(STAGING_OWNER_ADMIN_ID)
      assert.ok(user)
      assert.equal(user.role, 'admin')
      assert.equal(user.distributor_id, null)
      assert.equal(user.email, 'wisdomreignsnow@gmail.com')
      assert.equal(await verifyPassword('NewPassword!!', user.password_hash), true)
      assert.equal(await verifyPassword('OldPassword!!', user.password_hash), false)

      const session = await store.findSessionByTokenHash('deadbeef')
      assert.equal(session, null)

      const loggedIn = await login(store, 'wisdomreignsnow@gmail.com', 'NewPassword!!')
      assert.equal(loggedIn.user.id, STAGING_OWNER_ADMIN_ID)

      for (const line of lines) {
        assert.equal(line.includes(SECRET), false)
        assert.equal(line.includes('NewPassword'), false)
        assert.equal(line.includes('scrypt$'), false)
      }
      assert.ok(lines.some((l) => l.includes('outcome=password_updated')))
    } finally {
      console.info = prev
    }
  })

  it('wrong authorization / replay / expiry / cross-origin / wrong env fail closed', async () => {
    await seedAdmin('OldPassword!!')
    const app = createApp()

    const wrong = await postRecovery(app, {
      authorization: 'totally-wrong-authorization-xx',
      password: 'NewPassword!!',
      password_confirm: 'NewPassword!!',
    })
    assert.equal(wrong.status, 403)
    assert.equal(wrong.json.code, 'recovery_unavailable')

    const ok = await postRecovery(app, {
      authorization: SECRET,
      password: 'NewPassword!!',
      password_confirm: 'NewPassword!!',
    })
    assert.equal(ok.status, 200)

    const replay = await postRecovery(app, {
      authorization: SECRET,
      password: 'AnotherPass!!',
      password_confirm: 'AnotherPass!!',
    })
    assert.equal(replay.status, 403)

    // Expiry
    resetStoreSingleton()
    setRecoveryEnv()
    await seedAdmin('OldPassword!!')
    process.env.OMEGA_OWNER_RECOVERY_EXPIRES_AT = new Date(Date.now() - 5000).toISOString()
    const expired = await postRecovery(createApp(), {
      authorization: SECRET,
      password: 'NewPassword!!',
      password_confirm: 'NewPassword!!',
    })
    assert.equal(expired.status, 403)

    // Cross-origin
    resetStoreSingleton()
    setRecoveryEnv()
    await seedAdmin('OldPassword!!')
    const xorigin = await postRecovery(
      createApp(),
      { authorization: SECRET, password: 'NewPassword!!', password_confirm: 'NewPassword!!' },
      { origin: 'https://evil.example' },
    )
    assert.equal(xorigin.status, 403)

    // Production env on Vercel
    resetStoreSingleton()
    setRecoveryEnv()
    await seedAdmin('OldPassword!!')
    process.env.VERCEL = '1'
    process.env.VERCEL_ENV = 'production'
    delete process.env.OMEGA_OWNER_RECOVERY_TEST_MODE
    const prod = await postRecovery(createApp(), {
      authorization: SECRET,
      password: 'NewPassword!!',
      password_confirm: 'NewPassword!!',
    })
    assert.equal(prod.status, 403)
  })

  it('malformed input and concurrent double-use: one success max; business fields preserved', async () => {
    const store = await seedAdmin('OldPassword!!')
    // Unrelated business-ish row
    await store.createDistributor({
      id: newId(),
      name: 'Kay',
      code: 'KAY-TEST',
      status: 'pending_terms',
      notes: '',
      sponsor_id: null,
      referral_code: 'KAY-TEST',
      created_at: new Date().toISOString(),
    })

    const app = createApp()
    const bad = await postRecovery(app, { authorization: SECRET, password: 'short', password_confirm: 'short' })
    assert.equal(bad.status, 400)

    const mismatch = await postRecovery(app, {
      authorization: SECRET,
      password: 'NewPassword!!',
      password_confirm: 'OtherPassword!!',
    })
    assert.equal(mismatch.status, 400)

    const empty = await postRecovery(app, null)
    assert.ok(empty.status === 400 || empty.status === 403)

    resetStoreSingleton()
    setRecoveryEnv()
    const store2 = await seedAdmin('OldPassword!!')
    await store2.createDistributor({
      id: newId(),
      name: 'Kay',
      code: 'KAY-TEST',
      status: 'pending_terms',
      notes: '',
      sponsor_id: null,
      referral_code: 'KAY-TEST',
      created_at: new Date().toISOString(),
    })
    const app2 = createApp()
    const body = {
      authorization: SECRET,
      password: 'NewPassword!!',
      password_confirm: 'NewPassword!!',
    }
    const [a, b] = await Promise.all([postRecovery(app2, body), postRecovery(app2, body)])
    const statuses = [a.status, b.status].sort()
    assert.deepEqual(statuses, [200, 403])

    const dists = await store2.listDistributors()
    assert.ok(dists.some((d) => d.code === 'KAY-TEST'))
    const owner = await store2.findUserById(STAGING_OWNER_ADMIN_ID)
    assert.equal(owner?.role, 'admin')
    assert.equal(owner?.distributor_id, null)
  })

  it('client cannot retarget another user id; fingerprint constant for secret', async () => {
    await seedAdmin('OldPassword!!')
    const store = await getStore()
    const otherId = newId()
    await store.createUser({
      id: otherId,
      email: 'other@example.com',
      password_hash: await hashPassword('OtherPassword!!'),
      role: 'admin',
      distributor_id: null,
      active: true,
    })
    const app = createApp()
    const res = await postRecovery(app, {
      authorization: SECRET,
      password: 'NewPassword!!',
      password_confirm: 'NewPassword!!',
      // Hostile fields ignored by schema — still only fixed admin updated
      admin_id: otherId,
      email: 'other@example.com',
      user_id: otherId,
    })
    assert.equal(res.status, 200)
    const other = await store.findUserById(otherId)
    assert.equal(await verifyPassword('OtherPassword!!', other!.password_hash), true)
    const owner = await store.findUserById(STAGING_OWNER_ADMIN_ID)
    assert.equal(await verifyPassword('NewPassword!!', owner!.password_hash), true)
    assert.equal(fingerprintRecoverySecret(SECRET).length, 64)
  })
})
