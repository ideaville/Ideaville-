import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'
import { ApiClientProvider } from './apiClient'
import { useDemo } from './useDemo'

/**
 * Supplies a fixture-backed api client to existing UI action components.
 * Never forwards demo writes to real /api/* mutators.
 */
export function DemoApiBridge({ children }: { children: ReactNode }) {
  const demo = useDemo()

  const client = useMemo(() => {
    return {
      ...api,
      me: async () => ({ user: demo.adminUser }),
      adminOverview: async () => demo.admin,
      catalog: async () => ({
        settings: demo.admin.settings as Record<string, unknown>,
        products: demo.catalogProducts,
        readiness: { persistence: 'memory', migrated: true, message: 'Demo catalogue (fixtures).' },
      }),
      status: async () => ({
        readiness: { persistence: 'memory', migrated: true, message: 'Demo status.' },
        settings: {
          ...(demo.admin.settings as Record<string, unknown>),
          // Demo shop uses live-style canOrder path via approved demo SKU + preview helpers still work when false.
          commercial_activation: Boolean((demo.admin.settings as Record<string, unknown>).commercial_activation),
          checkout_enabled: Boolean((demo.admin.settings as Record<string, unknown>).checkout_enabled),
          payment_provider_configured: Boolean(
            (demo.admin.settings as Record<string, unknown>).payment_provider_configured,
          ),
          delivery_policy_configured: Boolean(
            (demo.admin.settings as Record<string, unknown>).delivery_policy_configured,
          ),
        },
      }),
      patchSettings: async (patch: Record<string, boolean>) => {
        for (const key of Object.keys(patch)) demo.toggleAdminSetting(key)
        return { settings: demo.admin.settings }
      },
      createProduct: async (input: Parameters<typeof api.createProduct>[0]) => { await demo.demoCreateProduct(input); return {} },
      updateProduct: async (id: string, patch: Parameters<typeof api.updateProduct>[1]) => { await demo.demoUpdateProductSale(id, patch); return {} },
      createPrice: async (input: Parameters<typeof api.createPrice>[0]) => { await demo.demoCreatePrice(input); return {} },
      createBatch: async (input: Parameters<typeof api.createBatch>[0]) => { await demo.demoCreateBatch(input); return {} },
      adjustStock: async (input: Parameters<typeof api.adjustStock>[0]) => { await demo.demoAdjustStock(input); return {} },
      setPayment: async (orderId: string, input: Parameters<typeof api.setPayment>[1]) => { await demo.demoSetPayment(orderId, input); return {} },
      setFulfillment: async (orderId: string, input: Parameters<typeof api.setFulfillment>[1]) => { await demo.demoSetFulfillment(orderId, input); return {} },
      createDistributor: async (input: Parameters<typeof api.createDistributor>[0]) => { await demo.demoCreateDistributor(input); return {} },
      updateDistributor: async (id: string, patch: Parameters<typeof api.updateDistributor>[1]) => { await demo.demoUpdateDistributorStatus(id, patch.status); return {} },
      createUser: async () => {
        demo.noteSimulated('Demo: create user is unimplemented — no account/password write.')
        throw new Error('Demo does not create real distributor logins.')
      },
      createTerm: async (input: {
        kind: 'wholesale_margin' | 'commission'
        distributor_id: string | null
        rate_bps: number | null
        notes: string
        activate: boolean
      }) => {
        await demo.demoCreateTerm({
          distributor_id: input.distributor_id,
          kind: input.kind,
          rate_bps: input.rate_bps,
          notes: input.notes,
          activate: input.activate,
        })
        return {}
      },
      distributorNetwork: async () => demo.network,
      createReferral: async (input: { prospect_label: string; notes?: string }) => { await demo.recordReferral({ prospect_label: input.prospect_label, notes: input.notes ?? '' }); return { referral: demo.network.referrals[0]! } },
      lookupReferral: (code: string) => demo.lookupReferral(code),
      placeOrder: async () => {
        demo.noteSimulated('Demo: live placeOrder blocked — use Preview review on /demo/shop.')
        throw new Error('Demo mode does not create live orders.')
      },
      logout: async () => ({ ok: true }),
      ownerRecovery: async () => {
        throw new Error('Recovery is not available in demo mode.')
      },
      login: async () => {
        throw new Error('Demo mode does not use app passwords.')
      },
    } satisfies typeof api
  }, [demo])

  return <ApiClientProvider client={client}>{children}</ApiClientProvider>
}
