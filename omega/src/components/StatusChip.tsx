import { useEffect, useId, useRef, useState } from 'react'
import { copy } from '../lib/copy'
import type { AppStatus } from '../lib/appStatus'
import './StatusChip.css'

type Props = { status: AppStatus }

export function StatusChip({ status }: Props) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!status.showChip) return null

  return (
    <div className="status-chip-wrap" ref={rootRef}>
      <button
        type="button"
        className="status-chip"
        data-testid="status-chip"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((v) => !v)}
      >
        {copy.preview}
      </button>
      {open ? (
        <div className="status-popover" id={popoverId} role="dialog" aria-label="Preview status" data-testid="status-popover">
          <dl>
            <div>
              <dt>Database</dt>
              <dd>{status.message.database}</dd>
            </div>
            <div>
              <dt>Catalogue</dt>
              <dd>{status.message.catalogue}</dd>
            </div>
            <div>
              <dt>Payments</dt>
              <dd>{status.message.payments}</dd>
            </div>
          </dl>
          <p className="status-safety">{copy.safetyPetrol}</p>
        </div>
      ) : null}
    </div>
  )
}
