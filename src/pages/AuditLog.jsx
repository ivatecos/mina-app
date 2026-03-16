import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ClipboardList, RefreshCw } from 'lucide-react'

const ACCION_STYLES = {
  'CREÓ':    'bg-green-50 text-green-700 border-green-200',
  'EDITÓ':   'bg-blue-50 text-blue-700 border-blue-200',
  'ELIMINÓ': 'bg-red-50 text-red-600 border-red-200',
}

const MODULO_LABELS = {
  picadores: 'Picadores', frenteros: 'Frenteros', ventilacion: 'Ventilación',
  cocheros: 'Cocheros', gastos: 'Gastos', cortes: 'Cortes', personal: 'Personal',
}

const formatTs = (ts) => {
  if (!ts) return { fecha: '', hora: '' }
  const d = new Date(ts)
  return {
    fecha: d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
  }
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroModulo, setFiltroModulo] = useState('todos')
  const [filtroAccion, setFiltroAccion] = useState('todos')

  useEffect(() => {
    load()
    // Suscripción en tiempo real
    const channel = supabase
      .channel('audit_log_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
        setLogs(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    setLogs(data || [])
    setLoading(false)
  }

  const filtered = logs.filter(l =>
    (filtroModulo === 'todos' || l.modulo === filtroModulo) &&
    (filtroAccion === 'todos' || l.accion === filtroAccion)
  )

  const modulos = [...new Set(logs.map(l => l.modulo))].sort()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-mine-accent" />
          <h1 className="text-2xl font-bold text-mine-text">Log de Auditoría</h1>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="card bg-blue-50 border-blue-200 text-sm text-blue-700">
        Registro en tiempo real de todas las acciones realizadas en el sistema. Solo visible para administradores.
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-mine-muted text-sm">Módulo:</span>
          <select
            className="input py-1 text-sm w-auto"
            value={filtroModulo}
            onChange={e => setFiltroModulo(e.target.value)}
          >
            <option value="todos">Todos</option>
            {modulos.map(m => <option key={m} value={m}>{MODULO_LABELS[m] || m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-mine-muted text-sm">Acción:</span>
          <select
            className="input py-1 text-sm w-auto"
            value={filtroAccion}
            onChange={e => setFiltroAccion(e.target.value)}
          >
            <option value="todos">Todas</option>
            <option value="CREÓ">CREÓ</option>
            <option value="EDITÓ">EDITÓ</option>
            <option value="ELIMINÓ">ELIMINÓ</option>
          </select>
        </div>
        <span className="text-mine-muted text-xs ml-auto">{filtered.length} registros</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-mine-muted">Cargando...</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mine-border bg-slate-50">
                <th className="text-left px-4 py-3 text-mine-muted font-medium">Fecha y Hora</th>
                <th className="text-left px-4 py-3 text-mine-muted font-medium">Usuario</th>
                <th className="text-center px-4 py-3 text-mine-muted font-medium">Acción</th>
                <th className="text-left px-4 py-3 text-mine-muted font-medium">Módulo</th>
                <th className="text-left px-4 py-3 text-mine-muted font-medium">Corte</th>
                <th className="text-left px-4 py-3 text-mine-muted font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className="border-b border-mine-border/50 hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(() => { const { fecha, hora } = formatTs(log.created_at); return (<><div className="text-xs text-mine-text font-medium">{fecha}</div><div className="text-xs text-mine-muted">{hora}</div></>) })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-mine-text">{log.usuario_email}</div>
                    <div className="text-xs text-mine-muted capitalize">{log.usuario_rol}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${ACCION_STYLES[log.accion] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {log.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mine-text font-medium capitalize">
                    {MODULO_LABELS[log.modulo] || log.modulo}
                  </td>
                  <td className="px-4 py-3 text-mine-muted text-xs">{log.corte_nombre || '—'}</td>
                  <td className="px-4 py-3 text-mine-muted text-xs max-w-xs">{log.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="text-center py-16 text-mine-muted">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
              <p>No hay registros de auditoría todavía.</p>
              <p className="text-xs mt-1">Las acciones de crear, editar y eliminar aparecerán aquí.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
