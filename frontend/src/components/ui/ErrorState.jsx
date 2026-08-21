import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while processing this emergency workflow.',
  onRetry,
}) {
  return (
    <div className="error-state-box">
      <div className="error-state-icon-wrap">
        <AlertTriangle size={32} />
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <button type="button" className="primary-button error-retry-btn" onClick={onRetry}>
          <RefreshCw size={14} /> Try Again
        </button>
      )}
    </div>
  )
}
