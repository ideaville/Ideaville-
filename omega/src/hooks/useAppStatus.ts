import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { deriveAppStatus, type AppStatus } from '../lib/appStatus'

const fallback: AppStatus = deriveAppStatus(null, null)

type StatusPayload = Parameters<typeof deriveAppStatus>[0]
type CatalogPayload = Parameters<typeof deriveAppStatus>[1]

/**
 * Shared in-flight fetch so Nav + Login (both mount this hook on /login)
 * do not stampede /api/catalog seed and cancel each other's success path.
 */
let sharedPair: Promise<readonly [StatusPayload, CatalogPayload]> | null = null

async function loadStatusPair(): Promise<readonly [StatusPayload, CatalogPayload]> {
  if (!sharedPair) {
    sharedPair = (async () => {
      // Status alone decides canSignIn — never let catalog failure wipe a healthy postgres status.
      const status = await api.status().catch(() => null)
      const catalog = await api.catalog().catch(() => null)
      return [status, catalog] as const
    })().finally(() => {
      queueMicrotask(() => {
        sharedPair = null
      })
    })
  }
  return sharedPair
}

/** Test helper — clears the shared inflight pair between cases. */
export function resetAppStatusFetchCache() {
  sharedPair = null
}

export function useAppStatus() {
  const [status, setStatus] = useState<AppStatus>(fallback)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [s, c] = await loadStatusPair()
      if (!cancelled) setStatus(deriveAppStatus(s, c))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return status
}
