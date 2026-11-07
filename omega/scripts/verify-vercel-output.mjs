#!/usr/bin/env node
/** Asserts Build Output API contains a packaged /api serverless function. */
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, '.vercel', 'output')

async function mustExist(p) {
  await access(p)
}

async function main() {
  await mustExist(path.join(out, 'config.json'))
  await mustExist(path.join(out, 'static', 'index.html'))
  await mustExist(path.join(out, 'functions', 'api.func', 'index.js'))
  await mustExist(path.join(out, 'functions', 'api.func', '.vc-config.json'))

  const config = JSON.parse(await readFile(path.join(out, 'config.json'), 'utf8'))
  if (config.version !== 3) throw new Error('config.json version must be 3')
  const apiRoute = (config.routes ?? []).some((r) => typeof r.src === 'string' && r.src.includes('/api') && r.dest === '/api')
  if (!apiRoute) throw new Error('config.json missing /api → /api route')

  const vc = JSON.parse(await readFile(path.join(out, 'functions', 'api.func', '.vc-config.json'), 'utf8'))
  if (vc.launcherType !== 'Nodejs') throw new Error('api.func must use Nodejs launcher')
  if (vc.shouldAddHelpers !== false) throw new Error('shouldAddHelpers must be false for Hono')
  if (vc.handler !== 'index.js') throw new Error('handler must be index.js')

  const bundle = await readFile(path.join(out, 'functions', 'api.func', 'index.js'), 'utf8')
  if (!bundle.includes('health')) throw new Error('api bundle does not reference health')
  if (bundle.length < 1000) throw new Error('api bundle unexpectedly small')

  console.log('[verify-vercel-output] ok')
  console.log(JSON.stringify({ routes: config.routes, function: vc, bundleBytes: bundle.length }, null, 2))
}

main().catch((err) => {
  console.error('[verify-vercel-output] failed', err.message)
  process.exit(1)
})
