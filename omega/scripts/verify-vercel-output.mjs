#!/usr/bin/env node
/**
 * Asserts Build Output API packaging AND that the emitted Node22 function
 * actually loads + serves /api/* the way Vercel would (ESM marker required).
 * Does not claim DATABASE_URL / commerce works — only that the process starts.
 */
import { access, readFile, mkdtemp, cp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, '.vercel', 'output')
const funcDir = path.join(out, 'functions', 'api.func')

async function mustExist(p) {
  await access(p)
}

function runNode(args, { cwd, env, timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({ code: -1, stdout, stderr: stderr + '\n[timeout]' })
    }, timeoutMs)
    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? 1, stdout, stderr })
    })
  })
}

async function main() {
  await mustExist(path.join(out, 'config.json'))
  await mustExist(path.join(out, 'static', 'index.html'))
  await mustExist(path.join(funcDir, 'index.js'))
  await mustExist(path.join(funcDir, '.vc-config.json'))
  await mustExist(path.join(funcDir, 'package.json'))

  const config = JSON.parse(await readFile(path.join(out, 'config.json'), 'utf8'))
  if (config.version !== 3) throw new Error('config.json version must be 3')
  const apiRoute = (config.routes ?? []).some(
    (r) => typeof r.src === 'string' && r.src.includes('/api') && r.dest === '/api',
  )
  if (!apiRoute) throw new Error('config.json missing /api → /api route')

  const vc = JSON.parse(await readFile(path.join(funcDir, '.vc-config.json'), 'utf8'))
  if (vc.launcherType !== 'Nodejs') throw new Error('api.func must use Nodejs launcher')
  if (vc.shouldAddHelpers !== false) throw new Error('shouldAddHelpers must be false for Hono')
  if (vc.handler !== 'index.js') throw new Error('handler must be index.js')
  if (vc.runtime !== 'nodejs22.x') throw new Error('runtime must be nodejs22.x')

  const pkg = JSON.parse(await readFile(path.join(funcDir, 'package.json'), 'utf8'))
  if (pkg.type !== 'module') {
    throw new Error('api.func/package.json must set "type":"module" for ESM index.js under Node22')
  }

  const bundle = await readFile(path.join(funcDir, 'index.js'), 'utf8')
  if (!bundle.includes('health')) throw new Error('api bundle does not reference health')
  if (bundle.length < 1000) throw new Error('api bundle unexpectedly small')
  if (!bundle.trimStart().startsWith('import ')) {
    // Still allow future CJS; if CJS, type:module would be wrong — flag inconsistency.
    if (pkg.type === 'module' && /\brequire\s*\(/.test(bundle.slice(0, 200))) {
      throw new Error('bundle looks CJS but package.json type is module')
    }
  }

  // Prove the historical Vercel failure mode (matches production logs):
  // Warning: Failed to load the ES module … set "type": "module" …
  // SyntaxError: Cannot use import statement outside a module
  const sandbox = await mkdtemp(path.join(tmpdir(), 'omega-vc-'))
  try {
    await cp(path.join(funcDir, 'index.js'), path.join(sandbox, 'index.js'))
    // Intentionally NO package.json — mirrors /var/task before this fix.
    const cjsProbe = path.join(sandbox, 'probe.cjs')
    await writeFile(
      cjsProbe,
      `try { require('./index.js'); console.log('UNEXPECTED_OK'); process.exit(0); } catch (e) { console.error(String(e && e.message ? e.message : e)); process.exit(2); }\n`,
    )
    const probe = await runNode(['--no-experimental-require-module', cjsProbe], { cwd: sandbox })
    const probeText = `${probe.stdout}\n${probe.stderr}`
    if (probe.code === 0 || probeText.includes('UNEXPECTED_OK')) {
      throw new Error('Expected CJS require of ESM index.js without type:module to fail (Vercel Node22 mode)')
    }
    if (!/Cannot use import statement outside a module/i.test(probeText)) {
      throw new Error(`CJS probe missing expected SyntaxError: ${probeText}`)
    }

    // Realistic Vercel-like load: directory with package.json type module + dynamic import + HTTP.
    const goodDir = path.join(sandbox, 'good')
    await cp(funcDir, goodDir, { recursive: true })
    const harness = path.join(goodDir, '_startup_harness.mjs')
    await writeFile(
      harness,
      `import mod from './index.js';
const handler = mod?.default ?? mod;
if (typeof handler !== 'function') {
  console.error('handler_not_function', Object.keys(mod ?? {}));
  process.exit(1);
}
async function check(path) {
  const res = await handler(new Request('https://omega.example' + path, { method: 'GET' }));
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: res.status, body };
}
const health = await check('/api/health');
const status = await check('/api/status');
const catalog = await check('/api/catalog');
if (health.status !== 200 || health.body?.ok !== true) {
  console.error('health_failed', health);
  process.exit(1);
}
if (status.status !== 200 || !status.body?.readiness) {
  console.error('status_failed', status);
  process.exit(1);
}
// Without DATABASE_URL this harness must not crash; unconfigured/error are both fail-closed OK.
const p = status.body.readiness.persistence;
if (p !== 'unconfigured' && p !== 'error' && p !== 'postgres' && p !== 'memory') {
  console.error('unexpected_persistence', p);
  process.exit(1);
}
if (catalog.status !== 200 || !Array.isArray(catalog.body?.products)) {
  console.error('catalog_failed', catalog);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  health: health.body,
  statusPersistence: p,
  catalogProducts: catalog.body.products.length,
}));
`,
    )

    const started = await runNode([harness], {
      cwd: goodDir,
      env: {
        // Prove boot without DB secrets; do not inherit a live DATABASE_URL into the harness.
        DATABASE_URL: '',
        OMEGA_ALLOW_MEMORY_STORE: '',
        OMEGA_BOOTSTRAP_ADMIN_EMAIL: '',
        OMEGA_BOOTSTRAP_ADMIN_PASSWORD: '',
      },
    })
    if (started.code !== 0) {
      throw new Error(`Emitted function failed to start/serve: ${started.stderr || started.stdout}`)
    }
    const line = started.stdout.trim().split('\n').filter(Boolean).pop()
    const report = JSON.parse(line)
    if (!report.ok) throw new Error('startup harness returned not ok')

    console.log('[verify-vercel-output] ok')
    console.log(
      JSON.stringify(
        {
          routes: config.routes,
          function: vc,
          packageType: pkg.type,
          bundleBytes: bundle.length,
          startup: report,
          cjsRequireWithoutTypeModuleExits: probe.code,
        },
        null,
        2,
      ),
    )
  } finally {
    await rm(sandbox, { recursive: true, force: true })
  }

}

main().catch((err) => {
  console.error('[verify-vercel-output] failed', err.message)
  process.exit(1)
})
