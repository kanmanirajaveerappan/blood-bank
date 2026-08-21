import React from 'react'
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react'

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There is currently no data to display in this section.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon-wrap">
        <Icon size={28} />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="secondary-button small-btn" onClick={onAction}>
          <RefreshCw size={13} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  )
}

export function LoadingSkeleton({ rows = 3, type = 'card' }) {
  if (type === 'stats') {
    return (
      <div className="skeleton-stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card skeleton-stat-box shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div className="skeleton-container">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-card shimmer" />
      ))}
    </div>
  )
}

export default EmptyState

