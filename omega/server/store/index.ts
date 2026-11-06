import { createMemoryStore } from './memory.ts'
import { createUnconfiguredStore, tryCreatePostgresStore } from './postgres.ts'
import type { OmegaStore } from './types.ts'

let singleton: OmegaStore | null = null
let initPromise: Promise<OmegaStore> | null = null

/** Test helper — forces an isolated memory store. */
export function createTestStore() {
  return createMemoryStore()
}

export async function getStore(): Promise<OmegaStore> {
  if (singleton) return singleton
  if (!initPromise) {
    initPromise = (async () => {
      const url = process.env.DATABASE_URL?.trim()
      const allowMemory = process.env.OMEGA_ALLOW_MEMORY_STORE === '1'
      if (url) {
        try {
          singleton = await tryCreatePostgresStore(url)
          return singleton
        } catch (error) {
          console.error('[omega] postgres init failed; failing closed', error instanceof Error ? error.message : 'error')
          singleton = createUnconfiguredStore()
          return singleton
        }
      }
      if (allowMemory) {
        singleton = createMemoryStore()
        return singleton
      }
      singleton = createUnconfiguredStore()
      return singleton
    })()
  }
  return initPromise
}

export function resetStoreSingleton() {
  singleton = null
  initPromise = null
}
