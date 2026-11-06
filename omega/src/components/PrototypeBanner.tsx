import './PrototypeBanner.css'

export function PrototypeBanner() {
  return (
    <aside className="proto-banner" role="status" aria-live="polite">
      <div className="shell proto-banner-inner">
        <strong>Prototype — not for production or sale.</strong>
        <span>
          No live payments, signups, or payouts. Petrol-only concept. Nigeria-first market framing; UK
          deferred. Efficacy, dose, retail volume, and network economics are pending owner approval.
        </span>
      </div>
    </aside>
  )
}
