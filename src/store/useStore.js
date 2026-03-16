import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useStore = create((set, get) => ({
  user: null,
  userRole: null,
  corteActivo: null,
  toasts: [],

  setUser: (user, role) => set({ user, userRole: role }),
  clearUser: () => set({ user: null, userRole: null }),

  setCorteActivo: (corte) => set({ corteActivo: corte }),

  addToast: (message, type = 'success') => {
    const id = Date.now()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3500)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  loadCorteActivo: async () => {
    const { data } = await supabase
      .from('cortes')
      .select('*')
      .eq('estado', 'abierto')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) set({ corteActivo: data })
  },
}))

export default useStore
