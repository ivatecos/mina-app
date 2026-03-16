import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Layers, Settings, Users, Pickaxe,
  Wind, Construction, Truck, Receipt, BarChart3, LogOut, HardHat
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

export default function Sidebar() {
  const { userRole, clearUser } = useStore()
  const navigate = useNavigate()
  const nav = userRole === 'administrador' ? adminNav : ministrNav

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearUser()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-mine-surface border-r border-mine-border flex flex-col z-30">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-mine-border">
        <HardHat className="text-mine-accent" size={24} />
        <span className="font-bold text-mine-text text-lg">MinaApp</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-mine-accent/10 text-mine-accent border-r-2 border-mine-accent'
                  : 'text-mine-muted hover:text-mine-text hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-mine-border p-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-mine-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
