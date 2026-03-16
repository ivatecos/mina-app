import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP, formatNumber } from '../lib/utils'
import { logAudit } from '../lib/audit'

const emptyForm = {
  fecha: '',
  coches_grandes: 0, coches_pequenos: 0,
  kg_coche_grande: 2250, kg_coche_pequeno: 1500,
  valor_ton_grande: 30000, valor_ton_pequeno: 30000,
}

const emptyTurno = { modulo: 'picadores', frente: 'frente1', tipo: 'turno', descripcion: '', cantidad: 1, valor_unitario: 80000, valor_total: 80000 }

export default function Picadores() {
  const { corteActivo, user, addToast } = useStore()
  const [registros, setRegistros] = useState([])
  const [turnos, setTurnos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showTurno, setShowTurno] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [turnoForm, setTurnoForm] = useState(emptyTurno)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tarifas, setTarifas] = useState({})

  useEffect(() => { if (corteActivo) { loadRegistros(); loadTarifas() } }, [corteActivo])

  const loadTarifas = async () => {
    const { data } = await supabase.from('tarifas').select('concepto,valor')
    if (data) {
      const map = {}
      data.forEach(t => { map[t.concepto] = t.valor })
      setTarifas(map)
      setForm(f => ({
        ...f,
        kg_coche_grande: map['Coche Grande — kg por coche'] || 2250,
        kg_coche_pequeno: map['Coche Pequeño — kg por coche'] || 1500,
        valor_ton_grande: map['Valor por tonelada Picadores (Coche Grande)'] || 30000,
        valor_ton_pequeno: map['Valor por tonelada Picadores (Coche Pequeño)'] || 30000,
      }))
    }
  }

  const loadRegistros = async () => {
    const { data: r } = await supabase.from('picadores_registros').select('*').eq('corte_id', corteActivo.id).order('fecha', { ascending: false })
    const { data: t } = await supabase.from('turnos_bonificaciones').select('*').eq('corte_id', corteActivo.id).eq('modulo', 'picadores').order('created_at', { ascending: false })
    setRegistros(r || [])
    setTurnos(t || [])
  }

  const calcPago = (r) => {
    const tonG = (r.coches_grandes * r.kg_coche_grande) / 1000
    const tonP = (r.coches_pequenos * r.kg_coche_pequeno) / 1000
    return { tonG, tonP, pago: tonG * r.valor_ton_grande + tonP * r.valor_ton_pequeno }
  }

  const totales = registros.reduce((acc, r) => {
    const { tonG, tonP, pago } = calcPago(r)
    return { ton: acc.ton + tonG + tonP, pago: acc.pago + pago, cochesG: acc.cochesG + r.coches_grandes, cochesP: acc.cochesP + r.coches_pequenos }
  }, { ton: 0, pago: 0, cochesG: 0, cochesP: 0 })

  const totalTurnos = turnos.reduce((a, t) => a + t.valor_total, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!corteActivo) return addToast('No hay corte activo', 'error')
    setSaving(true)
    const payload = {
      corte_id: corteActivo.id,
      frente: 'frente1',
      fecha: form.fecha,
      coches_grandes: Number(form.coches_grandes),
      coches_pequenos: Number(form.coches_pequenos),
      kg_coche_grande: Number(form.kg_coche_grande),
      kg_coche_pequeno: Number(form.kg_coche_pequeno),
      valor_ton_grande: Number(form.valor_ton_grande),
      valor_ton_pequeno: Number(form.valor_ton_pequeno),
    }
    const detalle = `Fecha: ${form.fecha} | C.Grandes: ${form.coches_grandes} | C.Pequeños: ${form.coches_pequenos}`

    if (editId) {
      const { error } = await supabase.from('picadores_registros').update(payload).eq('id', editId)
      if (error) { addToast('Error: ' + error.message, 'error'); setSaving(false); return }
      await logAudit('EDITÓ', 'picadores', detalle)
      addToast('Registro actualizado')
    } else {
      const { error } = await supabase.from('picadores_registros').insert({ ...payload, created_by: user.id })
      if (error) { addToast('Error: ' + error.message, 'error'); setSaving(false); return }
      await logAudit('CREÓ', 'picadores', detalle)
      addToast('Registro guardado')
    }
    setShowForm(false)
    setForm(emptyForm)
    setEditId(null)
    loadRegistros()
    setSaving(false)
  }

  const handleTurno = async (e) => {
    e.preventDefault()
    const vt = turnoForm.tipo === 'turno'
      ? Number(turnoForm.cantidad) * Number(turnoForm.valor_unitario)
      : Number(turnoForm.valor_total)
    const { error } = await supabase.from('turnos_bonificaciones').insert({
      ...turnoForm, corte_id: corteActivo.id,
      cantidad: Number(turnoForm.cantidad),
      valor_unitario: Number(turnoForm.valor_unitario),
      valor_total: vt,
      created_by: user.id,
    })
    if (error) addToast('Error: ' + error.message, 'error')
    else {
      await logAudit('CREÓ', 'picadores', `Turno/Bono: ${turnoForm.descripcion} — ${formatCOP(vt)}`)
      addToast('Turno/Bono guardado')
      setShowTurno(false)
      setTurnoForm(emptyTurno)
      loadRegistros()
    }
  }

  const startEdit = (r) => {
    setForm({
      fecha: r.fecha,
      coches_grandes: r.coches_grandes,
      coches_pequenos: r.coches_pequenos,
      kg_coche_grande: r.kg_coche_grande,
      kg_coche_pequeno: r.kg_coche_pequeno,
      valor_ton_grande: r.valor_ton_grande,
      valor_ton_pequeno: r.valor_ton_pequeno,
    })
    setEditId(r.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteReg = async (r) => {
    const { tonG, tonP } = calcPago(r)
    await supabase.from('picadores_registros').delete().eq('id', r.id)
    await logAudit('ELIMINÓ', 'picadores', `Fecha: ${r.fecha} | C.Grandes: ${r.coches_grandes} | C.Pequeños: ${r.coches_pequenos} | ${(tonG + tonP).toFixed(3)} ton`)
    loadRegistros()
  }

  const deleteTurno = async (t) => {
    await supabase.from('turnos_bonificaciones').delete().eq('id', t.id)
    await logAudit('ELIMINÓ', 'picadores', `Turno/Bono: ${t.descripcion} — ${formatCOP(t.valor_total)}`)
    loadRegistros()
  }

  if (!corteActivo) return <div className="text-mine-muted text-center py-16">No hay corte activo.</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mine-text">Picadores</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTurno(!showTurno)} className="btn-secondary text-sm flex items-center gap-1.5">
            <Plus size={14} /> Turno/Bono
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm) }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo Registro
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card border-mine-accent/30">
          <h2 className="font-semibold mb-4">{editId ? 'Editar Registro' : 'Registro de Coches'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Coches Grandes</label>
              <input type="number" className="input" value={form.coches_grandes} onChange={e => setForm(f => ({ ...f, coches_grandes: e.target.value }))} min="0" required />
            </div>
            <div>
              <label className="label">Coches Pequeños</label>
              <input type="number" className="input" value={form.coches_pequenos} onChange={e => setForm(f => ({ ...f, coches_pequenos: e.target.value }))} min="0" required />
            </div>
            <div>
              <label className="label">kg/coche grande</label>
              <input type="number" className="input" value={form.kg_coche_grande} onChange={e => setForm(f => ({ ...f, kg_coche_grande: e.target.value }))} />
            </div>
            <div>
              <label className="label">kg/coche pequeño</label>
              <input type="number" className="input" value={form.kg_coche_pequeno} onChange={e => setForm(f => ({ ...f, kg_coche_pequeno: e.target.value }))} />
            </div>
            <div>
              <label className="label">Valor ton grande (COP)</label>
              <input type="number" className="input" value={form.valor_ton_grande} onChange={e => setForm(f => ({ ...f, valor_ton_grande: e.target.value }))} />
            </div>
            <div>
              <label className="label">Valor ton pequeño (COP)</label>
              <input type="number" className="input" value={form.valor_ton_pequeno} onChange={e => setForm(f => ({ ...f, valor_ton_pequeno: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-4 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Guardando...' : editId ? 'Guardar Cambios' : 'Guardar'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showTurno && (
        <div className="card border-yellow-500/30">
          <h2 className="font-semibold mb-4">Turno / Bonificación — Picadores</h2>
          <form onSubmit={handleTurno} className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div>
                  <label className="label">Cantidad (turnos)</label>
                  <input type="number" className="input" value={turnoForm.cantidad} onChange={e => setTurnoForm(f => ({ ...f, cantidad: e.target.value }))} min="1" />
                </div>
                <div>
                  <label className="label">Valor por turno (COP)</label>
                  <input type="number" className="input" value={turnoForm.valor_unitario} onChange={e => setTurnoForm(f => ({ ...f, valor_unitario: e.target.value }))} />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className="label">Monto total (COP)</label>
                <input type="number" className="input" value={turnoForm.valor_total} onChange={e => setTurnoForm(f => ({ ...f, valor_total: e.target.value }))} min="0" />
              </div>
            )}
            <div className="col-span-2 md:col-span-4 flex gap-3">
              <button type="submit" className="btn-primary">Guardar</button>
              <button type="button" onClick={() => setShowTurno(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card"><div className="text-mine-muted text-xs mb-1">Coches Grandes</div><div className="text-xl font-bold text-mine-accent">{formatNumber(totales.cochesG)}</div></div>
        <div className="card"><div className="text-mine-muted text-xs mb-1">Coches Pequeños</div><div className="text-xl font-bold text-mine-accent">{formatNumber(totales.cochesP)}</div></div>
        <div className="card"><div className="text-mine-muted text-xs mb-1">Total Toneladas</div><div className="text-xl font-bold text-green-600">{totales.ton.toFixed(3)} ton</div></div>
        <div className="card"><div className="text-mine-muted text-xs mb-1">Total a Pagar</div><div className="text-xl font-bold text-blue-600">{formatCOP(totales.pago + totalTurnos)}</div></div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-mine-border font-medium text-sm">Registros del corte</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mine-border">
              <th className="text-left px-4 py-2 text-mine-muted font-medium">Fecha</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">C.Grandes</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">C.Pequeños</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Toneladas</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Pago</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {registros.map(r => {
              const { tonG, tonP, pago } = calcPago(r)
              return (
                <tr key={r.id} className="border-b border-mine-border/50 hover:bg-slate-50">
                  <td className="px-4 py-2">{r.fecha}</td>
                  <td className="px-4 py-2 text-right">{r.coches_grandes}</td>
                  <td className="px-4 py-2 text-right">{r.coches_pequenos}</td>
                  <td className="px-4 py-2 text-right text-green-600">{(tonG + tonP).toFixed(3)}</td>
                  <td className="px-4 py-2 text-right font-mono text-mine-accent">{formatCOP(pago)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => startEdit(r)} className="p-1 text-mine-muted hover:text-mine-accent rounded"><Edit2 size={13} /></button>
                      <button onClick={() => deleteReg(r)} className="p-1 text-mine-muted hover:text-red-500 rounded"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!registros.length && <div className="text-center py-8 text-mine-muted text-sm">Sin registros en este corte.</div>}
      </div>

      {turnos.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-mine-border font-medium text-sm">Turnos y Bonificaciones</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mine-border">
                <th className="text-left px-4 py-2 text-mine-muted font-medium">Tipo</th>
                <th className="text-left px-4 py-2 text-mine-muted font-medium">Descripción</th>
                <th className="text-right px-4 py-2 text-mine-muted font-medium">Total</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {turnos.map(t => (
                <tr key={t.id} className="border-b border-mine-border/50">
                  <td className="px-4 py-2 capitalize text-yellow-600">{t.tipo}</td>
                  <td className="px-4 py-2 text-mine-muted">{t.descripcion}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCOP(t.valor_total)}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => deleteTurno(t)} className="p-1 text-mine-muted hover:text-red-500 rounded"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={2} className="px-4 py-2">Total Turnos/Bonos</td>
                <td className="px-4 py-2 text-right font-mono text-mine-accent">{formatCOP(totalTurnos)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
