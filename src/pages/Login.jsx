import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardHat, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser, addToast } = useStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (userError || !userData) throw new Error('Usuario no encontrado en el sistema')
      if (!userData.activo) throw new Error('Usuario desactivado. Contacte al administrador.')

      setUser(data.user, userData.rol)
      addToast(`Bienvenido, ${userData.nombre}`, 'success')
      navigate(userData.rol === 'administrador' ? '/dashboard' : '/ministro')
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-mine-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="card shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-mine-accent/10 border border-mine-accent/30 rounded-2xl flex items-center justify-center mb-4">
              <HardHat className="text-mine-accent" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-mine-text">MinaApp</h1>
            <p className="text-mine-muted text-sm mt-1">Sistema Operacional Minero</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@mina.com"
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mine-muted hover:text-mine-text"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary py-3 mt-2 disabled:opacity-50">
              {loading ? 'Iniciando sesión...' : 'Ingresar'}
            </button>
          </form>
        </div>
        <p className="text-center text-mine-muted text-xs mt-6">
          Acceso restringido — Solo personal autorizado
        </p>
      </div>
    </div>
  )
}
