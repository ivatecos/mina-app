import { supabase } from './supabase'
import useStore from '../store/useStore'

/**
 * Registra una acción en el audit log.
 * @param {string} accion  - 'CREÓ' | 'EDITÓ' | 'ELIMINÓ'
 * @param {string} modulo  - 'picadores' | 'frenteros' | 'ventilacion' | 'cocheros' | 'gastos' | 'cortes' | 'personal'
 * @param {string} detalle - descripción legible de los datos afectados
 */
export const logAudit = async (accion, modulo, detalle) => {
  const { user, userRole, corteActivo } = useStore.getState()
  await supabase.from('audit_log').insert({
    usuario_email: user?.email || 'desconocido',
    usuario_rol: userRole,
    accion,
    modulo,
    detalle,
    corte_id: corteActivo?.id || null,
    corte_nombre: corteActivo?.nombre || null,
  })
}
