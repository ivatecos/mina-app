import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP, formatNumber } from '../lib/utils'
import { logAudit } from '../lib/audit'

const emptyForm = { fecha: '', coches_sacados: 0, valor_por_coche: 16000 }

export default function Cocheros() {
  const { corteActivo, user, addToast } = useStore()
  const [registros, setRegistros] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (corteActivo) load() }, [corteActivo])

  const load = async () => {
    const { data } = await supabase.from('cocheros_registros').select('*').eq('corte_id', corteActivo.id).order('fecha', { ascending: false })
    setRegistros(data || [])
  }

  const totales = registros.reduce((acc, r) => ({
    coches: acc.coches + r.coches_sacados,
    pago: acc.pago + r.coches_sacados * r.valor_por_coche,
  }), { coches: 0, pago: 0 })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      corte_id: corteActivo.id,
      frente: 'frente1',
      fecha: form.fecha,
      coches_sacados: Number(form.coches_sacados),
      valor_por_coche: Number(form.valor_por_coche),
    }
    const pago = Number(form.coches_sacados) * Number(form.valor_por_coche)
    const detalle = `Fecha: ${form.fecha} | Coches: ${form.coches_sacados} | Total: ${formatCOP(pago)}`

    if (editId) {
      const { error } = await supabase.from('cocheros_registros').update(payload).eq('id', editId)
      if (error) { addToast('Error: ' + error.message, 'error'); setSaving(false); return }
      await logAudit('EDITÓ', 'cocheros', detalle)
      addToast('Registro actualizado')
    } else {
      const { error } = await supabase.from('cocheros_registros').insert({ ...payload, created_by: user.id })
      if (error) { addToast('Error: ' + error.message, 'error'); setSaving(false); return }
      await logAudit('CREÓ', 'cocheros', detalle)
      addToast('Registro guardado')
    }
    setShowForm(false)
    setForm(emptyForm)
    setEditId(null)
    load()
    setSaving(false)
  }

  const startEdit = (r) => {
    setForm({ fecha: r.fecha, coches_sacados: r.coches_sacados, valor_por_coche: r.valor_por_coche })
    setEditId(r.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteReg = async (r) => {
    await supabase.from('cocheros_registros').delete().eq('id', r.id)
    await logAudit('ELIMINÓ', 'cocheros', `Fecha: ${r.fecha} | Coches: ${r.coches_sacados} | Total: ${formatCOP(r.coches_sacados * r.valor_por_coche)}`)
    load()
  }

  if (!corteActivo) return <div className="text-mine-muted text-center py-16">No hay corte activo.</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mine-text">Cocheros</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm) }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nuevo Registro</button>
      </div>

      {showForm && (
        <div className="card border-mine-accent/30">
          <h2 className="font-semibold mb-4">{editId ? 'Editar Registro' : 'Registro Cocheros'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Coches sacados</label>
              <input type="number" className="input" value={form.coches_sacados} onChange={e => setForm(f => ({ ...f, coches_sacados: e.target.value }))} min="0" required />
            </div>
            <div>
              <label className="label">Valor por coche (COP)</label>
              <input type="number" className="input" value={form.valor_por_coche} onChange={e => setForm(f => ({ ...f, valor_por_coche: e.target.value }))} />
            </div>
            {Number(form.coches_sacados) > 0 && (
              <div className="col-span-2 md:col-span-3 bg-slate-50 rounded-lg px-3 py-2 text-sm text-mine-muted">
                Pago estimado: <span className="text-mine-accent font-semibold">{formatCOP(Number(form.coches_sacados) * Number(form.valor_por_coche))}</span>
                {' '}({formatNumber(form.coches_sacados)} coches × {formatCOP(form.valor_por_coche)})
              </div>
            )}
            <div className="col-span-2 md:col-span-3 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Guardando...' : editId ? 'Guardar Cambios' : 'Guardar'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="card"><div className="text-mine-muted text-xs mb-1">Total Coches Sacados</div><div className="text-2xl font-bold text-mine-accent">{formatNumber(totales.coches)}</div></div>
        <div className="card"><div className="text-mine-muted text-xs mb-1">Total a Pagar Cocheros</div><div className="text-2xl font-bold text-blue-600">{formatCOP(totales.pago)}</div></div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-mine-border font-medium text-sm">Registros del corte</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mine-border">
              <th className="text-left px-4 py-2 text-mine-muted font-medium">Fecha</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Coches</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Valor/coche</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Total</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {registros.map(r => (
              <tr key={r.id} className="border-b border-mine-border/50 hover:bg-slate-50">
                <td className="px-4 py-2">{r.fecha}</td>
                <td className="px-4 py-2 text-right">{formatNumber(r.coches_sacados)}</td>
                <td className="px-4 py-2 text-right font-mono">{formatCOP(r.valor_por_coche)}</td>
                <td className="px-4 py-2 text-right font-mono text-mine-accent">{formatCOP(r.coches_sacados * r.valor_por_coche)}</td>
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
