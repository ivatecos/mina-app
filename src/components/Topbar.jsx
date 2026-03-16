import { Bell, User } from 'lucide-react'
import useStore from '../store/useStore'
import { ESTADO_COLORS } from '../lib/utils'

export default function Topbar() {
  const { corteActivo, user, userRole } = useStore()

  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-mine-surface border-b border-mine-border flex items-center px-6 gap-4 z-20">
      <div className="flex-1">
        {corteActivo ? (
          <div className="flex items-center gap-3">
            <span className="text-mine-muted text-sm">Corte activo:</span>
            <span className="text-mine-text font-medium text-sm">{corteActivo.nombre}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${ESTADO_COLORS.abierto}`}>
              Abierto
            </span>
          </div>
        ) : (
          <span className="text-mine-muted text-sm italic">Sin corte activo</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-mine-muted capitalize border border-mine-border px-2 py-1 rounded">
          {userRole}
        </span>
        <div className="flex items-center gap-2 text-mine-muted">
          <User size={18} />
          <span className="text-sm text-mine-text">{user?.email?.split('@')[0] || 'Usuario'}</span>
        </div>
      </div>
    </header>
  )
}
