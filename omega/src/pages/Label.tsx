import { useState } from 'react'
import { directions, storage, warnings } from '../data/product'
import './Label.css'

type Face = 'front' | 'back'

export function Label() {
  const [face, setFace] = useState<Face>('front')

  return (
    <main className="section label-page">
      <div className="shell">
        <div className="section-head">
          <p className="eyebrow">Label prototype</p>
          <h2>Visual identity — not manufacturing artwork.</h2>
          <p className="lede">
            Text-only gold OMEGA (no Ω), PERFORMANCE ADDITIVES, restrained volt divider, PETROL ONLY,
            strong spacing. Matte-black longneck/grip bottle is the preferred concept. This is a design
            concept — not for production, print release, or retail labelling.
          </p>
        </div>

        <div className="label-stage">
          <div className="label-viewer">
            <div className="label-toggle" role="tablist" aria-label="Label face">
              <button
                type="button"
                role="tab"
                aria-selected={face === 'front'}
                className={face === 'front' ? 'is-active' : undefined}
                onClick={() => setFace('front')}
              >
                Front
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={face === 'back'}
                className={face === 'back' ? 'is-active' : undefined}
                onClick={() => setFace('back')}
              >
                Back
              </button>
            </div>
            <div className="label-frame" key={face}>
              <img
                src={face === 'front' ? '/labels/front-label.svg' : '/labels/back-label.svg'}
                alt={
                  face === 'front'
                    ? 'OMEGA front label prototype — design concept not for production'
                    : 'OMEGA back label prototype with placeholder directions — not for production'
                }
              />
            </div>
            <p className="label-note">
              SVG previews for internal review only. Production-ready downloads are intentionally not
              offered.
            </p>
          </div>

          <div className="label-copy">
            <article>
              <h3>Directions (pending)</h3>
              <ul>
                {directions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Storage (draft)</h3>
              <ul>
                {storage.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Warnings (incomplete)</h3>
              <ul className="warn-list">
                {warnings.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
            <aside className="print-spec">
              <p className="eyebrow">Artwork status</p>
              <p>
                No fabricated certifications, hazard pictograms, barcodes, or batch codes. Closure /
                material / filled-bottle compatibility unverified. SDS draft is lab-only — not retail
                clearance.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
