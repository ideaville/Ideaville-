import { copy } from '../lib/copy'
import './Footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-bar">{copy.footer}</div>
    </footer>
  )
}
