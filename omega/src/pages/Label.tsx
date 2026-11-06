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
          <p className="eyebrow">Label system</p>
          <h2>Production-ready brand face.</h2>
          <p className="lede">
            Matte black field, metallic gold wordmark, electric blue rule, and disciplined hierarchy —
            ready for print and digital packaging.
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
                alt={face === 'front' ? 'OMEGA front label' : 'OMEGA back label'}
              />
            </div>
            <div className="label-downloads">
              <a className="btn btn-ghost" href="/labels/front-label.svg" download>
                Download front SVG
              </a>
              <a className="btn btn-ghost" href="/labels/back-label.svg" download>
                Download back SVG
              </a>
            </div>
          </div>

          <div className="label-copy">
            <article>
              <h3>Directions</h3>
              <ol>
                {directions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </article>
            <article>
              <h3>Storage</h3>
              <ul>
                {storage.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Warnings</h3>
              <ul className="warn-list">
                {warnings.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
            <aside className="print-spec">
              <p className="eyebrow">Print specs</p>
              <p>Die: 80 × 120 mm with 3 mm bleed · Spot gold optional · Pantone-approx volt #00A8E8 · Matte laminate</p>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
