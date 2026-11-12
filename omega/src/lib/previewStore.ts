import type { CatalogProduct } from './api'

/**
 * Preview storefront helpers — client UX only when live commerce is off.
 * Never enables real checkout, payments, stock, or admin bypass.
 */

export type PreviewPricePick = {
  amount_kobo: number
  status: string
  preview: boolean
}

/** Live retail/trade path: active price only when product is approved for sale. */
export function liveUnitKobo(
  product: CatalogProduct,
  channel: 'retail' | 'trade',
): number | null {
  if (!product.approved_for_sale) return null
  const price = product.prices.find((p) => p.channel === channel && p.status === 'active')
  return price?.amount_kobo ?? null
}

/**
 * When orders are off, surface draft (or active) channel prices for browse/review only.
 * Samples stay out of the preview order path.
 */
export function previewUnitKobo(
  product: CatalogProduct,
  channel: 'retail' | 'trade',
): PreviewPricePick | null {
  if (product.kind === 'sample') return null
  const active = product.prices.find((p) => p.channel === channel && p.status === 'active')
  if (active) return { amount_kobo: active.amount_kobo, status: active.status, preview: true }
  const draft = product.prices.find((p) => p.channel === channel && p.status === 'draft')
  if (draft) return { amount_kobo: draft.amount_kobo, status: draft.status, preview: true }
  return null
}

export function displayUnitKobo(
  product: CatalogProduct,
  channel: 'retail' | 'trade',
  canOrder: boolean,
): PreviewPricePick | null {
  if (canOrder) {
    const live = liveUnitKobo(product, channel)
    return live == null ? null : { amount_kobo: live, status: 'active', preview: false }
  }
  return previewUnitKobo(product, channel)
}

/** Browse/order CTA enabled for preview journey (not samples) when commerce is off. */
export function canPreviewBrowse(product: CatalogProduct, canOrder: boolean): boolean {
  if (canOrder) {
    return product.saleable && product.approved_for_sale && liveUnitKobo(product, 'retail') != null
  }
  return product.kind !== 'sample' && previewUnitKobo(product, 'retail') != null
}
