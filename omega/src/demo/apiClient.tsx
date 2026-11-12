import type { ReactNode } from 'react'
import { ApiClientContext, type AppApiClient } from './useApiClient'

export type { AppApiClient }

export function ApiClientProvider({ client, children }: { client: AppApiClient; children: ReactNode }) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>
}
