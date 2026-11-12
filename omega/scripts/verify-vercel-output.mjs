#!/usr/bin/env node
/**
 * Asserts Build Output API packaging AND that the emitted Node22 function
 * serves /api/* the way Vercel Node does: ESM marker + (IncomingMessage, ServerResponse).
 * Does not claim DATABASE_URL / commerce works — only that the process responds.
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

function runNode(args, { cwd, env, timeoutMs = 25000 } = {}) {
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
  // Must be the Node listener path, not bare Web Response default.
  if (!bundle.includes('getRequestListener') && !bundle.includes('IncomingMessage')) {
    // Bundler may rename; require evidence of node-server / ServerResponse write path.
    if (!/ServerResponse|statusCode|setHeader/.test(bundle)) {
      throw new Error('api bundle missing Node HTTP (req,res) adapter evidence')
    }
  }

  const sandbox = await mkdtemp(path.join(tmpdir(), 'omega-vc-'))
  try {
    // Historical ESM failure without type:module
    await cp(path.join(funcDir, 'index.js'), path.join(sandbox, 'index.js'))
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

    // Realistic platform path: Node createServer(defaultExport) with IncomingMessage/ServerResponse.
    const goodDir = path.join(sandbox, 'good')
    await cp(funcDir, goodDir, { recursive: true })
    const harness = path.join(goodDir, '_http_harness.mjs')
    await writeFile(
      harness,
      `import http from 'node:http';
import * as mod from './index.js';

const handler = mod.default;
if (typeof handler !== 'function') {
  console.error('default_not_function', Object.keys(mod));
  process.exit(1);
}
if (typeof mod.fetch !== 'function') {
  console.error('fetch_export_missing');
  process.exit(1);
}
// Guard: default must be Node (req,res), not a Web handler that returns Response from one arg.
const arityOk = handler.length >= 2;
if (!arityOk) {
  console.error('default_export_arity_expected_req_res', handler.length);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error('handler_threw', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'harness', code: 'harness' }));
    }
  });
});

await new Promise((resolve, reject) => {
  server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
});
const { port } = server.address();

function httpJson(pathname, method = 'GET', timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('timeout ' + pathname));
    }, timeoutMs);
    const req = http.request(
      { host: '127.0.0.1', port, path: pathname, method, headers: { accept: 'application/json' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          clearTimeout(timer);
          const text = Buffer.concat(chunks).toString('utf8');
          let body;
          try { body = JSON.parse(text); } catch { body = { raw: text }; }
          resolve({ status: res.statusCode, body });
        });
      },
    );
    req.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    req.end();
  });
}

try {
  const health = await httpJson('/api/health');
  const status = await httpJson('/api/status');
  const catalog = await httpJson('/api/catalog');
  const me = await httpJson('/api/auth/me');

  if (health.status !== 200 || health.body?.ok !== true) {
    console.error('health_failed', health);
    process.exit(1);
  }
  if (status.status !== 200 || !status.body?.readiness) {
    console.error('status_failed', status);
    process.exit(1);
  }
  const p = status.body.readiness.persistence;
  if (p !== 'unconfigured' && p !== 'error' && p !== 'postgres' && p !== 'memory') {
    console.error('unexpected_persistence', p);
    process.exit(1);
  }
  if (catalog.status !== 200 || !Array.isArray(catalog.body?.products)) {
    console.error('catalog_failed', catalog);
    process.exit(1);
  }
  // Unauthenticated me must complete with a real status (401), never hang / headers.get crash.
  if (me.status !== 401 || !me.body?.error) {
    console.error('auth_me_failed', me);
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'node_http_incoming_message',
    health: health.body,
    statusPersistence: p,
    catalogProducts: catalog.body.products.length,
    authMe: { status: me.status, code: me.body.code ?? null },
  }));
} finally {
  await new Promise((resolve) => server.close(() => resolve()));
}
`,
    )

    const started = await runNode([harness], {
      cwd: goodDir,
      env: {
        DATABASE_URL: '',
        OMEGA_ALLOW_MEMORY_STORE: '',
        OMEGA_BOOTSTRAP_ADMIN_EMAIL: '',
        OMEGA_BOOTSTRAP_ADMIN_PASSWORD: '',
      },
    })
    if (started.code !== 0) {
      throw new Error(`Emitted function Node HTTP harness failed: ${started.stderr || started.stdout}`)
    }
    const line = started.stdout.trim().split('\n').filter(Boolean).pop()
    const report = JSON.parse(line)
    if (!report.ok || report.mode !== 'node_http_incoming_message') {
      throw new Error('startup harness returned unexpected report')
    }

    console.log('[verify-vercel-output] ok')
    console.log(
      JSON.stringify(
        {
          routes: config.routes,
          function: vc,
          packageType: pkg.type,
          bundleBytes: bundle.length,
          nodeHttp: report,
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
