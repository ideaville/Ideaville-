import { Navigate, Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { Club } from './pages/Club'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { Label } from './pages/Label'
import { Wealth } from './pages/Wealth'

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/label" element={<Label />} />
        <Route path="/club" element={<Club />} />
        <Route path="/wealth" element={<Wealth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  )
}
