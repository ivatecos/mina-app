import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Weight, Users, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP, formatNumber } from '../lib/utils'

const KPICard = ({ title, value, sub, icon: Icon, color = 'text-mine-accent', bar = 'bg-mine-accent' }) => (
  <div className="bg-mine-surface border border-mine-border rounded-xl p-4 flex flex-col gap-2 overflow-hidden relative">
    <div className="flex items-center justify-between">
      <span className="text-mine-muted text-xs font-medium uppercase tracking-wide">{title}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bar} bg-opacity-15`}>
        <Icon size={16} className={color} />
      </div>
    </div>
    <div className={`text-xl font-bold ${color} leading-tight`}>{value}</div>
    {sub && <div className="text-xs text-mine-muted">{sub}</div>}
    <div className={`absolute bottom-0 left-0 right-0 h-1 ${bar}`} />
  </div>
)

const calcTon = (rows) => {
  let ton = 0, pago = 0
  ;(rows || []).forEach(r => {
    const tG = (r.coches_grandes * r.kg_coche_grande) / 1000
    const tP = (r.coches_pequenos * r.kg_coche_pequeno) / 1000
    ton += tG + tP
    pago += tG * r.valor_ton_grande + tP * r.valor_ton_pequeno
  })
  return { ton, pago }
}

const TS = { background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }

export default function Dashboard() {
  const { corteActivo } = useStore()
  const [kpis, setKpis] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (corteActivo) loadKpis()
    loadHistorico()
  }, [corteActivo])

  const loadKpis = async () => {
    const id = corteActivo.id
    const [picRes, frenRes, ventRes, cochRes, persRes, gastRes, turnosRes] = await Promise.all([
      supabase.from('picadores_registros').select('coches_grandes,coches_pequenos,kg_coche_grande,kg_coche_pequeno,valor_ton_grande,valor_ton_pequeno').eq('corte_id', id),
      supabase.from('frenteros_registros').select('metros_avanzados,valor_metro,patios_hechos,valor_patio').eq('corte_id', id),
      supabase.from('ventilacion_registros').select('metros_avanzados,metros_por_tramo,valor_por_tramo').eq('corte_id', id),
      supabase.from('cocheros_registros').select('coches_sacados,valor_por_coche').eq('corte_id', id),
      supabase.from('nomina_operativo_corte').select('valor_pagado').eq('corte_id', id),
      supabase.from('gastos').select('monto_total,tipo').eq('corte_id', id),
      supabase.from('turnos_bonificaciones').select('valor_total').eq('corte_id', id),
    ])
    const { ton: tonP, pago: pagoP } = calcTon(picRes.data)
    let pagoF = 0;(frenRes.data || []).forEach(r => { pagoF += r.metros_avanzados * r.valor_metro + r.patios_hechos * r.valor_patio })
    let pagoV = 0;(ventRes.data || []).forEach(r => { pagoV += Math.floor(r.metros_avanzados / r.metros_por_tramo) * r.valor_por_tramo })
    let pagoC = 0;(cochRes.data || []).forEach(r => { pagoC += r.coches_sacados * r.valor_por_coche })
    const pagoPers = (persRes.data || []).reduce((a, r) => a + r.valor_pagado, 0)
    const pagoT = (turnosRes.data || []).reduce((a, r) => a + r.valor_total, 0)
    const gastosOp = (gastRes.data || []).filter(g => g.tipo === 'operativo').reduce((a, g) => a + g.monto_total, 0)
    const totalNomina = pagoP + pagoF + pagoV + pagoC + pagoPers + pagoT
    const ingresoBruto = tonP * corteActivo.precio_carbon_ton
    const descFletes = tonP * corteActivo.precio_flete_ton
    const ingresoNeto = ingresoBruto - descFletes
    const utilidad = ingresoNeto - totalNomina - gastosOp
    setKpis({
      tonP, ingresoBruto, descFletes, ingresoNeto, pagoP, pagoF, pagoV, pagoC,
      pagoPers, pagoT, totalNomina, gastosOp, utilidad,
      costoPorTon: tonP > 0 ? (totalNomina + gastosOp) / tonP : 0,
      margenPct: ingresoNeto > 0 ? (utilidad / ingresoNeto) * 100 : 0,
    })
    setLoading(false)
  }

  const loadHistorico = async () => {
    const { data: cortes } = await supabase.from('cortes').select('*')
      .in('estado', ['cerrado', 'archivado']).order('fecha_inicio', { ascending: true }).limit(12)
    if (!cortes?.length) { setLoading(false); return }
    const rows = await Promise.all(cortes.map(async c => {
      const [pic, gasto] = await Promise.all([
        supabase.from('picadores_registros').select('coches_grandes,coches_pequenos,kg_coche_grande,kg_coche_pequeno,valor_ton_grande,valor_ton_pequeno').eq('corte_id', c.id),
        supabase.from('gastos').select('monto_total,tipo').eq('corte_id', c.id),
      ])
      const { ton, pago } = calcTon(pic.data)
      const gOp = (gasto.data || []).filter(g => g.tipo === 'operativo').reduce((a, g) => a + g.monto_total, 0)
      return {
        nombre: c.nombre.split(' ').slice(0, 2).join(' '),
        toneladas: Math.round(ton),
        utilidad: Math.round(ton * (c.precio_carbon_ton - c.precio_flete_ton) - pago - gOp),
        precio: c.precio_carbon_ton,
      }
    }))
    setHistorico(rows)
    setLoading(false)
  }

  if (!corteActivo) return (
    <div className="flex flex-col items-center justify-center py-24 text-mine-muted">
      <AlertTriangle size={48} className="mb-4 opacity-40" />
      <p className="text-lg font-medium">No hay corte activo</p>
      <p className="text-sm mt-1">Ve a Cortes y abre uno nuevo.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-mine-text">{corteActivo.nombre}</h1>
        <p className="text-mine-muted text-sm mt-0.5">
          {corteActivo.fecha_inicio} hasta {corteActivo.fecha_fin}
          {' | '}Carbón: <span className="text-mine-accent">{formatCOP(corteActivo.precio_carbon_ton)}/ton</span>
          {' | '}Flete: <span className="text-yellow-400">{formatCOP(corteActivo.precio_flete_ton)}/ton</span>
        </p>
      </div>

      {loading ? (
        <div className="text-mine-muted">Cargando...</div>
      ) : kpis && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Producción" value={`${formatNumber(kpis.tonP.toFixed(2))} ton`} icon={Weight} color="text-mine-accent" bar="bg-mine-accent" />
            <KPICard title="Ingreso Neto" value={formatCOP(kpis.ingresoNeto)} sub={`Bruto: ${formatCOP(kpis.ingresoBruto)}`} icon={DollarSign} color="text-green-400" bar="bg-green-400" />
            <KPICard title="Total Nómina" value={formatCOP(kpis.totalNomina)} icon={Users} color="text-blue-400" bar="bg-blue-400" />
            <KPICard
              title={kpis.utilidad >= 0 ? 'Utilidad' : 'Pérdida'}
              value={formatCOP(kpis.utilidad)}
              sub={`Margen: ${kpis.margenPct.toFixed(1)}%`}
              icon={kpis.utilidad >= 0 ? TrendingUp : TrendingDown}
              color={kpis.utilidad >= 0 ? 'text-green-400' : 'text-red-400'}
              bar={kpis.utilidad >= 0 ? 'bg-green-400' : 'bg-red-400'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-3">Desglose Nómina</h3>
              <div className="space-y-2">
                {[['Picadores', kpis.pagoP], ['Cocheros', kpis.pagoC], ['Frenteros', kpis.pagoF],
                  ['Ventilación', kpis.pagoV], ['Personal Operativo', kpis.pagoPers], ['Turnos / Bonos', kpis.pagoT]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-sm">
                    <span className="text-mine-muted">{l}</span>
                    <span className="font-mono">{formatCOP(v)}</span>
                  </div>
                ))}
                <div className="border-t border-mine-border pt-2 flex justify-between font-semibold">
                  <span>Total Nómina</span><span className="text-mine-accent">{formatCOP(kpis.totalNomina)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-3">Resultado del Corte</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-mine-muted">Ingreso Bruto</span><span className="font-mono">{formatCOP(kpis.ingresoBruto)}</span></div>
                <div className="flex justify-between"><span className="text-mine-muted">(-) Fletes</span><span className="font-mono text-red-400">-{formatCOP(kpis.descFletes)}</span></div>
                <div className="flex justify-between border-t border-mine-border pt-1"><span className="text-mine-muted">Ingreso Neto</span><span className="font-mono text-green-400">{formatCOP(kpis.ingresoNeto)}</span></div>
                <div className="flex justify-between"><span className="text-mine-muted">(-) Nómina</span><span className="font-mono text-red-400">-{formatCOP(kpis.totalNomina)}</span></div>
                <div className="flex justify-between"><span className="text-mine-muted">(-) Gastos Op.</span><span className="font-mono text-red-400">-{formatCOP(kpis.gastosOp)}</span></div>
                <div className={`flex justify-between border-t border-mine-border pt-2 font-bold text-base ${kpis.utilidad >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{kpis.utilidad >= 0 ? '✅ UTILIDAD' : '🔴 PÉRDIDA'}</span>
                  <span className="font-mono">{formatCOP(kpis.utilidad)}</span>
                </div>
                <div className="flex justify-between text-xs text-mine-muted">
                  <span>Costo/ton</span><span className="font-mono">{formatCOP(kpis.costoPorTon)}/ton</span>
                </div>
              </div>
            </div>
          </div>

          {historico.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold mb-4">Producción Histórica (ton)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={historico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="nombre" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={TS} />
                    <Bar dataKey="toneladas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4">Utilidad por Corte</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={historico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="nombre" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip contentStyle={TS} formatter={v => formatCOP(v)} />
                    <Line type="monotone" dataKey="utilidad" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
