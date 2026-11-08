import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEMO_LOOKUP_CODES,
  DEMO_PRODUCT_BOTTLE,
  createInitialDemoAdminOverview,
  createInitialDemoNetwork,
  createInitialDemoOrders,
} from '../src/demo/fixtures.ts'
import { canPreviewBrowse, displayUnitKobo } from '../src/lib/previewStore.ts'

describe('demo fixtures (password-free journey)', () => {
  it('ships bottle SKU usable for preview browse with prices', () => {
    assert.equal(DEMO_PRODUCT_BOTTLE.kind, 'bottle')
    assert.ok(canPreviewBrowse(DEMO_PRODUCT_BOTTLE, false))
    const price = displayUnitKobo(DEMO_PRODUCT_BOTTLE, 'retail', false)
    assert.ok(price)
    assert.equal(price.amount_kobo, 6500_00)
  })

  it('includes network referral code and lookup map without inventing commission rates', () => {
    const network = createInitialDemoNetwork()
    assert.equal(network.self.referral_code, 'DEMO-LAGOS')
    assert.ok(network.referrals.length >= 1)
    assert.equal(network.terms[0]?.rate_bps, null)
    assert.equal(DEMO_LOOKUP_CODES['DEMO-LAGOS']?.status, 'active')
  })

  it('seeds admin overview with activation gates off and demo orders/stock', () => {
    const admin = createInitialDemoAdminOverview()
    const settings = admin.settings as Record<string, unknown>
    assert.equal(settings.commercial_activation, false)
    assert.equal(settings.checkout_enabled, false)
    assert.equal(settings.payment_provider_configured, false)
    assert.ok((admin.orders as unknown[]).length >= 1)
    assert.ok((admin.batches as unknown[]).length >= 1)
    assert.ok(createInitialDemoOrders().length >= 1)
  })
})
