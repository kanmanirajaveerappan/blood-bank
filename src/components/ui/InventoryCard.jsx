import { Droplet, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function InventoryCard({
  bloodGroup,
  units,
  status = 'NORMAL', // NORMAL | LOW | CRITICAL | EXPIRING
  distanceKm,
  lastUpdated,
  onReserve,
}) {
  const statusColors = {
    NORMAL: 'badge-emerald',
    LOW: 'badge-amber',
    CRITICAL: 'badge-danger',
    EXPIRING: 'badge-amber',
  }

  const isLowOrCritical = status === 'LOW' || status === 'CRITICAL'

  return (
    <div className={`inventory-blood-card ${isLowOrCritical ? 'status-alert-border' : ''}`}>
      <div className="ibc-header">
        <div className="ibc-blood-group-badge">
          <Droplet size={14} className="text-red-500" />
          <span>{bloodGroup}</span>
        </div>
        <span className={`status-badge-pill ${statusColors[status] || 'badge-neutral'}`}>
          {status}
        </span>
      </div>

      <div className="ibc-units-row">
        <span className="ibc-units-value">{units}</span>
        <span className="ibc-units-label">Units in Stock</span>
      </div>

      <div className="ibc-footer">
        {distanceKm && <span className="ibc-meta">📍 {distanceKm} km away</span>}
        {lastUpdated && <span className="ibc-meta">🕒 {lastUpdated}</span>}
        {onReserve && (
          <button
            type="button"
            className="small-btn primary-button"
            onClick={() => onReserve(bloodGroup)}
          >
            Reserve
          </button>
        )}
      </div>
    </div>
  )
}
