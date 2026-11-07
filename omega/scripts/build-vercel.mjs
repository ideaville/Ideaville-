#!/usr/bin/env node
/**
 * Emits Vercel Build Output API v3:
 * - static SPA from Vite → .vercel/output/static
 * - Hono API → .vercel/output/functions/api.func
 *
 * Vite framework preset alone only ships dist/; this script is required so
 * /api/* is a real serverless function (health proves the server is up;
 * commerce stays fail-closed without DATABASE_URL).
 */
import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build as viteBuild } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, '.vercel', 'output')
const funcDir = path.join(out, 'functions', 'api.func')
const staticDir = path.join(out, 'static')

async function main() {
  await rm(out, { recursive: true, force: true })
  await mkdir(out, { recursive: true })

  // 1) Client SPA
  await viteBuild({ configFile: path.join(root, 'vite.config.ts'), root })

  const distDir = path.join(root, 'dist')
  await mkdir(staticDir, { recursive: true })
  await cp(distDir, staticDir, { recursive: true })

  // 2) API serverless function (bundle with Vite SSR, no new bundler dep)
  await viteBuild({
    configFile: false,
    root,
    publicDir: false,
    build: {
      ssr: path.join(root, 'api/index.ts'),
      outDir: funcDir,
      emptyOutDir: true,
      minify: false,
      sourcemap: false,
      copyPublicDir: false,
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
          format: 'esm',
          codeSplitting: false,
        },
      },
    },
    ssr: {
      target: 'node',
      // Bundle app + deps into one file; Node builtins stay external.
      noExternal: true,
    },
    logLevel: 'warn',
  })


  await writeFile(
    path.join(funcDir, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: 'nodejs22.x',
        handler: 'index.js',
        launcherType: 'Nodejs',
        shouldAddHelpers: false,
        supportsResponseStreaming: true,
      },
      null,
      2,
    ),
  )

  const config = {
    version: 3,
    routes: [
      { src: '/api(?:/.*)?', dest: '/api' },
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index.html' },
    ],
  }
  await writeFile(path.join(out, 'config.json'), JSON.stringify(config, null, 2))

  // Evidence for local verification (also asserted by verify script)
  const entry = await readFile(path.join(funcDir, 'index.js'), 'utf8')
  if (!entry.includes('createApp') && !entry.includes('/api/health')) {
    // Bundled code may minify names; require a health route string at minimum.
    if (!entry.includes('health')) {
      throw new Error('API bundle missing health route evidence')
    }
  }

  console.log('[build-vercel] ok')
  console.log(`  static:    ${staticDir}`)
  console.log(`  function:  ${funcDir}`)
  console.log(`  config:    ${path.join(out, 'config.json')}`)
}

main().catch((err) => {
  console.error('[build-vercel] failed', err)
  process.exit(1)
})
