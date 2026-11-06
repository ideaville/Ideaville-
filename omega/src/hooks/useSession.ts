import { useEffect, useState } from 'react'
import { api, type AuthUser } from '../lib/api'

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
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
    return () => {
      cancelled = true
    }
  }, [])

  return { user, loaded, setUser }
}
