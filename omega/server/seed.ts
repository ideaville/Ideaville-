import { newId, nowIso } from './crypto.ts'
import type { OmegaStore } from './store/types.ts'

/**
 * Historic draft reference data from recovered records — NOT live approved commerce.
 * - Oct 17 draft: retail NGN 6,500 / trade NGN 4,500 per 50ml (stored as kobo)
 * - 30ml sample non-saleable
 * - Olusegun Kay as distribution/validation partner (pending terms; not admin)
 * - Volume 30 vs 50 unresolved → no SKU auto-approved for sale
 */
export async function seedHistoricDrafts(store: OmegaStore) {
  const distributors = await store.listDistributors()
  if (!distributors.some((d) => d.code === 'KAY-PARTNER')) {
    await store.createDistributor({
      id: newId(),
      name: 'Olusegun Kay',
      code: 'KAY-PARTNER',
      status: 'pending_terms',
      notes:
        'Distribution/validation partner for Ideaville Enterprise (Nigeria). Not an app admin. No invented contact details. Terms not yet on file.',
      created_at: nowIso(),
    })
  }

  const products = await store.listProducts()
  if (!products.some((p) => p.sku === 'OMEGA-50ML-DRAFT')) {
    const bottle = await store.createProduct({
      id: newId(),
      sku: 'OMEGA-50ML-DRAFT',
      name: 'OMEGA Performance Additive 50ml (draft SKU)',
      volume_ml: 50,
      kind: 'bottle',
      channel_eligibility: { retail: true, trade: true },
      saleable: false,
      approved_for_sale: false,
      description:
        'Historic draft configuration only (Oct 2026 notes). Volume 30 vs 50 unresolved — admin must approve saleable SKU/price/stock before checkout. Petrol only. No dosage published as approved.',
      created_at: nowIso(),
    })
    await store.createPrice({
      id: newId(),
      product_id: bottle.id,
      channel: 'retail',
      amount_kobo: 6500_00,
      currency: 'NGN',
      status: 'draft',
      label: 'Oct 17 2026 historic draft retail — NOT live approved',
      effective_from: null,
      approved_by: null,
      created_at: nowIso(),
    })
    await store.createPrice({
      id: newId(),
      product_id: bottle.id,
      channel: 'trade',
      amount_kobo: 4500_00,
      currency: 'NGN',
      status: 'draft',
      label: 'Oct 17 2026 historic draft trade — NOT live approved',
      effective_from: null,
      approved_by: null,
      created_at: nowIso(),
    })
  }

  if (!products.some((p) => p.sku === 'OMEGA-30ML-SAMPLE')) {
    await store.createProduct({
      id: newId(),
      sku: 'OMEGA-30ML-SAMPLE',
      name: 'OMEGA 30ml sample (non-saleable)',
      volume_ml: 30,
      kind: 'sample',
      channel_eligibility: { retail: false, trade: false },
      saleable: false,
      approved_for_sale: false,
      description: 'Samples are non-saleable. Not a retail SKU.',
      created_at: nowIso(),
    })
  }

  // Explicit empty commission — no fabricated default rate.
  const terms = await store.listTerms()
  if (!terms.some((t) => t.notes.includes('NO DEFAULT RATE'))) {
    await store.createTerm({
      id: newId(),
      distributor_id: null,
      kind: 'commission',
      rate_bps: null,
      notes:
        'NO DEFAULT RATE. Commission separate from wholesale resale margin. Activate only with explicit admin-approved rate_bps. No equity/residual promises.',
      status: 'draft',
      approved_by: null,
      created_at: nowIso(),
    })
  }
}
