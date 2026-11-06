import { Navigate, Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { PrototypeBanner } from './components/PrototypeBanner'
import { Club } from './pages/Club'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { Label } from './pages/Label'
import { Wealth } from './pages/Wealth'
import './components/SiteChrome.css'

export default function App() {
  return (
    <>
      <div className="site-chrome">
        <PrototypeBanner />
        <Nav />
      </div>
      <div id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/label" element={<Label />} />
          <Route path="/club" element={<Club />} />
          <Route path="/wealth" element={<Wealth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </>
  )
}
