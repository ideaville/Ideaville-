import { createContext, useContext } from 'react'
import { api } from '../lib/api'

/** Injectable client for UI actions — real `api` by default; demo routes supply a fixture client. */
export type AppApiClient = typeof api

export const ApiClientContext = createContext<AppApiClient>(api)

export function useApiClient(): AppApiClient {
  return useContext(ApiClientContext)
}
