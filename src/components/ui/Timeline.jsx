import React from 'react'
import { CheckCircle2, ShieldCheck, Clock } from 'lucide-react'

export default function Timeline({ items = [], emptyMessage = 'No history records found.' }) {
  if (!items || items.length === 0) {
    return <p className="timeline-empty-text">{emptyMessage}</p>
  }

  return (
    <div className="connected-timeline">
      {items.map((item, index) => (
        <div key={item.id || index} className="timeline-event-row">
          <div className="timeline-marker-col">
            <div className={`timeline-node ${item.verified ? 'node-verified' : 'node-default'}`}>
              {item.verified ? <ShieldCheck size={14} /> : <CheckCircle2 size={14} />}
            </div>
            {index < items.length - 1 && <div className="timeline-connector-line" />}
          </div>

          <div className="timeline-content-col">
            <div className="timeline-event-header">
              <strong className="timeline-event-title">{item.title}</strong>
              <span className="timeline-event-time">
                <Clock size={12} />
                <span>{item.time || item.timestamp}</span>
              </span>
            </div>

            <p className="timeline-event-desc">{item.detail || item.details}</p>

            {item.badge && (
              <span className="timeline-event-badge">{item.badge}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
