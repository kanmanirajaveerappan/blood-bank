import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

export default function Toast({ type = 'success', message, onClose }) {
  if (!message) return null

  const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-400" />,
    warning: <AlertTriangle size={16} className="text-amber-400" />,
    error: <AlertTriangle size={16} className="text-rose-400" />,
    info: <Info size={16} className="text-cyan-400" />,
  }

  return (
    <div className={`toast-notification toast-${type}`}>
      <div className="toast-content">
        {icons[type] || icons.info}
        <span className="toast-message">{message}</span>
      </div>
      {onClose && (
        <button type="button" className="toast-close-btn" onClick={onClose}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}
