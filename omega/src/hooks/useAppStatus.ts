import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { deriveAppStatus, type AppStatus } from '../lib/appStatus'

const fallback: AppStatus = deriveAppStatus(null, null)

export function useAppStatus() {
  const [status, setStatus] = useState<AppStatus>(fallback)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [s, c] = await Promise.all([api.status(), api.catalog()])
        if (!cancelled) setStatus(deriveAppStatus(s, c))
      } catch {
        if (!cancelled) setStatus(deriveAppStatus(null, null))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return status
}
