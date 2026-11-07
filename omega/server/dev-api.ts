import { serve } from '@hono/node-server'
import { createApp } from './app.ts'

const port = Number(process.env.OMEGA_API_PORT ?? 8787)
serve({ fetch: createApp().fetch, port })
console.log(`[omega] API listening on http://127.0.0.1:${port}`)
