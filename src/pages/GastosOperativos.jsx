import { useEffect, useState } from 'react'
import { Plus, Trash2, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP, CATEGORIAS_GASTOS } from '../lib/utils'

const emptyForm = { categoria: 'Combustible / Canecas', descripcion: '', cantidad: '', valor_unitario: '', monto_total: '', tipo: 'operativo', fecha: '' }

export default function GastosOperativos() {
  const { corteActivo, user, addToast } = useStore()
  const [gastos, setGastos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todos')

  useEffect(() => { if (corteActivo) load() }, [corteActivo])

  const load = async () => {
    const { data } = await supabase.from('gastos').select('*').eq('corte_id', corteActivo.id).order('fecha', { ascending: false })
    setGastos(data || [])
  }

  const handleFormChange = (field, value) => {
    setForm(f => {
      const next = { ...f, [field]: value }
      if (field === 'cantidad' || field === 'valor_unitario') {
        const c = Number(next.cantidad)
        const v = Number(next.valor_unitario)
        if (c > 0 && v > 0) next.monto_total = String(c * v)
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('gastos').insert({
      ...form,
      corte_id: corteActivo.id,
      cantidad: form.cantidad ? Number(form.cantidad) : null,
      valor_unitario: form.valor_unitario ? Number(form.valor_unitario) : null,
      monto_total: Number(form.monto_total),
      created_by: user.id,
    })
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Gasto registrado'); setShowForm(false); setForm(emptyForm); load() }
    setSaving(false)
  }

  const filtered = filtroTipo === 'todos' ? gastos : gastos.filter(g => g.tipo === filtroTipo)

  const totOp = gastos.filter(g => g.tipo === 'operativo').reduce((a, g) => a + g.monto_total, 0)
  const totNoOp = gastos.filter(g => g.tipo === 'no_operativo').reduce((a, g) => a + g.monto_total, 0)

  const byCategoria = gastos.filter(g => g.tipo === 'operativo').reduce((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + g.monto_total
    return acc
  }, {})

  if (!corteActivo) return <div className="text-mine-muted text-center py-16">No hay corte activo.</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mine-text">Gastos Operativos</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nuevo Gasto</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card"><div className="text-mine-muted text-xs mb-1">Total Gastos Operativos</div><div className="text-xl font-bold text-red-400">{formatCOP(totOp)}</div></div>
        <div className="card"><div className="text-mine-muted text-xs mb-1">Total No Operativos</div><div className="text-xl font-bold text-slate-400">{formatCOP(totNoOp)}</div></div>
      </div>

      {showForm && (
        <div className="card border-mine-accent/30">
          <h2 className="font-semibold mb-4">Registrar Gasto</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria} onChange={e => handleFormChange('categoria', e.target.value)}>
                {CATEGORIAS_GASTOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => handleFormChange('tipo', e.target.value)}>
                <option value="operativo">Operativo</option>
                <option value="no_operativo">No Operativo</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={e => handleFormChange('fecha', e.target.value)} required />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="label">Descripción / Justificación</label>
              <input className="input" value={form.descripcion} onChange={e => handleFormChange('descripcion', e.target.value)} placeholder="Ej: 14 canecas de combustible" required />
            </div>
            <div>
              <label className="label">Cantidad (opcional)</label>
              <input type="number" className="input" value={form.cantidad} onChange={e => handleFormChange('cantidad', e.target.value)} min="0" step="0.01" placeholder="14" />
            </div>
            <div>
              <label className="label">Valor unitario (COP, opcional)</label>
              <input type="number" className="input" value={form.valor_unitario} onChange={e => handleFormChange('valor_unitario', e.target.value)} min="0" placeholder="650000" />
            </div>
            <div>
              <label className="label">Monto total (COP)</label>
              <input type="number" className="input" value={form.monto_total} onChange={e => handleFormChange('monto_total', e.target.value)} min="0" required placeholder="9100000" />
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar Gasto'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {Object.keys(byCategoria).length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm">Gastos Operativos por Categoría</h3>
          <div className="space-y-2">
            {Object.entries(byCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-mine-muted">{cat}</span>
                <span className="font-mono text-mine-text">{formatCOP(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter size={14} className="text-mine-muted" />
        <span className="text-mine-muted text-sm">Filtrar:</span>
        {[['todos', 'Todos'], ['operativo', 'Operativos'], ['no_operativo', 'No Operativos']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltroTipo(val)} className={`px-3 py-1 rounded-lg text-xs transition-colors ${filtroTipo === val ? 'bg-mine-accent text-slate-900 font-semibold' : 'bg-mine-surface border border-mine-border text-mine-muted hover:text-mine-text'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mine-border">
              <th className="text-left px-4 py-2 text-mine-muted font-medium">Fecha</th>
              <th className="text-left px-4 py-2 text-mine-muted font-medium">Categoría</th>
              <th className="text-left px-4 py-2 text-mine-muted font-medium">Descripción</th>
              <th className="text-center px-4 py-2 text-mine-muted font-medium">Tipo</th>
              <th className="text-right px-4 py-2 text-mine-muted font-medium">Monto</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(g => (
              <tr key={g.id} className="border-b border-mine-border/50 hover:bg-white/2">
                <td className="px-4 py-2 text-mine-muted">{g.fecha}</td>
                <td className="px-4 py-2 text-mine-text">{g.categoria}</td>
                <td className="px-4 py-2 text-mine-muted max-w-xs truncate">{g.descripcion}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${g.tipo === 'operativo' ? 'text-blue-400 bg-blue-400/10 border-blue-400/30' : 'text-slate-400 bg-slate-400/10 border-slate-400/30'}`}>
                    {g.tipo === 'operativo' ? 'Op.' : 'No Op.'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-mono text-red-400">{formatCOP(g.monto_total)}</td>
                <td className="px-4 py-2">
                  <button onClick={async () => { await supabase.from('gastos').delete().eq('id', g.id); load() }} className="p-1 text-mine-muted hover:text-red-400 rounded"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="text-center py-8 text-mine-muted text-sm">Sin gastos registrados.</div>}
      </div>
    </div>
  )
}
