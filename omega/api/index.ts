import { getRequestListener } from '@hono/node-server'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from '../server/app.ts'

/**
 * Vercel Node serverless entry (Build Output API → api.func).
 *
 * Bare `export default (req) => Response` is wrong for Node22 on Vercel:
 * the platform invokes the legacy `(IncomingMessage, ServerResponse) => void`
 * signature and ignores returned Web Responses — which produced
 * `this.raw.headers.get is not a function` when Hono treated Node req as Request.
 *
 * `getRequestListener` adapts Node HTTP ↔ Web Request/Response and always writes `res`.
 */
export const runtime = 'nodejs'

const app = createApp()

async function handleFetch(request: Request): Promise<Response> {
  return app.fetch(request)
}

function failClosedResponse(err: unknown): Response {
  console.error('[omega] node listener error', err instanceof Error ? err.message : 'error')
  return new Response(JSON.stringify({ error: 'Internal error', code: 'internal' }), {
    status: 500,
    headers: { 'content-type': 'application/json', connection: 'close' },
  })
}

const nodeListener = getRequestListener(handleFetch, {
  errorHandler: (err) => failClosedResponse(err),
})

/**
 * Default export: Node (req, res) — matches Vercel Node launcher for bare default.
 * Always completes the ServerResponse (including fail-closed JSON on adapter errors).
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await nodeListener(req, res)
  } catch (err) {
    if (res.headersSent || res.writableEnded) return
    const body = failClosedResponse(err)
    res.statusCode = body.status
    for (const [k, v] of body.headers) res.setHeader(k, v)
    res.end(Buffer.from(await body.arrayBuffer()))
  }
}

/** Web Standard fetch export — recognized by Vercel when using fetch-style handlers. */
export { handleFetch as fetch }
