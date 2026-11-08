import { Navigate, Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { DemoAdmin } from './demo/DemoAdmin'
import { DemoDistributor } from './demo/DemoDistributor'
import { DemoLayout } from './demo/DemoLayout'
import { DemoNetwork } from './demo/DemoNetwork'
import { DemoShop } from './demo/DemoShop'
import { Admin } from './pages/Admin'
import { Distributor } from './pages/Distributor'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Recover } from './pages/Recover'
import { Network } from './pages/Network'
import { Order } from './pages/Order'
import { Shop } from './pages/Shop'
import './components/SiteChrome.css'

export default function App() {
  return (
    <>
      <div className="site-chrome">
        <Nav />
      </div>
      <div id="main">
        <Routes>
          {/* Password-free fixture journey — isolated from real APIs/sessions */}
          <Route path="/demo" element={<DemoLayout />}>
            <Route index element={<Navigate to="shop" replace />} />
            <Route path="shop" element={<DemoShop />} />
            <Route path="network" element={<DemoNetwork />} />
            <Route path="referrals" element={<Navigate to="/demo/network" replace />} />
            <Route path="distributor" element={<DemoDistributor />} />
            <Route path="admin" element={<DemoAdmin />} />
          </Route>

          {/* Live preview store (SSO only; no app login for browse/preview review) */}
          <Route path="/" element={<Navigate to="/shop" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/order" element={<Order />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recover" element={<Recover />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/distributor" element={<Distributor />} />
          <Route path="/network" element={<Network />} />
          <Route path="/referrals" element={<Navigate to="/network" replace />} />
          <Route path="/club" element={<Navigate to="/network" replace />} />
          <Route path="/label" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/shop" replace />} />
        </Routes>
      </div>
      <Footer />
    </>
  )
}
