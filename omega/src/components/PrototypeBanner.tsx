import './PrototypeBanner.css'

export function PrototypeBanner() {
  return (
    <aside className="proto-banner" role="status" aria-live="polite">
      <div className="shell proto-banner-inner">
        <strong>Prototype — not for production or sale.</strong>
        <span>
          Ideaville Enterprise · petrol only · Nigeria first. Shop/checkout fail closed until admin
          activation. No live payments, fabricated commissions, or efficacy claims. App login ≠ Vercel SSO.
        </span>
      </div>
    </aside>
  )
}
