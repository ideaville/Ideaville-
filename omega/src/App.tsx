import { Navigate, Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { PrototypeBanner } from './components/PrototypeBanner'
import { Admin } from './pages/Admin'
import { Distributor } from './pages/Distributor'
import { Home } from './pages/Home'
import { Label } from './pages/Label'
import { Login } from './pages/Login'
import { Shop } from './pages/Shop'
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
          <Route path="/shop" element={<Shop />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/distributor" element={<Distributor />} />
          <Route path="/club" element={<Navigate to="/shop" replace />} />
          <Route path="/wealth" element={<Navigate to="/shop" replace />} />
          <Route path="/dashboard" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </>
  )
}
