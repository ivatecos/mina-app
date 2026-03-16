import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP } from '../lib/utils'

const emptyForm = { fecha: '', metros_avanzados: 0, valor_metro: 350000, patios_hechos: 0, valor_patio: 950000 }
const emptyTurno = { modulo: 'frenteros', frente: 'frente1', tipo: 'turno', descripcion: '', cantidad: 1, valor_unitario: 80000, valor_total: 80000 }

export default function Frenteros() {
  const { corteActivo, user, addToast } = useStore()
  const [registros, setRegistros] = useState([])
  const [turnos, setTurnos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showTurno, setShowTurno] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [turnoForm, setTurnoForm] = useState(emptyTurno)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (corteActivo) load() }, [corteActivo])

  const load = async () => {
    const { data: r } = await supabase.from('frenteros_registros').select('*').eq('corte_id', corteActivo.id).order('fecha', { ascending: false })
    const { data: t } = await supabase.from('turnos_bonificaciones').select('*').eq('corte_id', corteActivo.id).eq('modulo', 'frenteros').order('created_at', { ascending: false })
    setRegistros(r || [])
    setTurnos(t || [])
  }

  const calcPago = (r) => r.metros_avanzados * r.valor_metro + r.patios_hechos * r.valor_patio

  const totales = registros.reduce((acc, r) => ({
    metros: acc.metros + r.metros_avanzados,
    patios: acc.patios + r.patios_hechos,
    pago: acc.pago + calcPago(r),
  }), { metros: 0, patios: 0, pago: 0 })

  const totalTurnos = turnos.reduce((a, t) => a + t.valor_total, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('frenteros_registros').insert({
      corte_id: corteActivo.id,
      frente: 'frente1',
      fecha: form.fecha,
      metros_avanzados: Number(form.metros_avanzados),
      valor_metro: Number(form.valor_metro),
      patios_hechos: Number(form.patios_hechos),
      valor_patio: Number(form.valor_patio),
      created_by: user.id,
    })
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Registro guardado'); setShowForm(false); load() }
    setSaving(false)
  }

  const handleTurno = async (e) => {
    e.preventDefault()
    const vt = turnoForm.tipo === 'turno' ? Number(turnoForm.cantidad) * Number(turnoForm.valor_unitario) : Number(turnoForm.valor_total)
    const { error } = await supabase.from('turnos_bonificaciones').insert({ ...turnoForm, corte_id: corteActivo.id, cantidad: Number(turnoForm.cantidad), valor_unitario: Number(turnoForm.valor_unitario), valor_total: vt, created_by: user.id })
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Guardado'); setShowTurno(false); setTurnoForm(emptyTurno); load() }
  }

  if (!corteActivo) return <div className="text-mine-muted text-center py-16">No hay corte activo.</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mine-text">Frenteros</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTurno(!showTurno)} className="btn-secondary text-sm flex items-center gap-1.5"><Plus size={14} /> Turno/Bono</button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nuevo Registro</button>
        </div>
      </div>

      {showForm && (
        <div className="card border-mine-accent/30">
          <h2 className="font-semibold mb-4">Registro Frenteros</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Metros avanzados</label>
              <input type="number" className="input" value={form.metros_avanzados} onChange={e => setForm(f => ({ ...f, metros_avanzados: e.target.value }))} min="0" step="0.1" required />
            </div>
            <div>
              <label className="label">Valor por metro (COP)</label>
              <input type="number" className="input" value={form.valor_metro} onChange={e => setForm(f => ({ ...f, valor_metro: e.target.value }))} />
            </div>
            <div>
              <label className="label">Patios construidos</label>
              <input type="number" className="input" value={form.patios_hechos} onChange={e => setForm(f => ({ ...f, patios_hechos: e.target.value }))} min="0" required />
            </div>
            <div>
              <label className="label">Valor por patio (COP)</label>
              <input type="number" className="input" value={form.valor_patio} onChange={e => setForm(f => ({ ...f, valor_patio: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showTurno && (
        <div className="card border-yellow-500/30">
          <h2 className="font-semibold mb-4">Turno / Bonificación — Frenteros</h2>
          <form onSubmit={handleTurno} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={turnoForm.tipo} onChange={e => setTurnoForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="turno">Turno</option>
                <option value="bonificacion">Bonificación</option>
                <option value="varios">Varios</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Descripción</label>
              <input className="input" value={turnoForm.descripcion} onChange={e => setTurnoForm(f => ({ ...f, descripcion: e.target.value }))} required />
            </div>
            {turnoForm.tipo === 'turno' ? (
              <>
                <div><label className="label">Cantidad</label><input type="number" className="input" value={turnoForm.cantidad} onChange={e => setTurnoForm(f => ({ ...f, cantidad: e.target.value }))} /></div>
                <div><label className="label">Valor/turno</label><input type="number" className="input" value={turnoForm.valor_unitario} onChange={e => setTurnoForm(f => ({ ...f, valor_unitario: e.target.value }))} /></div>
              </>
            ) : (
              <div className="col-span-2"><label className="label">Monto total</label><input type="number" className="input" value={turnoForm.valor_total} onChange={e => setTurnoForm(f => ({ ...f, valor_total: e.target.value }))} /></div>
            )}
            <div className="col-span-2 md:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary">Guardar</button>
              <button type="button" onClick={() => setShowTurno(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="card"><div className="text-mine-muted text-xs mb-1">Metros Avanzados</div><div className="text-xl font-bold text-mine-accent">{totales.metros} m</div></div>
        <div className="card"><div className="text-mine-muted text-xs mb-1">Patios Construidos</div><div className="text-xl font-bold text-mine-accent">{totales.patios}</div></div>
        <div className="card"><div className="text-mine-muted text-xs mb-1">Total a Pagar</div><div className="text-xl font-bold text-blue-400">{formatCOP(totales.pago + totalTurnos)}</div></div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-mine-border font-medium text-sm">Registros del corte</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mine-border">
              <th className="text-left px-4 py-2 text-mine-muted font-medium">Fecha</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Metros</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Patios</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Pago Avance</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Pago Patios</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {registros.map(r => (
              <tr key={r.id} className="border-b border-mine-border/50 hover:bg-white/2">
                <td className="px-4 py-2">{r.fecha}</td>
                <td className="px-4 py-2 text-right">{r.metros_avanzados} m</td>
                <td className="px-4 py-2 text-right">{r.patios_hechos}</td>
                <td className="px-4 py-2 text-right font-mono">{formatCOP(r.metros_avanzados * r.valor_metro)}</td>
                <td className="px-4 py-2 text-right font-mono">{formatCOP(r.patios_hechos * r.valor_patio)}</td>
                <td className="px-4 py-2 text-right font-mono text-mine-accent">{formatCOP(calcPago(r))}</td>
                <td className="px-4 py-2">
                  <button onClick={async () => { await supabase.from('frenteros_registros').delete().eq('id', r.id); load() }} className="p-1 text-mine-muted hover:text-red-400 rounded"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!registros.length && <div className="text-center py-8 text-mine-muted text-sm">Sin registros en este corte.</div>}
      </div>
    </div>
  )
}
