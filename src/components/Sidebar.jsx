import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Layers, Settings, Users, Pickaxe,
  Wind, Construction, Truck, Receipt, BarChart3, LogOut, HardHat, X
} from 'lucide-react'
import useStore from '../store/useStore'
import { supabase } from '../lib/supabase'

const adminNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cortes', icon: Layers, label: 'Cortes' },
  { to: '/picadores', icon: Pickaxe, label: 'Picadores' },
  { to: '/frenteros', icon: Construction, label: 'Frenteros' },
  { to: '/ventilacion', icon: Wind, label: 'Ventilación' },
  { to: '/cocheros', icon: Truck, label: 'Cocheros' },
  { to: '/personal', icon: Users, label: 'Personal Op.' },
  { to: '/gastos', icon: Receipt, label: 'Gastos' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/tarifas', icon: Settings, label: 'Tarifas' },
]

const ministrNav = [
  { to: '/ministro', icon: LayoutDashboard, label: 'Mi Turno' },
  { to: '/picadores', icon: Pickaxe, label: 'Picadores' },
  { to: '/frenteros', icon: Construction, label: 'Frenteros' },
  { to: '/ventilacion', icon: Wind, label: 'Ventilación' },
  { to: '/cocheros', icon: Truck, label: 'Cocheros' },
  { to: '/gastos', icon: Receipt, label: 'Gastos' },
]

export default function Sidebar({ open, onClose }) {
  const { userRole, user, clearUser } = useStore()
  const navigate = useNavigate()
  const nav = userRole === 'administrador' ? adminNav : ministrNav
  const initial = (user?.email?.[0] || 'U').toUpperCase()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearUser()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (onClose) onClose()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 top-0 h-full w-60 bg-mine-surface border-r border-mine-border flex flex-col z-40 transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-mine-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-mine-accent flex items-center justify-center">
              <HardHat size={18} className="text-slate-900" />
            </div>
            <span className="font-bold text-mine-text text-base">MinaApp</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-mine-muted hover:text-mine-text rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar / user info */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-mine-border">
          <div className="w-10 h-10 rounded-full bg-mine-accent flex items-center justify-center text-slate-900 font-bold text-base flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-mine-text truncate">
              {user?.email?.split('@')[0] || 'Usuario'}
            </p>
            <p className="text-xs text-mine-muted capitalize">{userRole}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 px-3 py-2.5 text-sm rounded-lg transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-mine-accent text-slate-900 font-semibold'
                    : 'text-mine-muted hover:text-mine-text hover:bg-white/5'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-mine-border p-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-mine-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  )
}
