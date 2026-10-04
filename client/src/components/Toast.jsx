import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

const icons = {
  success: <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />,
  error: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
}

const styles = {
  success: 'bg-white border-green-300 text-green-800',
  error: 'bg-white border-red-300 text-red-800',
  warning: 'bg-white border-amber-300 text-amber-800',
}

export default function Toast({ message, type = 'success', onDismiss, duration = 4000 }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded border shadow-sm text-sm max-w-sm ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="ml-1 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
