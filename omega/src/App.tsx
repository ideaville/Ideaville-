import { Navigate, Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { Admin } from './pages/Admin'
import { Distributor } from './pages/Distributor'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
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
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/order" element={<Order />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/distributor" element={<Distributor />} />
          <Route path="/label" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </>
  )
}
