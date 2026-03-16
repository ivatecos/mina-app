import useStore from '../store/useStore'
import { formatCOP } from '../lib/utils'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export default function DashboardMinistro() {
  const { corteActivo, user } = useStore()

  if (!corteActivo) return (
    <div className="flex flex-col items-center justify-center py-24 text-mine-muted">
      <AlertTriangle size={48} className="mb-4 opacity-40" />
      <p className="text-lg font-medium">No hay corte activo</p>
      <p className="text-sm">El administrador debe abrir un corte para comenzar.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <CheckCircle className="text-yellow-400" size={24} />
        <div>
          <h1 className="text-xl font-bold text-mine-text">{corteActivo.nombre}</h1>
          <p className="text-mine-muted text-sm">{corteActivo.fecha_inicio} — {corteActivo.fecha_fin}</p>
        </div>
      </div>

      <div className="card bg-mine-accent/5 border-mine-accent/20">
        <div className="text-mine-muted text-xs mb-1">Precio carbón este corte</div>
        <div className="text-2xl font-bold text-mine-accent">{formatCOP(corteActivo.precio_carbon_ton)}<span className="text-sm font-normal">/ton</span></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a href="/picadores" className="card hover:border-mine-accent/40 transition-colors text-center py-6">
          <div className="text-3xl mb-2">⛏️</div>
          <div className="font-semibold text-mine-text">Picadores</div>
          <div className="text-xs text-mine-muted mt-1">Registrar coches</div>
        </a>
        <a href="/frenteros" className="card hover:border-mine-accent/40 transition-colors text-center py-6">
          <div className="text-3xl mb-2">🏗️</div>
          <div className="font-semibold text-mine-text">Frenteros</div>
          <div className="text-xs text-mine-muted mt-1">Avance y patios</div>
        </a>
        <a href="/ventilacion" className="card hover:border-mine-accent/40 transition-colors text-center py-6">
          <div className="text-3xl mb-2">🌬️</div>
          <div className="font-semibold text-mine-text">Ventilación</div>
          <div className="text-xs text-mine-muted mt-1">Metros avanzados</div>
        </a>
        <a href="/cocheros" className="card hover:border-mine-accent/40 transition-colors text-center py-6">
          <div className="text-3xl mb-2">🛤️</div>
          <div className="font-semibold text-mine-text">Cocheros</div>
          <div className="text-xs text-mine-muted mt-1">Coches sacados</div>
        </a>
        <a href="/gastos" className="card hover:border-mine-accent/40 transition-colors text-center py-6 col-span-2">
          <div className="text-3xl mb-2">🧾</div>
          <div className="font-semibold text-mine-text">Gastos</div>
          <div className="text-xs text-mine-muted mt-1">Registrar gastos del corte</div>
        </a>
      </div>
    </div>
  )
}
