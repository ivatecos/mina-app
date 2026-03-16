import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import useStore from '../store/useStore'

const icons = {
  success: <CheckCircle size={18} className="text-green-400" />,
  error: <XCircle size={18} className="text-red-400" />,
  warning: <AlertCircle size={18} className="text-yellow-400" />,
}

export default function Toast() {
  const { toasts, removeToast } = useStore()
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 bg-mine-surface border border-mine-border rounded-lg px-4 py-3 shadow-xl min-w-64 max-w-sm animate-fade-in"
        >
          {icons[t.type] || icons.success}
          <span className="text-sm flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-mine-muted hover:text-mine-text">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
