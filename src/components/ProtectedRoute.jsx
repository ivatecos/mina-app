import { Navigate } from 'react-router-dom'
import useStore from '../store/useStore'

export default function ProtectedRoute({ children, roles }) {
  const { user, userRole } = useStore()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(userRole)) return <Navigate to="/" replace />
  return children
}
