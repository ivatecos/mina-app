export const formatCOP = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const formatNumber = (value) => {
  if (!value && value !== 0) return '0'
  return new Intl.NumberFormat('es-CO').format(value)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export const FRENTES = ['frente1', 'frente2', 'frente3']
export const FRENTE_LABELS = { frente1: 'Frente 1', frente2: 'Frente 2', frente3: 'Frente 3' }

export const ESTADO_LABELS = { abierto: 'Abierto', cerrado: 'Cerrado', archivado: 'Archivado' }
export const ESTADO_COLORS = {
  abierto: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  cerrado: 'text-red-400 bg-red-400/10 border-red-400/30',
  archivado: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
}

export const CATEGORIAS_GASTOS = [
  'Combustible / Canecas',
  'Mantenimiento planta',
  'Mantenimiento malacate',
  'Mantenimiento cargador',
  'Impuesto cargador',
  'Compras mineras / Insumos',
  'Madera',
  'Clarato / Explosivos',
  'Barbachas de fletes',
  'Transporte de mineros',
  'Transporte Cúcuta',
  'Peajes',
  'Mercado general',
  'Víveres / Verduras / Carnes',
  'Impuesto por tonelada',
  'Aportes carretera / infraestructura',
  'Compras para estructura',
  'Gastos varios',
  'Pagos varios mina',
  'Otro',
]
