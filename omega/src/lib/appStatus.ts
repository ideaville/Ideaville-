export type AppStatus = {
  database: 'connected' | 'not_connected'
  catalogue: 'draft' | 'published' | 'unavailable'
  payments: 'off' | 'on'
  /** Chip stays while any gate is not fully live — never fake “all clear”. */
  showChip: boolean
  canSignIn: boolean
  canOrder: boolean
  message: {
    database: string
    catalogue: string
    payments: string
  }
}

type StatusPayload = {
  readiness?: { persistence?: string; migrated?: boolean }
  settings?: unknown
}

type CatalogPayload = {
  products?: unknown[]
  readiness?: { persistence?: string }
  settings?: unknown
}

function asFlags(settings: unknown) {
  const s = settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {}
  return {
    activation: Boolean(s.commercial_activation),
    checkout: Boolean(s.checkout_enabled),
    paymentReady: Boolean(s.payment_provider_configured),
    deliveryReady: Boolean(s.delivery_policy_configured),
  }
}

export function deriveAppStatus(status: StatusPayload | null, catalog: CatalogPayload | null): AppStatus {
  const persistence = status?.readiness?.persistence ?? catalog?.readiness?.persistence ?? 'unconfigured'
  // `error` means DATABASE_URL was set but init failed — still not connected; never treat as healthy.
  const database: AppStatus['database'] =
    persistence === 'postgres' || persistence === 'memory' ? 'connected' : 'not_connected'

  const flags = asFlags(status?.settings ?? catalog?.settings ?? null)
  const activation = flags.activation
  const checkout = flags.checkout
  const paymentReady = flags.paymentReady
  const deliveryReady = flags.deliveryReady

  let catalogue: AppStatus['catalogue'] = 'unavailable'
  if (database === 'connected') {
    const products = catalog?.products ?? []
    catalogue = products.length > 0 ? 'draft' : 'draft'
    // Published only when commercial activation is on and products exist for sale path.
    if (activation && products.length > 0) catalogue = 'published'
  }

  const payments: AppStatus['payments'] =
    database === 'connected' && activation && checkout && paymentReady && deliveryReady ? 'on' : 'off'

  const fullyLive = database === 'connected' && catalogue === 'published' && payments === 'on'

  return {
    database,
    catalogue,
    payments,
    showChip: !fullyLive,
    canSignIn: database === 'connected',
    canOrder: payments === 'on',
    message: {
      database: database === 'connected' ? 'Connected' : 'Not connected',
      catalogue: catalogue === 'published' ? 'Published' : catalogue === 'draft' ? 'Draft' : 'Unavailable',
      payments: payments === 'on' ? 'On' : 'Off',
    },
  }
}
