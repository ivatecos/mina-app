import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatCOP } from '../lib/utils'

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

export default function Reportes() {
  const { corteActivo } = useStore()
  const [cortes, setCortes] = useState([])
  const [selected, setSelected] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadCortes() }, [])

  const loadCortes = async () => {
    const { data } = await supabase.from('cortes').select('*').order('fecha_inicio', { ascending: false })
    setCortes(data || [])
    if (corteActivo) setSelected(corteActivo.id)
  }

  const generateReport = async () => {
    if (!selected) return
    setLoading(true)
    const corte = cortes.find(c => c.id === selected)
    const [picRes, frenRes, ventRes, cochRes, persRes, gastRes, turnosRes, nominaRes] = await Promise.all([
      supabase.from('picadores_registros').select('*').eq('corte_id', selected),
      supabase.from('frenteros_registros').select('*').eq('corte_id', selected),
      supabase.from('ventilacion_registros').select('*').eq('corte_id', selected),
      supabase.from('cocheros_registros').select('*').eq('corte_id', selected),
      supabase.from('personal_operativo').select('*').eq('activo', true),
      supabase.from('gastos').select('*').eq('corte_id', selected).order('tipo').order('categoria'),
      supabase.from('turnos_bonificaciones').select('*').eq('corte_id', selected),
      supabase.from('nomina_operativo_corte').select('*, personal_operativo(nombre,cargo)').eq('corte_id', selected),
    ])

    const { ton: tonP, pago: pagoP } = calcTon(picRes.data)
    let pagoF = 0, metrosF = 0, patiosF = 0
    ;(frenRes.data || []).forEach(r => { pagoF += r.metros_avanzados * r.valor_metro + r.patios_hechos * r.valor_patio; metrosF += r.metros_avanzados; patiosF += r.patios_hechos })
    let pagoV = 0, metrosV = 0
    ;(ventRes.data || []).forEach(r => { pagoV += Math.floor(r.metros_avanzados / r.metros_por_tramo) * r.valor_por_tramo; metrosV += r.metros_avanzados })
    let cochesC = 0, pagoC = 0
    ;(cochRes.data || []).forEach(r => { cochesC += r.coches_sacados; pagoC += r.coches_sacados * r.valor_por_coche })

    const nominaActiva = nominaRes.data?.length
      ? nominaRes.data.reduce((a, r) => a + r.valor_pagado, 0)
      : (persRes.data || []).reduce((a, p) => a + p.valor_quincenal, 0)

    const pagoT = (turnosRes.data || []).reduce((a, r) => a + r.valor_total, 0)
    const gastosOp = (gastRes.data || []).filter(g => g.tipo === 'operativo')
    const gastosNoOp = (gastRes.data || []).filter(g => g.tipo === 'no_operativo')
    const totalGastosOp = gastosOp.reduce((a, g) => a + g.monto_total, 0)
    const totalGastosNoOp = gastosNoOp.reduce((a, g) => a + g.monto_total, 0)
    const totalNomina = pagoP + pagoF + pagoV + pagoC + nominaActiva + pagoT
    const ingresoBruto = tonP * corte.precio_carbon_ton
    const descFletes = tonP * corte.precio_flete_ton
    const ingresoNeto = ingresoBruto - descFletes
    const utilidad = ingresoNeto - totalNomina - totalGastosOp

    setReport({ corte, tonP, pagoP, metrosF, patiosF, pagoF, metrosV, pagoV, cochesC, pagoC, nominaActiva, pagoT, totalNomina, gastosOp, gastosNoOp, totalGastosOp, totalGastosNoOp, ingresoBruto, descFletes, ingresoNeto, utilidad })
    setLoading(false)
  }

  const exportarExcel = () => {
    if (!report) return
    import('xlsx').then(({ utils, writeFile }) => {
      const r = report
      const rows = [
        ['REPORTE DE CIERRE DE CORTE'],
        ['Corte:', r.corte.nombre],
        ['Período:', `${r.corte.fecha_inicio} — ${r.corte.fecha_fin}`],
        [],
        ['PRODUCCIÓN'],
        ['Total toneladas:', r.tonP.toFixed(3)],
        ['Precio venta carbón:', formatCOP(r.corte.precio_carbon_ton) + '/ton'],
        ['Ingreso bruto:', formatCOP(r.ingresoBruto)],
        ['(-) Fletes:', formatCOP(r.descFletes)],
        ['Ingreso neto:', formatCOP(r.ingresoNeto)],
        [],
        ['NÓMINA'],
        ['Picadores:', formatCOP(r.pagoP)],
        ['Cocheros:', formatCOP(r.pagoC)],
        ['Frenteros:', formatCOP(r.pagoF)],
        ['Ventilación:', formatCOP(r.pagoV)],
        ['Personal Operativo:', formatCOP(r.nominaActiva)],
        ['Turnos y Bonificaciones:', formatCOP(r.pagoT)],
        ['TOTAL NÓMINA:', formatCOP(r.totalNomina)],
        [],
        ['GASTOS OPERATIVOS'],
        ...r.gastosOp.map(g => [g.categoria, g.descripcion, formatCOP(g.monto_total)]),
        ['TOTAL GASTOS OP.:', formatCOP(r.totalGastosOp)],
        [],
        ['GASTOS NO OPERATIVOS'],
        ...r.gastosNoOp.map(g => [g.categoria, g.descripcion, formatCOP(g.monto_total)]),
        ['TOTAL NO OP.:', formatCOP(r.totalGastosNoOp)],
        [],
        ['RESULTADO FINAL'],
        ['Ingreso neto:', formatCOP(r.ingresoNeto)],
        ['(-) Nómina:', formatCOP(r.totalNomina)],
        ['(-) Gastos Op.:', formatCOP(r.totalGastosOp)],
        [r.utilidad >= 0 ? 'UTILIDAD:' : 'PÉRDIDA:', formatCOP(Math.abs(r.utilidad))],
      ]
      const ws = utils.aoa_to_sheet(rows)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Reporte')
      writeFile(wb, `Reporte_${r.corte.nombre.replace(/\s/g, '_')}.xlsx`)
    })
  }

  const exportarPDF = () => {
    if (!report) return
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF()
      const r = report
      let y = 20
      const line = (text, indent = 0, bold = false) => {
        if (bold) doc.setFont('helvetica', 'bold')
        else doc.setFont('helvetica', 'normal')
        doc.text(text, 14 + indent, y)
        y += 7
      }
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE DE CIERRE DE CORTE', 14, y); y += 10
      doc.setFontSize(10)
      line(`Corte: ${r.corte.nombre}`)
      line(`Período: ${r.corte.fecha_inicio} — ${r.corte.fecha_fin}`)
      y += 5
      doc.setFontSize(12); line('PRODUCCIÓN', 0, true); doc.setFontSize(10)
      line(`Total toneladas: ${r.tonP.toFixed(3)} ton`, 4)
      line(`Precio carbón: ${formatCOP(r.corte.precio_carbon_ton)}/ton`, 4)
      line(`Ingreso bruto: ${formatCOP(r.ingresoBruto)}`, 4)
      line(`(-) Fletes: -${formatCOP(r.descFletes)}`, 4)
      line(`Ingreso neto: ${formatCOP(r.ingresoNeto)}`, 4)
      y += 5
      doc.setFontSize(12); line('NÓMINA', 0, true); doc.setFontSize(10)
      line(`Picadores: ${formatCOP(r.pagoP)}`, 4)
      line(`Cocheros: ${formatCOP(r.pagoC)}`, 4)
      line(`Frenteros: ${formatCOP(r.pagoF)}`, 4)
      line(`Ventilación: ${formatCOP(r.pagoV)}`, 4)
      line(`Personal Operativo: ${formatCOP(r.nominaActiva)}`, 4)
      line(`Turnos/Bonos: ${formatCOP(r.pagoT)}`, 4)
      line(`TOTAL NÓMINA: ${formatCOP(r.totalNomina)}`, 4, true)
      y += 5
      doc.setFontSize(12); line('GASTOS OPERATIVOS', 0, true); doc.setFontSize(10)
      r.gastosOp.slice(0, 15).forEach(g => { line(`${g.categoria}: ${formatCOP(g.monto_total)}`, 4) })
      line(`TOTAL: ${formatCOP(r.totalGastosOp)}`, 4, true)
      y += 5
      doc.setFontSize(12); line('RESULTADO', 0, true); doc.setFontSize(11)
      line(`${r.utilidad >= 0 ? 'UTILIDAD' : 'PÉRDIDA'}: ${formatCOP(Math.abs(r.utilidad))}`, 4, true)
      doc.save(`Reporte_${r.corte.nombre.replace(/\s/g, '_')}.pdf`)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-mine-text">Reportes</h1>

      <div className="card flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="label">Seleccionar Corte</label>
          <select className="input" value={selected || ''} onChange={e => setSelected(e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {cortes.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.estado})</option>)}
          </select>
        </div>
        <button onClick={generateReport} disabled={!selected || loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Generando...' : 'Generar Reporte'}
        </button>
      </div>

      {report && (
        <>
          <div className="flex gap-3">
            <button onClick={exportarPDF} className="btn-secondary flex items-center gap-2 text-sm"><Download size={14} /> Exportar PDF</button>
            <button onClick={exportarExcel} className="btn-secondary flex items-center gap-2 text-sm"><FileSpreadsheet size={14} /> Exportar Excel</button>
          </div>

          <div className="card" id="reporte-contenido">
            <div className="border-b border-mine-border pb-4 mb-4">
              <h2 className="text-xl font-bold text-mine-text">{report.corte.nombre}</h2>
              <p className="text-mine-muted text-sm">{report.corte.fecha_inicio} — {report.corte.fecha_fin}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-mine-accent mb-3">PRODUCCIÓN</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-mine-muted">Total toneladas</span><span className="font-mono">{report.tonP.toFixed(3)} ton</span></div>
                  <div className="flex justify-between"><span className="text-mine-muted">Precio carbón</span><span className="font-mono">{formatCOP(report.corte.precio_carbon_ton)}/ton</span></div>
                  <div className="flex justify-between"><span className="text-mine-muted">Ingreso bruto</span><span className="font-mono">{formatCOP(report.ingresoBruto)}</span></div>
                  <div className="flex justify-between"><span className="text-mine-muted">(-) Fletes</span><span className="font-mono text-red-400">-{formatCOP(report.descFletes)}</span></div>
                  <div className="flex justify-between font-semibold border-t border-mine-border pt-1"><span>Ingreso neto</span><span className="font-mono text-green-400">{formatCOP(report.ingresoNeto)}</span></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-mine-accent mb-3">NÓMINA</h3>
                <div className="space-y-1.5 text-sm">
                  {[['Picadores', report.pagoP], ['Cocheros', report.pagoC], ['Frenteros', report.pagoF], ['Ventilación', report.pagoV], ['Personal Operativo', report.nominaActiva], ['Turnos/Bonos', report.pagoT]].map(([l, v]) => (
                    <div key={l} className="flex justify-between"><span className="text-mine-muted">{l}</span><span className="font-mono">{formatCOP(v)}</span></div>
                  ))}
                  <div className="flex justify-between font-semibold border-t border-mine-border pt-1"><span>Total Nómina</span><span className="font-mono text-mine-accent">{formatCOP(report.totalNomina)}</span></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-mine-accent mb-3">GASTOS OPERATIVOS</h3>
                <div className="space-y-1.5 text-sm max-h-48 overflow-y-auto">
                  {report.gastosOp.map(g => (
                    <div key={g.id} className="flex justify-between gap-2">
                      <span className="text-mine-muted truncate">{g.descripcion || g.categoria}</span>
                      <span className="font-mono text-red-400 shrink-0">{formatCOP(g.monto_total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t border-mine-border pt-1"><span>Total</span><span className="font-mono text-red-400">{formatCOP(report.totalGastosOp)}</span></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-mine-accent mb-3">GASTOS NO OPERATIVOS</h3>
                <div className="space-y-1.5 text-sm">
                  {report.gastosNoOp.length ? report.gastosNoOp.map(g => (
                    <div key={g.id} className="flex justify-between gap-2">
                      <span className="text-mine-muted truncate">{g.descripcion || g.categoria}</span>
                      <span className="font-mono text-slate-400 shrink-0">{formatCOP(g.monto_total)}</span>
                    </div>
                  )) : <span className="text-mine-muted text-xs">Sin gastos no operativos</span>}
                  {report.gastosNoOp.length > 0 && <div className="flex justify-between font-semibold border-t border-mine-border pt-1"><span>Total</span><span className="font-mono text-slate-400">{formatCOP(report.totalGastosNoOp)}</span></div>}
                </div>
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-xl border ${report.utilidad >= 0 ? 'bg-green-400/5 border-green-400/20' : 'bg-red-400/5 border-red-400/20'}`}>
              <h3 className="font-semibold text-lg mb-3">RESULTADO FINAL</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-mine-muted">Ingreso neto</span><span className="font-mono">{formatCOP(report.ingresoNeto)}</span></div>
                <div className="flex justify-between"><span className="text-mine-muted">(-) Nómina</span><span className="font-mono text-red-400">-{formatCOP(report.totalNomina)}</span></div>
                <div className="flex justify-between"><span className="text-mine-muted">(-) Gastos Operativos</span><span className="font-mono text-red-400">-{formatCOP(report.totalGastosOp)}</span></div>
                <div className={`flex justify-between font-bold text-lg border-t border-mine-border pt-2 ${report.utilidad >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{report.utilidad >= 0 ? '✅ UTILIDAD' : '🔴 PÉRDIDA'}</span>
                  <span className="font-mono">{formatCOP(report.utilidad)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
