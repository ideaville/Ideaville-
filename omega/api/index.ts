import { handle } from 'hono/vercel'
import { createApp } from '../server/app.ts'

/**
 * Vercel Node serverless entry.
 * Packaged via scripts/build-vercel.mjs into Build Output API
 * (.vercel/output/functions/api.func) — Vite SPA build alone does not ship this.
 */
export const runtime = 'nodejs'

const app = createApp()

export default handle(app)
