import { useEffect, useState } from 'react'
import { Plus, Edit2, UserX, UserCheck, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP } from '../lib/utils'

const SEED = [
  { nombre: 'BABITO', cargo: 'CARGADOR', valor_quincenal: 1000000 },
  { nombre: 'RENE CASTILLO', cargo: 'MALACATE', valor_quincenal: 1000000 },
  { nombre: 'JANNER', cargo: 'MINISTRO', valor_quincenal: 1750000 },
  { nombre: 'CARRACO', cargo: 'SOLDADOR', valor_quincenal: 1400000, observaciones: 'Incluye rodamiento' },
  { nombre: 'YEIDER', cargo: 'POLVORERO', valor_quincenal: 800000 },
  { nombre: 'FARID', cargo: 'MACHIRO', valor_quincenal: 700000 },
  { nombre: 'YELITZA TOVAR', cargo: 'COCINERA', valor_quincenal: 850000 },
  { nombre: 'CONSUELO QUINTERO', cargo: 'AUXILIAR COCINA', valor_quincenal: 500000 },
  { nombre: 'JESION CUCUTA', cargo: 'AUXILIAR CUCUTA', valor_quincenal: 1200000, observaciones: 'Incluye rodamiento' },
  { nombre: 'MILENA CUCUTA', cargo: 'AUXILIAR GLOBAL', valor_quincenal: 200000 },
  { nombre: 'ESMERALDA CUCUTA', cargo: 'CONTADORA', valor_quincenal: 750000 },
  { nombre: 'JORGE CUCUTA', cargo: 'ABOGADO', valor_quincenal: 750000 },
]

const emptyForm = { nombre: '', cargo: '', valor_quincenal: '', observaciones: '' }

export default function PersonalOperativo() {
  const [personal, setPersonal] = useState([])
  const [nominaCorte, setNominaCorte] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [editingNomina, setEditingNomina] = useState({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('corte')
  const { addToast, corteActivo } = useStore()

  useEffect(() => { load() }, [corteActivo])

  const load = async () => {
    const { data } = await supabase.from('personal_operativo').select('*').order('nombre')
    setPersonal(data || [])
    if (corteActivo) {
      const { data: nomina } = await supabase
        .from('nomina_operativo_corte')
        .select('*, personal_operativo(nombre, cargo, observaciones)')
        .eq('corte_id', corteActivo.id)
        .order('personal_operativo(nombre)')
      setNominaCorte(nomina || [])
    }
  }

  const seedPersonal = async () => {
    const { error } = await supabase.from('personal_operativo').insert(SEED.map(p => ({ ...p, activo: true })))
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Personal base cargado'); load() }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, valor_quincenal: Number(form.valor_quincenal), activo: true }
    const op = editId
      ? supabase.from('personal_operativo').update(payload).eq('id', editId)
      : supabase.from('personal_operativo').insert(payload)
    const { error } = await op
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast(editId ? 'Persona actualizada' : 'Persona agregada'); setShowForm(false); setForm(emptyForm); setEditId(null); load() }
    setSaving(false)
  }

  const toggleActivo = async (p) => {
    await supabase.from('personal_operativo').update({ activo: !p.activo }).eq('id', p.id)
    addToast(p.activo ? 'Persona desactivada' : 'Persona activada')
    load()
  }

  const startEdit = (p) => {
    setForm({ nombre: p.nombre, cargo: p.cargo, valor_quincenal: String(p.valor_quincenal), observaciones: p.observaciones || '' })
    setEditId(p.id)
    setShowForm(true)
  }

  const saveNominaCorte = async (id, valor) => {
    const { error } = await supabase.from('nomina_operativo_corte').update({ valor_pagado: Number(valor) }).eq('id', id)
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Valor actualizado'); setEditingNomina({}); load() }
  }

  const totalMaestro = personal.filter(p => p.activo).reduce((a, p) => a + p.valor_quincenal, 0)
  const totalCorte = nominaCorte.reduce((a, n) => a + n.valor_pagado, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mine-text">Personal Operativo</h1>
        <div className="flex gap-2">
          {!personal.length && <button onClick={seedPersonal} className="btn-secondary text-sm">Cargar Personal Base</button>}
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm) }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-mine-border">
        <button
          onClick={() => setTab('corte')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'corte' ? 'border-mine-accent text-mine-accent' : 'border-transparent text-mine-muted hover:text-mine-text'}`}
        >
          Nómina del Corte Activo
        </button>
        <button
          onClick={() => setTab('maestro')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'maestro' ? 'border-mine-accent text-mine-accent' : 'border-transparent text-mine-muted hover:text-mine-text'}`}
        >
          Lista Maestra
        </button>
      </div>

      {/* TAB: Nómina del corte activo */}
      {tab === 'corte' && (
        <>
          {!corteActivo ? (
            <div className="text-center py-12 text-mine-muted text-sm">No hay corte activo.</div>
          ) : (
            <>
              <div className="card bg-mine-accent/5 border-mine-accent/20 text-sm text-mine-muted">
                Estos son los valores de nómina <span className="text-mine-text font-medium">fijos para el corte "{corteActivo.nombre}"</span>. Puedes editarlos sin afectar otros cortes ni la lista maestra.
              </div>
              {!nominaCorte.length ? (
                <div className="text-center py-12 text-mine-muted text-sm">
                  Este corte no tiene nómina cargada. Fue creado antes de esta funcionalidad.
                  <br />
                  <button
                    onClick={async () => {
                      const { data: p } = await supabase.from('personal_operativo').select('*').eq('activo', true)
                      if (p?.length) {
                        await supabase.from('nomina_operativo_corte').insert(p.map(x => ({ corte_id: corteActivo.id, personal_id: x.id, valor_pagado: x.valor_quincenal })))
                        addToast('Nómina cargada desde lista maestra'); load()
                      }
                    }}
                    className="btn-primary mt-4"
                  >
                    Cargar nómina desde lista maestra
                  </button>
                </div>
              ) : (
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-mine-border">
                        <th className="text-left px-4 py-3 text-mine-muted font-medium">Nombre</th>
                        <th className="text-left px-4 py-3 text-mine-muted font-medium">Cargo</th>
                        <th className="text-right px-4 py-3 text-mine-muted font-medium">Valor este corte</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {nominaCorte.map(n => (
                        <tr key={n.id} className="border-b border-mine-border/50 hover:bg-white/2">
                          <td className="px-4 py-3 font-medium text-mine-text">{n.personal_operativo.nombre}</td>
                          <td className="px-4 py-3 text-mine-muted">{n.personal_operativo.cargo}</td>
                          <td className="px-4 py-3 text-right">
                            {editingNomina[n.id] !== undefined ? (
                              <input
                                type="number"
                                className="input text-right w-40 py-1"
                                value={editingNomina[n.id]}
                                onChange={e => setEditingNomina(s => ({ ...s, [n.id]: e.target.value }))}
                                autoFocus
                              />
                            ) : (
                              <span className="font-mono text-mine-accent">{formatCOP(n.valor_pagado)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingNomina[n.id] !== undefined ? (
                              <div className="flex gap-1">
                                <button onClick={() => saveNominaCorte(n.id, editingNomina[n.id])} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded"><Save size={13} /></button>
                                <button onClick={() => setEditingNomina(s => { const x = { ...s }; delete x[n.id]; return x })} className="p-1.5 text-mine-muted hover:bg-white/5 rounded">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => setEditingNomina(s => ({ ...s, [n.id]: String(n.valor_pagado) }))} className="p-1.5 text-mine-muted hover:text-mine-accent hover:bg-mine-accent/10 rounded"><Edit2 size={13} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-mine-bg/40">
                        <td colSpan={2} className="px-4 py-3 font-semibold">TOTAL NÓMINA ESTE CORTE</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-mine-accent">{formatCOP(totalCorte)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* TAB: Lista maestra */}
      {tab === 'maestro' && (
        <>
          {showForm && (
            <div className="card border-mine-accent/30">
              <h2 className="font-semibold mb-4">{editId ? 'Editar Persona' : 'Agregar Persona'}</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre completo</label>
                  <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Cargo</label>
                  <input className="input" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Valor quincenal base (COP)</label>
                  <input type="number" className="input" value={form.valor_quincenal} onChange={e => setForm(f => ({ ...f, valor_quincenal: e.target.value }))} required min="0" />
                </div>
                <div>
                  <label className="label">Observaciones</label>
                  <input className="input" value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Opcional" />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
                  <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <div className="card bg-yellow-500/5 border-yellow-500/20 text-sm text-mine-muted">
            Los valores aquí son la <span className="text-mine-text font-medium">base para nuevos cortes</span>. Cambiarlos no afecta cortes ya creados.
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mine-border">
                  <th className="text-left px-4 py-3 text-mine-muted font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 text-mine-muted font-medium">Cargo</th>
                  <th className="text-right px-4 py-3 text-mine-muted font-medium">Valor Base</th>
                  <th className="text-left px-4 py-3 text-mine-muted font-medium">Observaciones</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {personal.map(p => (
                  <tr key={p.id} className={`border-b border-mine-border/50 transition-colors ${p.activo ? 'hover:bg-white/2' : 'opacity-40'}`}>
                    <td className="px-4 py-3 font-medium text-mine-text">{p.nombre}</td>
                    <td className="px-4 py-3 text-mine-muted">{p.cargo}</td>
                    <td className="px-4 py-3 text-right font-mono text-mine-accent">{formatCOP(p.valor_quincenal)}</td>
                    <td className="px-4 py-3 text-mine-muted text-xs">{p.observaciones}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(p)} className="p-1.5 text-mine-muted hover:text-mine-accent hover:bg-mine-accent/10 rounded"><Edit2 size={13} /></button>
                        <button onClick={() => toggleActivo(p)} className={`p-1.5 rounded ${p.activo ? 'text-red-400 hover:bg-red-400/10' : 'text-green-400 hover:bg-green-400/10'}`}>
                          {p.activo ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {personal.filter(p => p.activo).length > 0 && (
                  <tr className="bg-mine-bg/40">
                    <td colSpan={2} className="px-4 py-3 font-semibold">TOTAL ACTIVOS</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-mine-accent">{formatCOP(totalMaestro)}</td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </tbody>
            </table>
            {!personal.length && (
              <div className="text-center py-12 text-mine-muted text-sm">Haz clic en Cargar Personal Base para inicializar.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
