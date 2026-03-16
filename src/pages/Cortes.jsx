import { useEffect, useState } from 'react'
import { Plus, Lock, Archive, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP, formatDate, ESTADO_COLORS, ESTADO_LABELS } from '../lib/utils'

const emptyForm = {
  nombre: '', fecha_inicio: '', fecha_fin: '',
  precio_carbon_ton: '', precio_flete_ton: '',
}

export default function Cortes() {
  const [cortes, setCortes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { user, addToast, setCorteActivo } = useStore()

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('cortes').select('*').order('created_at', { ascending: false })
    setCortes(data || [])
    const activo = (data || []).find(c => c.estado === 'abierto')
    if (activo) setCorteActivo(activo)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: corte, error } = await supabase.from('cortes').insert({
      ...form,
      precio_carbon_ton: Number(form.precio_carbon_ton),
      precio_flete_ton: Number(form.precio_flete_ton),
      estado: 'abierto',
      creado_por: user.id,
    }).select().single()

    if (error) { addToast('Error al crear corte: ' + error.message, 'error'); setSaving(false); return }

    // Copiar personal activo al corte con sus valores actuales
    const { data: personal } = await supabase.from('personal_operativo').select('*').eq('activo', true)
    if (personal?.length) {
      await supabase.from('nomina_operativo_corte').insert(
        personal.map(p => ({ corte_id: corte.id, personal_id: p.id, valor_pagado: p.valor_quincenal }))
      )
    }

    addToast('Corte creado — nómina cargada automáticamente')
    setShowForm(false)
    setForm(emptyForm)
    load()
    setSaving(false)
  }

  const cambiarEstado = async (id, nuevoEstado) => {
    const msgs = { cerrado: 'Corte cerrado', archivado: 'Corte archivado' }
    const { error } = await supabase.from('cortes').update({ estado: nuevoEstado }).eq('id', id)
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast(msgs[nuevoEstado]); load() }
  }

  const eliminarCorte = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar el corte "${nombre}" y todos sus datos? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('cortes').delete().eq('id', id)
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Corte eliminado'); load() }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mine-text">Cortes Quincenales</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Corte
        </button>
      </div>

      {showForm && (
        <div className="card border-mine-accent/30">
          <h2 className="font-semibold text-mine-text mb-4">Abrir Nuevo Corte</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Nombre del corte</label>
              <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Quincena 1 - Enero 2025" required />
            </div>
            <div>
              <label className="label">Fecha de inicio</label>
              <input type="date" className="input" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Fecha de cierre</label>
              <input type="date" className="input" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Precio carbón (COP/ton)</label>
              <input type="number" className="input" value={form.precio_carbon_ton} onChange={e => setForm(f => ({ ...f, precio_carbon_ton: e.target.value }))} placeholder="180000" required min="0" />
            </div>
            <div>
              <label className="label">Precio flete (COP/ton)</label>
              <input type="number" className="input" value={form.precio_flete_ton} onChange={e => setForm(f => ({ ...f, precio_flete_ton: e.target.value }))} placeholder="75000" required min="0" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Guardando...' : 'Abrir Corte'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {cortes.map(c => (
          <div key={c.id} className="card flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-mine-text">{c.nombre}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${ESTADO_COLORS[c.estado]}`}>
                  {ESTADO_LABELS[c.estado]}
                </span>
              </div>
              <div className="text-sm text-mine-muted">
                {formatDate(c.fecha_inicio)} — {formatDate(c.fecha_fin)}
                {' | '}Carbón: <span className="text-mine-accent">{formatCOP(c.precio_carbon_ton)}/ton</span>
                {' | '}Flete: <span className="text-yellow-400">{formatCOP(c.precio_flete_ton)}/ton</span>
              </div>
            </div>
            <div className="flex gap-2">
              {c.estado === 'abierto' && (
                <button onClick={() => cambiarEstado(c.id, 'cerrado')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors">
                  <Lock size={13} /> Cerrar
                </button>
              )}
              {c.estado === 'cerrado' && (
                <button onClick={() => cambiarEstado(c.id, 'archivado')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-500/10 text-slate-400 border border-slate-500/30 rounded-lg hover:bg-slate-500/20 transition-colors">
                  <Archive size={13} /> Archivar
                </button>
              )}
              <button onClick={() => eliminarCorte(c.id, c.nombre)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-900/20 text-red-500 border border-red-900/40 rounded-lg hover:bg-red-900/40 transition-colors">
                <Trash2 size={13} /> Eliminar
              </button>
            </div>
          </div>
        ))}
        {!cortes.length && (
          <div className="text-center py-16 text-mine-muted">
            <p>No hay cortes registrados.</p>
            <p className="text-sm mt-1">Crea el primer corte con el botón superior.</p>
          </div>
        )}
      </div>
    </div>
  )
}
