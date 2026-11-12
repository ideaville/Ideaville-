import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CatalogProduct } from '../src/lib/api.ts'
import {
  canPreviewBrowse,
  displayUnitKobo,
  liveUnitKobo,
  previewUnitKobo,
} from '../src/lib/previewStore.ts'

function product(partial: Partial<CatalogProduct> & Pick<CatalogProduct, 'sku' | 'kind'>): CatalogProduct {
  return {
    id: partial.id ?? 'p1',
    sku: partial.sku,
    name: partial.name ?? partial.sku,
    volume_ml: partial.volume_ml ?? 50,
    kind: partial.kind,
    saleable: partial.saleable ?? false,
    approved_for_sale: partial.approved_for_sale ?? false,
    channel_eligibility: partial.channel_eligibility ?? { retail: true, trade: true },
    description: partial.description ?? '',
    prices: partial.prices ?? [],
  }
}

describe('preview storefront helpers', () => {
  const draftBottle = product({
    sku: 'OMEGA-50ML-DRAFT',
    kind: 'bottle',
    prices: [
      { id: '1', channel: 'retail', amount_kobo: 6500_00, currency: 'NGN', status: 'draft', label: 'draft' },
      { id: '2', channel: 'trade', amount_kobo: 4500_00, currency: 'NGN', status: 'draft', label: 'draft' },
    ],
  })

  const sample = product({
    sku: 'OMEGA-30ML-SAMPLE',
    kind: 'sample',
    prices: [],
  })

  const liveBottle = product({
    sku: 'OMEGA-LIVE',
    kind: 'bottle',
    saleable: true,
    approved_for_sale: true,
    prices: [
      { id: '3', channel: 'retail', amount_kobo: 7000_00, currency: 'NGN', status: 'active', label: 'live' },
    ],
  })

  it('exposes draft retail price only in preview mode', () => {
    assert.equal(liveUnitKobo(draftBottle, 'retail'), null)
    assert.deepEqual(previewUnitKobo(draftBottle, 'retail'), {
      amount_kobo: 6500_00,
      status: 'draft',
      preview: true,
    })
    assert.deepEqual(displayUnitKobo(draftBottle, 'retail', false), {
      amount_kobo: 6500_00,
      status: 'draft',
      preview: true,
    })
    assert.equal(displayUnitKobo(draftBottle, 'retail', true), null)
  })

  it('keeps samples out of preview browse/order', () => {
    assert.equal(previewUnitKobo(sample, 'retail'), null)
    assert.equal(canPreviewBrowse(sample, false), false)
    assert.equal(canPreviewBrowse(draftBottle, false), true)
  })

  it('uses live active price when commerce canOrder', () => {
    assert.equal(liveUnitKobo(liveBottle, 'retail'), 7000_00)
    assert.deepEqual(displayUnitKobo(liveBottle, 'retail', true), {
      amount_kobo: 7000_00,
      status: 'active',
      preview: false,
    })
    assert.equal(canPreviewBrowse(liveBottle, true), true)
  })
})
