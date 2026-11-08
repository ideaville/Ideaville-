import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'

/** Injectable client for UI actions — real `api` by default; demo routes supply a fixture client. */
export type AppApiClient = typeof api

const ApiClientContext = createContext<AppApiClient>(api)

export function ApiClientProvider({ client, children }: { client: AppApiClient; children: ReactNode }) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>
}

export function useApiClient(): AppApiClient {
  return useContext(ApiClientContext)
}
