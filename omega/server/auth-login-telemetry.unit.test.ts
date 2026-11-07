import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import http from 'node:http'
import { getRequestListener } from '@hono/node-server'
import { AuthCredentialRejected } from './authCredentialRejected.ts'
import {
  formatAuthLoginTelemetry,
  isValidLoginRequestId,
  newLoginRequestId,
  type AuthLoginOutcome,
} from './authLoginTelemetry.ts'
import { createApp } from './app.ts'
import { hashPassword, newId } from './crypto.ts'
import { messageForLoginFailure } from '../src/lib/loginError.ts'
import { copy } from '../src/lib/copy.ts'
import { getStore, resetStoreSingleton } from './store/index.ts'
import { login } from './services/auth.ts'

const FORBIDDEN_TELEMETRY_SUBSTRINGS = [
  'wisdomreignsnow',
  '@gmail',
  'password',
  'CorrectHorse',
  'WrongPassword',
  'scrypt$',
  'omega_session',
  'token_hash',
  'password_hash',
  'Bearer',
  '85929a87',
  'stack',
  '    at ',
]

describe('OMEGA auth login telemetry + bare-401 mapping', () => {
  it('UI requires application unauthorized code; bare 401 is not credential copy', () => {
    assert.equal(messageForLoginFailure({ status: 401, code: 'unauthorized' }), copy.signInError)
    assert.equal(messageForLoginFailure({ status: 401 }), copy.signInFailed)
    assert.equal(messageForLoginFailure({ status: 401, code: '' }), copy.signInFailed)
    assert.equal(messageForLoginFailure({ status: 401, code: 'DEPLOYMENT_PASSWORD_MISSING' }), copy.signInFailed)
    assert.equal(messageForLoginFailure({ status: 500, code: 'internal' }), copy.signInFailed)
    assert.equal(messageForLoginFailure({ status: 400, code: 'bad_request' }), copy.signInFailed)
    assert.equal(messageForLoginFailure(new TypeError('Failed to fetch')), copy.signInFailed)
  })

  it('generates bounded rid and refuses invalid rid/outcome in formatter', () => {
    const rid = newLoginRequestId()
    assert.equal(isValidLoginRequestId(rid), true)
    assert.equal(rid.length, 32)
    assert.match(rid, /^[a-f0-9]{32}$/)

    assert.equal(isValidLoginRequestId(''), false)
    assert.equal(isValidLoginRequestId('not-a-rid'), false)
    assert.equal(isValidLoginRequestId('x'.repeat(32)), false)
    assert.equal(isValidLoginRequestId('a'.repeat(64)), false)
    assert.equal(isValidLoginRequestId("'; DROP TABLE users; --"), false)

    assert.throws(() => formatAuthLoginTelemetry({ rid: 'evil\ninject', outcome: 'session_created' }))
    assert.throws(() =>
      formatAuthLoginTelemetry({
        rid: newLoginRequestId(),
        outcome: 'not_an_outcome' as AuthLoginOutcome,
      }),
    )

    const line = formatAuthLoginTelemetry({ rid, outcome: 'lookup_rejected' })
    assert.equal(line, `[omega] auth_login rid=${rid} outcome=lookup_rejected`)
  })

  it('login rejects with server-only outcomes while client JSON stays generic unauthorized', async () => {
    resetStoreSingleton()
    process.env.OMEGA_ALLOW_MEMORY_STORE = '1'
    delete process.env.DATABASE_URL
    delete process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL
    delete process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD

    try {
      const store = await getStore()
      await store.createUser({
        id: newId(),
        email: 'wisdomreignsnow@gmail.com',
        password_hash: await hashPassword('CorrectHorseBattery'),
        role: 'admin',
        distributor_id: null,
        active: true,
      })

      try {
        await login(store, 'missing@example.com', 'CorrectHorseBattery')
        assert.fail('expected lookup rejection')
      } catch (err) {
        assert.ok(err instanceof AuthCredentialRejected)
        assert.equal(err.outcome, 'lookup_rejected')
        assert.equal(err.status, 401)
        assert.equal(err.code, 'unauthorized')
        assert.equal(err.message, 'Invalid credentials')
      }

      try {
        await login(store, 'wisdomreignsnow@gmail.com', 'WrongPassword!!')
        assert.fail('expected verification rejection')
      } catch (err) {
        assert.ok(err instanceof AuthCredentialRejected)
        assert.equal(err.outcome, 'verification_rejected')
        assert.equal(err.status, 401)
        assert.equal(err.code, 'unauthorized')
        assert.equal(err.message, 'Invalid credentials')
      }
    } finally {
      resetStoreSingleton()
      delete process.env.OMEGA_ALLOW_MEMORY_STORE
    }
  })

  it('HTTP login emits privacy-safe outcome lines and never leaks secrets in body or logs', async () => {
    resetStoreSingleton()
    process.env.OMEGA_ALLOW_MEMORY_STORE = '1'
    delete process.env.DATABASE_URL
    delete process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL
    delete process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD

    const app = createApp()
    const store = await getStore()
    await store.createUser({
      id: '85929a87-fd66-4633-aa97-c4bb6e8ea8de',
      email: 'wisdomreignsnow@gmail.com',
      password_hash: await hashPassword('CorrectHorseBattery'),
      role: 'admin',
      distributor_id: null,
      active: true,
    })

    const lines: string[] = []
    const originalInfo = console.info
    console.info = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    }

    const listener = getRequestListener((req) => app.fetch(req))
    const server = http.createServer((req, res) => {
      void listener(req, res)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const { port } = server.address() as { port: number }

    async function post(body: string) {
      return new Promise<{ status: number; json: Record<string, unknown>; setCookie: string | null }>(
        (resolve, reject) => {
          const buf = Buffer.from(body)
          const req = http.request(
            {
              host: '127.0.0.1',
              port,
              path: '/api/auth/login',
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'content-length': String(buf.length),
                // Hostile / platform-like headers must not become telemetry.
                'x-vercel-id': 'evil;DROP TABLE--password=CorrectHorseBattery',
                'x-request-id': 'wisdomreignsnow@gmail.com',
                cookie: 'omega_session=leak-me-token; _vercel_jwt=platform',
              },
            },
            (res) => {
              const chunks: Buffer[] = []
              res.on('data', (c) => chunks.push(c))
              res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8')
                let json: Record<string, unknown> = {}
                try {
                  json = JSON.parse(text) as Record<string, unknown>
                } catch {
                  json = { raw: text }
                }
                resolve({
                  status: res.statusCode ?? 0,
                  json,
                  setCookie: res.headers['set-cookie']?.[0] ?? null,
                })
              })
            },
          )
          req.on('error', reject)
          req.write(buf)
          req.end()
        },
      )
    }

    try {
      const missing = await post(
        JSON.stringify({ email: 'absent@example.com', password: 'CorrectHorseBattery' }),
      )
      assert.equal(missing.status, 401)
      assert.equal(missing.json.code, 'unauthorized')
      assert.equal(missing.json.error, 'Invalid credentials')
      assert.equal(Object.keys(missing.json).sort().join(','), 'code,error')
      assert.equal(messageForLoginFailure({ status: missing.status, code: missing.json.code }), copy.signInError)

      const wrong = await post(
        JSON.stringify({ email: 'wisdomreignsnow@gmail.com', password: 'WrongPassword!!' }),
      )
      assert.equal(wrong.status, 401)
      assert.equal(wrong.json.code, 'unauthorized')
      assert.equal(wrong.json.error, 'Invalid credentials')
      assert.equal(Object.keys(wrong.json).sort().join(','), 'code,error')

      const ok = await post(
        JSON.stringify({ email: 'Wisdomreignsnow@gmail.com', password: 'CorrectHorseBattery' }),
      )
      assert.equal(ok.status, 200)
      assert.ok(ok.json.user)
      assert.equal((ok.json.user as { email: string }).email, 'wisdomreignsnow@gmail.com')
      assert.ok(!('password' in ok.json))
      assert.ok(!('token' in ok.json))
      assert.ok(!('outcome' in ok.json))
      assert.ok(!('rid' in ok.json))
      assert.ok(ok.setCookie?.includes('omega_session='))

      const authLines = lines.filter((l) => l.includes('[omega] auth_login'))
      assert.equal(authLines.length, 3)
      assert.match(authLines[0]!, /outcome=lookup_rejected$/)
      assert.match(authLines[1]!, /outcome=verification_rejected$/)
      assert.match(authLines[2]!, /outcome=session_created$/)

      for (const line of authLines) {
        assert.match(line, /^\[omega\] auth_login rid=[a-f0-9]{32} outcome=(lookup_rejected|verification_rejected|session_created)$/)
        for (const bad of FORBIDDEN_TELEMETRY_SUBSTRINGS) {
          assert.equal(line.toLowerCase().includes(bad.toLowerCase()), false, `telemetry leaked ${bad}: ${line}`)
        }
        // Inbound hostile headers must not appear.
        assert.equal(line.includes('DROP TABLE'), false)
        assert.equal(line.includes('evil'), false)
        assert.equal(line.includes('vercel'), false)
      }

      // Bare platform-like 401 without application code stays non-credential UI.
      assert.equal(messageForLoginFailure({ status: 401 }), copy.signInFailed)
    } finally {
      console.info = originalInfo
      await new Promise<void>((resolve) => server.close(() => resolve()))
      resetStoreSingleton()
      delete process.env.OMEGA_ALLOW_MEMORY_STORE
    }
  })

  it('persistence failures on login return sanitized JSON and emit server_exception', async () => {
    resetStoreSingleton()
    process.env.DATABASE_URL = 'postgres://omega_app:invalid@127.0.0.1:1/does_not_exist'
    delete process.env.OMEGA_ALLOW_MEMORY_STORE

    const app = createApp()
    const lines: string[] = []
    const originalInfo = console.info
    console.info = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    }

    try {
      // Warm failed store
      await app.request('/api/status')
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'wisdomreignsnow@gmail.com', password: 'CorrectHorseBattery' }),
      })
      assert.equal(res.status, 503)
      const json = (await res.json()) as Record<string, unknown>
      assert.ok(String(json.code).startsWith('persistence_'))
      assert.equal(json.error, 'Persistence unavailable.')
      assert.equal(JSON.stringify(json).includes('ECONNREFUSED'), false)
      assert.equal(JSON.stringify(json).includes('omega_app'), false)
      assert.equal(messageForLoginFailure({ status: res.status, code: String(json.code) }), copy.signInFailed)

      const telemetry = lines.find((l) => l.includes('outcome=server_exception'))
      assert.ok(telemetry)
      assert.match(telemetry!, /^\[omega\] auth_login rid=[a-f0-9]{32} outcome=server_exception$/)
    } finally {
      console.info = originalInfo
      delete process.env.DATABASE_URL
      resetStoreSingleton()
    }
  })

  it('server_exception outcome logs without stack or request body content', async () => {
    resetStoreSingleton()
    process.env.OMEGA_ALLOW_MEMORY_STORE = '1'
    delete process.env.DATABASE_URL

    const store = await getStore()
    const originalCreate = store.createSession.bind(store)
    store.createSession = async () => {
      throw new Error('synthetic session insert failure with password=secret and stack')
    }

    await store.createUser({
      id: newId(),
      email: 'ops@example.com',
      password_hash: await hashPassword('CorrectHorseBattery'),
      role: 'admin',
      distributor_id: null,
      active: true,
    })

    const app = createApp()
    const lines: string[] = []
    const originalInfo = console.info
    const originalError = console.error
    console.info = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    }
    console.error = (...args: unknown[]) => {
      lines.push(`error:${args.map(String).join(' ')}`)
    }

    const listener = getRequestListener((req) => app.fetch(req))
    const server = http.createServer((req, res) => {
      void listener(req, res)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const { port } = server.address() as { port: number }

    try {
      const res = await new Promise<{ status: number; json: Record<string, unknown> }>((resolve, reject) => {
        const buf = Buffer.from(JSON.stringify({ email: 'ops@example.com', password: 'CorrectHorseBattery' }))
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'content-type': 'application/json', 'content-length': String(buf.length) },
          },
          (response) => {
            const chunks: Buffer[] = []
            response.on('data', (c) => chunks.push(c))
            response.on('end', () => {
              resolve({
                status: response.statusCode ?? 0,
                json: JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>,
              })
            })
          },
        )
        req.on('error', reject)
        req.write(buf)
        req.end()
      })

      assert.equal(res.status, 500)
      assert.equal(res.json.code, 'internal')
      assert.equal(res.json.error, 'Internal error')
      assert.ok(!JSON.stringify(res.json).includes('synthetic'))
      assert.ok(!JSON.stringify(res.json).includes('password'))

      const telemetry = lines.find((l) => l.includes('outcome=server_exception'))
      assert.ok(telemetry)
      assert.match(
        telemetry!,
        /^\[omega\] auth_login rid=[a-f0-9]{32} outcome=server_exception$/,
      )
      assert.equal(telemetry!.includes('synthetic'), false)
      assert.equal(telemetry!.includes('password'), false)
      assert.equal(telemetry!.includes('ops@'), false)
    } finally {
      store.createSession = originalCreate
      console.info = originalInfo
      console.error = originalError
      await new Promise<void>((resolve) => server.close(() => resolve()))
      resetStoreSingleton()
      delete process.env.OMEGA_ALLOW_MEMORY_STORE
    }
  })
})
