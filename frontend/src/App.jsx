import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Info, LayoutDashboard, Map as MapIcon, Wind } from 'lucide-react'
import MapPage from './pages/MapPage'
import Dashboard from './pages/Dashboard'
import About from './pages/About'

const links = [
  { to: '/', label: 'Map', icon: MapIcon },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/about', label: 'About', icon: Info },
]

function Navbar() {
  return (
    <nav className="sticky top-0 z-[2000] flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur md:px-8">
      <NavLink to="/" className="flex items-center gap-2.5">
        <span className="rounded-lg bg-blue-600 p-2"><Wind size={18} className="text-white" /></span>
        <span className="text-lg font-black tracking-tight text-white">SkySentry</span>
        <span className="hidden text-xs text-slate-500 sm:inline">Bagmati air quality</span>
      </NavLink>
      <div className="flex gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Icon size={16} /><span className="hidden sm:inline">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
