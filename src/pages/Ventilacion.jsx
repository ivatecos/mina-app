import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP } from '../lib/utils'
import { logAudit } from '../lib/audit'

const emptyForm = { fecha: '', metros_avanzados: 0, metros_por_tramo: 16, valor_por_tramo: 120000 }
const emptyTurno = { modulo: 'ventilacion', frente: 'frente1', tipo: 'turno', descripcion: '', cantidad: 1, valor_unitario: 80000, valor_total: 80000 }

export default function Ventilacion() {
  const { corteActivo, user, addToast } = useStore()
  const [registros, setRegistros] = useState([])
  const [turnos, setTurnos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showTurno, setShowTurno] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [turnoForm, setTurnoForm] = useState(emptyTurno)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (corteActivo) load() }, [corteActivo])

  const load = async () => {
    const { data: r } = await supabase.from('ventilacion_registros').select('*').eq('corte_id', corteActivo.id).order('fecha', { ascending: false })
    const { data: t } = await supabase.from('turnos_bonificaciones').select('*').eq('corte_id', corteActivo.id).eq('modulo', 'ventilacion').order('created_at', { ascending: false })
    setRegistros(r || [])
    setTurnos(t || [])
  }

  const calcCosto = (r) => Math.floor(r.metros_avanzados / r.metros_por_tramo) * r.valor_por_tramo
  const calcTramos = (r) => Math.floor(r.metros_avanzados / r.metros_por_tramo)

  const totales = registros.reduce((acc, r) => ({
    metros: acc.metros + r.metros_avanzados,
    tramos: acc.tramos + calcTramos(r),
    costo: acc.costo + calcCosto(r),
  }), { metros: 0, tramos: 0, costo: 0 })

  const totalTurnos = turnos.reduce((a, t) => a + t.valor_total, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      corte_id: corteActivo.id,
      frente: 'frente1',
      fecha: form.fecha,
      metros_avanzados: Number(form.metros_avanzados),
      metros_por_tramo: Number(form.metros_por_tramo),
      valor_por_tramo: Number(form.valor_por_tramo),
    }
    const tramos = Math.floor(Number(form.metros_avanzados) / Number(form.metros_por_tramo))
    const costo = tramos * Number(form.valor_por_tramo)
    const detalle = `Fecha: ${form.fecha} | Metros: ${form.metros_avanzados}m | Tramos: ${tramos} | Costo: ${formatCOP(costo)}`

    if (editId) {
      const { error } = await supabase.from('ventilacion_registros').update(payload).eq('id', editId)
      if (error) { addToast('Error: ' + error.message, 'error'); setSaving(false); return }
      await logAudit('EDITÓ', 'ventilacion', detalle)
      addToast('Registro actualizado')
    } else {
      const { error } = await supabase.from('ventilacion_registros').insert({ ...payload, created_by: user.id })
      if (error) { addToast('Error: ' + error.message, 'error'); setSaving(false); return }
      await logAudit('CREÓ', 'ventilacion', detalle)
      addToast('Registro guardado')
    }
    setShowForm(false)
    setForm(emptyForm)
    setEditId(null)
    load()
    setSaving(false)
  }

  const handleTurno = async (e) => {
    e.preventDefault()
    const vt = turnoForm.tipo === 'turno' ? Number(turnoForm.cantidad) * Number(turnoForm.valor_unitario) : Number(turnoForm.valor_total)
    const { error } = await supabase.from('turnos_bonificaciones').insert({ ...turnoForm, corte_id: corteActivo.id, cantidad: Number(turnoForm.cantidad), valor_unitario: Number(turnoForm.valor_unitario), valor_total: vt, created_by: user.id })
    if (error) addToast('Error: ' + error.message, 'error')
    else {
      await logAudit('CREÓ', 'ventilacion', `Turno/Bono: ${turnoForm.descripcion} — ${formatCOP(vt)}`)
      addToast('Guardado')
      setShowTurno(false)
      setTurnoForm(emptyTurno)
      load()
    }
  }

  const startEdit = (r) => {
    setForm({ fecha: r.fecha, metros_avanzados: r.metros_avanzados, metros_por_tramo: r.metros_por_tramo, valor_por_tramo: r.valor_por_tramo })
    setEditId(r.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteReg = async (r) => {
    await supabase.from('ventilacion_registros').delete().eq('id', r.id)
    await logAudit('ELIMINÓ', 'ventilacion', `Fecha: ${r.fecha} | Metros: ${r.metros_avanzados}m | ${calcTramos(r)} tramos | ${formatCOP(calcCosto(r))}`)
    load()
  }

  if (!corteActivo) return <div className="text-mine-muted text-center py-16">No hay corte activo.</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mine-text">Ventilación</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTurno(!showTurno)} className="btn-secondary text-sm flex items-center gap-1.5"><Plus size={14} /> Turno/Bono</button>
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm) }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nuevo Registro</button>
        </div>
      </div>

      <div className="card bg-mine-accent/5 border-mine-accent/20 text-sm text-mine-muted">
        Fórmula: Por cada <span className="text-mine-accent font-semibold">{form.metros_por_tramo} metros</span> de avance → <span className="text-mine-accent font-semibold">{formatCOP(form.valor_por_tramo)}</span>. Costo = (Metros / {form.metros_por_tramo}) × {formatCOP(form.valor_por_tramo)}
      </div>

      {showForm && (
        <div className="card border-mine-accent/30">
          <h2 className="font-semibold mb-4">{editId ? 'Editar Registro' : 'Registro Ventilación'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Metros avanzados</label>
              <input type="number" className="input" value={form.metros_avanzados} onChange={e => setForm(f => ({ ...f, metros_avanzados: e.target.value }))} min="0" step="0.5" required />
            </div>
            <div>
              <label className="label">Metros por tramo</label>
              <input type="number" className="input" value={form.metros_por_tramo} onChange={e => setForm(f => ({ ...f, metros_por_tramo: e.target.value }))} />
            </div>
            <div>
              <label className="label">Valor por tramo (COP)</label>
              <input type="number" className="input" value={form.valor_por_tramo} onChange={e => setForm(f => ({ ...f, valor_por_tramo: e.target.value }))} />
            </div>
            {Number(form.metros_avanzados) > 0 && (
              <div className="col-span-2 md:col-span-4 bg-slate-50 rounded-lg px-3 py-2 text-sm text-mine-muted">
                Costo estimado: <span className="text-mine-accent font-semibold">{formatCOP(Math.floor(Number(form.metros_avanzados) / Number(form.metros_por_tramo)) * Number(form.valor_por_tramo))}</span>
                {' '}({Math.floor(Number(form.metros_avanzados) / Number(form.metros_por_tramo))} tramos)
              </div>
            )}
            <div className="col-span-2 md:col-span-4 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Guardando...' : editId ? 'Guardar Cambios' : 'Guardar'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showTurno && (
        <div className="card border-yellow-500/30">
          <h2 className="font-semibold mb-4">Turno / Bonificación — Ventilación</h2>
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
        <div className="card"><div className="text-mine-muted text-xs mb-1">Tramos (×{emptyForm.metros_por_tramo}m)</div><div className="text-xl font-bold text-mine-accent">{totales.tramos}</div></div>
        <div className="card"><div className="text-mine-muted text-xs mb-1">Costo Total</div><div className="text-xl font-bold text-blue-600">{formatCOP(totales.costo + totalTurnos)}</div></div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-mine-border font-medium text-sm">Registros del corte</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mine-border">
              <th className="text-left px-4 py-2 text-mine-muted font-medium">Fecha</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Metros</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Tramos</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Costo</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {registros.map(r => (
              <tr key={r.id} className="border-b border-mine-border/50 hover:bg-slate-50">
                <td className="px-4 py-2">{r.fecha}</td>
                <td className="px-4 py-2 text-right">{r.metros_avanzados} m</td>
                <td className="px-4 py-2 text-right">{calcTramos(r)}</td>
                <td className="px-4 py-2 text-right font-mono text-mine-accent">{formatCOP(calcCosto(r))}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => startEdit(r)} className="p-1 text-mine-muted hover:text-mine-accent rounded"><Edit2 size={13} /></button>
                    <button onClick={() => deleteReg(r)} className="p-1 text-mine-muted hover:text-red-500 rounded"><Trash2 size={13} /></button>
                  </div>
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
