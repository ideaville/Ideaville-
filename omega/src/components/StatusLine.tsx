import './StatusLine.css'

type Props = {
  tone?: 'neutral' | 'warn' | 'error'
  children: string
}

export function StatusLine({ tone = 'neutral', children }: Props) {
  return (
    <p className={`status-line status-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
