import { useEffect, useState } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP } from '../lib/utils'

const SEED = [
  { concepto: 'Coche Grande — kg por coche', valor: 2250, unidad: 'kg/coche' },
  { concepto: 'Coche Pequeño — kg por coche', valor: 1500, unidad: 'kg/coche' },
  { concepto: 'Valor por tonelada Picadores (Coche Grande)', valor: 30000, unidad: 'COP/ton' },
  { concepto: 'Valor por tonelada Picadores (Coche Pequeño)', valor: 30000, unidad: 'COP/ton' },
  { concepto: 'Valor por metro avanzado — Frenteros', valor: 350000, unidad: 'COP/metro' },
  { concepto: 'Valor patio construido — Frenteros', valor: 950000, unidad: 'COP/patio' },
  { concepto: 'Valor turno — Frenteros', valor: 80000, unidad: 'COP/turno' },
  { concepto: 'Valor turno — Picadores', valor: 80000, unidad: 'COP/turno' },
  { concepto: 'Valor turno — Ventilación', valor: 80000, unidad: 'COP/turno' },
  { concepto: 'Valor por coche — Cocheros', valor: 16000, unidad: 'COP/coche' },
  { concepto: 'Ventilación — metros por tramo', valor: 16, unidad: 'metros' },
  { concepto: 'Ventilación — valor por tramo', valor: 120000, unidad: 'COP/tramo' },
]

export default function Tarifas() {
  const [tarifas, setTarifas] = useState([])
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')
  const { addToast } = useStore()

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('tarifas').select('*').order('concepto')
    setTarifas(data || [])
  }

  const seedTarifas = async () => {
    const { error } = await supabase.from('tarifas').insert(SEED.map(t => ({ ...t, vigente_desde: new Date().toISOString() })))
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Tarifas base cargadas'); load() }
  }

  const startEdit = (t) => {
    setEditing(t.id)
    setEditVal(String(t.valor))
  }

  const saveEdit = async (id) => {
    const { error } = await supabase.from('tarifas').update({ valor: Number(editVal) }).eq('id', id)
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Tarifa actualizada'); setEditing(null); load() }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mine-text">Tarifas Base</h1>
        {!tarifas.length && (
          <button onClick={seedTarifas} className="btn-primary">Cargar Tarifas Base</button>
        )}
      </div>
      <p className="text-mine-muted text-sm">Valores de referencia usados en los cálculos automáticos. Edita cada valor según las condiciones actuales.</p>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mine-border">
              <th className="text-left px-4 py-3 text-mine-muted font-medium">Concepto</th>
              <th className="text-right px-4 py-3 text-mine-muted font-medium">Valor</th>
              <th className="text-center px-4 py-3 text-mine-muted font-medium">Unidad</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map(t => (
              <tr key={t.id} className="border-b border-mine-border/50 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 text-mine-text">{t.concepto}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {editing === t.id ? (
                    <input
                      type="number"
                      className="input text-right w-36 py-1"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span className="text-mine-accent">{t.unidad === 'kg/coche' || t.unidad === 'metros' ? t.valor : formatCOP(t.valor)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-mine-muted">{t.unidad}</td>
                <td className="px-4 py-3">
                  {editing === t.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => saveEdit(t.id)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded"><Save size={14} /></button>
                      <button onClick={() => setEditing(null)} className="p-1.5 text-mine-muted hover:bg-white/5 rounded"><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(t)} className="p-1.5 text-mine-muted hover:text-mine-accent hover:bg-mine-accent/10 rounded"><Edit2 size={14} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!tarifas.length && (
          <div className="text-center py-12 text-mine-muted text-sm">
            Haz clic en Cargar Tarifas Base para inicializar los valores por defecto.
          </div>
        )}
      </div>
    </div>
  )
}
