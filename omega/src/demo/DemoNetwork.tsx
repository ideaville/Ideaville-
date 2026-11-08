import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { StatusLine } from '../components/StatusLine'
import { copy } from '../lib/copy'
import { useDemo } from './DemoContext'
import '../pages/Admin.css'
import '../pages/Network.css'

/** Fixture-backed network / referral UI — no distributor session, no DB writes. */
export function DemoNetwork() {
  const demo = useDemo()
  const data = demo.network
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lookupCode, setLookupCode] = useState('DEMO-LAGOS')
  const [lookupResult, setLookupResult] = useState('')

  async function onRecord(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      await demo.recordReferral({ prospect_label: label, notes })
      setLabel('')
      setNotes('')
      setMessage('Demo referral recorded (session only)')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record referral')
    }
  }

  async function onLookup(event: FormEvent) {
    event.preventDefault()
    setLookupResult('')
    const res = await demo.lookupReferral(lookupCode)
    if (!res.found) {
      setLookupResult('Code not found or distributor unavailable.')
      return
    }
    setLookupResult(`${res.name} · ${res.referral_code} · ${res.status}`)
  }

  return (
    <main className="section network-page" data-testid="demo-network">
      <div className="shell">
        <header className="page-head">
          <h1>{copy.network}</h1>
          <p className="meta">{data.self.name} · demo fixture</p>
        </header>

        {error ? <StatusLine tone="error">{error}</StatusLine> : null}
        {message ? <StatusLine>{message}</StatusLine> : null}

        <section className="network-panel" aria-labelledby="referral-heading">
          <h2 id="referral-heading">{copy.referralCode}</h2>
          <p className="mono referral-code" data-testid="referral-code">
            {data.self.referral_code}
          </p>
          <p className="meta">
            Status {data.self.status}
            {data.self.sponsor_id ? ' · sponsor linked' : ' · no sponsor on file'}
          </p>
          <p className="meta">
            Demo share link shape:{' '}
            <span className="mono">/demo/shop?ref={data.self.referral_code}</span>
          </p>
        </section>

        <section className="network-panel" aria-labelledby="record-heading">
          <h2 id="record-heading">{copy.recordReferral}</h2>
          <form className="network-form" onSubmit={onRecord} data-testid="form-referral">
            <div className="field" data-testid="field-prospect-label">
              <label htmlFor="prospect-label">{copy.prospectLabel}</label>
              <input
                id="prospect-label"
                name="prospect_label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="referral-notes">Notes</label>
              <input id="referral-notes" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </div>
            <button type="submit" className="btn btn-primary" data-testid="btn-record-referral">
              {copy.recordReferral}
            </button>
          </form>
        </section>

        <section className="network-panel" aria-label={copy.referrals}>
          <h2>{copy.referrals}</h2>
          {data.referrals.length === 0 ? (
            <p className="meta" role="status" data-testid="empty-referrals">
              {copy.noReferrals}
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table stack-mobile" data-testid="table-referrals">
                <thead>
                  <tr>
                    <th scope="col">Label</th>
                    <th scope="col">Code</th>
                    <th scope="col">Status</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map((row) => (
                    <tr key={row.id}>
                      <td data-label="Label">{row.prospect_label}</td>
                      <td data-label="Code" className="mono">
                        {row.code}
                      </td>
                      <td data-label="Status">{row.status}</td>
                      <td data-label="Date" className="mono">
                        {row.created_at.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="network-panel" aria-label="Sponsored distributors">
          <h2>Sponsored</h2>
          <div className="table-wrap">
            <table className="data-table stack-mobile" data-testid="table-sponsored">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Code</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.sponsored.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Name">{row.name}</td>
                    <td data-label="Code" className="mono">
                      {row.code}
                    </td>
                    <td data-label="Status">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="network-panel" aria-label={copy.terms}>
          <h2>{copy.terms}</h2>
          <div className="table-wrap">
            <table className="data-table stack-mobile" data-testid="table-terms">
              <thead>
                <tr>
                  <th scope="col">Kind</th>
                  <th scope="col">Status</th>
                  <th scope="col">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.terms.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Kind">{t.kind}</td>
                    <td data-label="Status">{t.status}</td>
                    <td data-label="Rate" className="mono">
                      {t.rate_bps == null ? '—' : `${(t.rate_bps / 100).toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="meta">{data.commercial_note}</p>
        </section>

        <section className="network-panel" aria-labelledby="lookup-heading">
          <h2 id="lookup-heading">Lookup code</h2>
          <form className="network-form" onSubmit={onLookup}>
            <div className="field">
              <label htmlFor="lookup-code">Code</label>
              <input id="lookup-code" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} className="mono" />
            </div>
            <button type="submit" className="btn btn-secondary">
              Lookup
            </button>
          </form>
          {lookupResult ? <p className="meta">{lookupResult}</p> : null}
        </section>

        <p className="meta">
          <Link to="/demo/distributor">{copy.orders}</Link>
        </p>
      </div>
    </main>
  )
}
