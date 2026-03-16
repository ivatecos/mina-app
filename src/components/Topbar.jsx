import { Menu } from 'lucide-react'
import useStore from '../store/useStore'
import { ESTADO_COLORS } from '../lib/utils'

export default function Topbar({ onMenuToggle }) {
  const { corteActivo } = useStore()

  return (
    <header className="fixed top-0 left-0 lg:left-60 right-0 h-14 bg-mine-surface border-b border-mine-border flex items-center px-4 gap-3 z-20">
      {/* Hamburger - mobile only */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 text-mine-muted hover:text-mine-text rounded-lg hover:bg-white/5 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Corte activo info */}
      <div className="flex-1 min-w-0">
        {corteActivo ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-mine-muted text-sm hidden sm:inline">Corte activo:</span>
            <span className="text-mine-text font-medium text-sm truncate">{corteActivo.nombre}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${ESTADO_COLORS.abierto}`}>
              Abierto
            </span>
          </div>
        ) : (
          <span className="text-mine-muted text-sm italic">Sin corte activo</span>
        )}
      </div>
    </header>
  )
}
