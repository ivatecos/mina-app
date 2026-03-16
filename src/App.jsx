import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import useStore from './store/useStore'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardMinistro from './pages/DashboardMinistro'
import Cortes from './pages/Cortes'
import Tarifas from './pages/Tarifas'
import PersonalOperativo from './pages/PersonalOperativo'
import Picadores from './pages/Picadores'
import Frenteros from './pages/Frenteros'
import Ventilacion from './pages/Ventilacion'
import Cocheros from './pages/Cocheros'
import GastosOperativos from './pages/GastosOperativos'
import Reportes from './pages/Reportes'

export default function App() {
  const { setUser, loadCorteActivo } = useStore()
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase.from('usuarios').select('*').eq('id', session.user.id).single()
        if (data) {
          setUser(session.user, data.rol)
          loadCorteActivo()
        }
      }
      setAuthReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') useStore.getState().clearUser()
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!authReady) return (
    <div className="min-h-screen bg-mine-bg flex items-center justify-center">
      <div className="text-mine-muted text-sm">Cargando...</div>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ProtectedRoute roles={['administrador']}><Dashboard /></ProtectedRoute>} />
          <Route path="ministro" element={<ProtectedRoute roles={['ministro','administrador']}><DashboardMinistro /></ProtectedRoute>} />
          <Route path="cortes" element={<ProtectedRoute roles={['administrador']}><Cortes /></ProtectedRoute>} />
          <Route path="tarifas" element={<ProtectedRoute roles={['administrador']}><Tarifas /></ProtectedRoute>} />
          <Route path="personal" element={<ProtectedRoute roles={['administrador']}><PersonalOperativo /></ProtectedRoute>} />
          <Route path="picadores" element={<ProtectedRoute><Picadores /></ProtectedRoute>} />
          <Route path="frenteros" element={<ProtectedRoute><Frenteros /></ProtectedRoute>} />
          <Route path="ventilacion" element={<ProtectedRoute><Ventilacion /></ProtectedRoute>} />
          <Route path="cocheros" element={<ProtectedRoute><Cocheros /></ProtectedRoute>} />
          <Route path="gastos" element={<ProtectedRoute><GastosOperativos /></ProtectedRoute>} />
          <Route path="reportes" element={<ProtectedRoute roles={['administrador']}><Reportes /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
