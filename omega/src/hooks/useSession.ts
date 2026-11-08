import { useEffect, useState } from 'react'
import { api, SESSION_CHANGED_EVENT, type AuthUser } from '../lib/api'

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    function refresh() {
      api
        .me()
        .then((res) => {
          if (!cancelled) setUser(res.user)
        })
        .catch(() => {
          if (!cancelled) setUser(null)
        })
        .finally(() => {
          if (!cancelled) setLoaded(true)
        })
    }
    refresh()
    window.addEventListener(SESSION_CHANGED_EVENT, refresh)
    return () => {
      cancelled = true
      window.removeEventListener(SESSION_CHANGED_EVENT, refresh)
    }
  }, [])

  return { user, loaded, setUser }
}
