import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import http from 'node:http'
import { getRequestListener } from '@hono/node-server'
import { createApp } from './app.ts'
import { hashPassword, newId } from './crypto.ts'
import { messageForLoginFailure } from '../src/lib/loginError.ts'
import { copy } from '../src/lib/copy.ts'
import { getStore, resetStoreSingleton } from './store/index.ts'

describe('OMEGA login error distinction', () => {
  it('UI maps only 401/unauthorized to incorrect-credentials copy', () => {
    assert.equal(messageForLoginFailure({ status: 401, code: 'unauthorized' }), copy.signInError)
    assert.equal(messageForLoginFailure({ status: 500, code: 'internal' }), copy.signInFailed)
    assert.equal(messageForLoginFailure({ status: 400, code: 'bad_request' }), copy.signInFailed)
    assert.equal(messageForLoginFailure(new TypeError('Failed to fetch')), copy.signInFailed)
  })

  it('Node adapter POST login returns distinct status codes for wrong password vs bad JSON', async () => {
    resetStoreSingleton()
    process.env.OMEGA_ALLOW_MEMORY_STORE = '1'
    delete process.env.DATABASE_URL
    delete process.env.OMEGA_BOOTSTRAP_ADMIN_EMAIL
    delete process.env.OMEGA_BOOTSTRAP_ADMIN_PASSWORD

    const app = createApp()
    const store = await getStore()
    await store.createUser({
      id: newId(),
      email: 'wisdomreignsnow@gmail.com',
      password_hash: await hashPassword('CorrectHorseBattery'),
      role: 'admin',
      distributor_id: null,
      active: true,
    })

    const listener = getRequestListener((req) => app.fetch(req))
    const server = http.createServer((req, res) => {
      void listener(req, res)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const { port } = server.address() as { port: number }

    async function post(body: string | null, contentType = 'application/json') {
      return new Promise<{ status: number; json: Record<string, unknown> }>((resolve, reject) => {
        const buf = body == null ? null : Buffer.from(body)
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
              'content-type': contentType,
              ...(buf ? { 'content-length': String(buf.length) } : { 'content-length': '0' }),
              origin: 'https://example-preview.vercel.app',
              'x-forwarded-proto': 'https',
              'x-forwarded-host': 'example-preview.vercel.app',
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
              resolve({ status: res.statusCode ?? 0, json })
            })
          },
        )
        req.on('error', reject)
        if (buf) req.write(buf)
        req.end()
      })
    }

    try {
      const wrong = await post(JSON.stringify({ email: 'wisdomreignsnow@gmail.com', password: 'WrongPassword!!' }))
      assert.equal(wrong.status, 401)
      assert.equal(wrong.json.code, 'unauthorized')
      assert.equal(messageForLoginFailure({ status: wrong.status, code: wrong.json.code }), copy.signInError)

      const empty = await post(null)
      assert.equal(empty.status, 400)
      assert.equal(empty.json.code, 'bad_request')
      assert.equal(messageForLoginFailure({ status: empty.status, code: empty.json.code }), copy.signInFailed)

      const ok = await post(
        JSON.stringify({ email: 'Wisdomreignsnow@gmail.com', password: 'CorrectHorseBattery' }),
      )
      assert.equal(ok.status, 200)
      assert.ok((ok.json.user as { email?: string })?.email === 'wisdomreignsnow@gmail.com')
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      resetStoreSingleton()
      delete process.env.OMEGA_ALLOW_MEMORY_STORE
    }
  })
})
