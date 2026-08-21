import { MapPin, Clock, Check, Eye } from 'lucide-react'
import StatusBadge from './StatusBadge'

export default function EmergencyCard({
  alert,
  onAccept,
  onDecline,
  onViewDetails,
  isHero = false,
}) {
  if (!alert) return null

  const isAccepted = alert.status === 'ACCEPTED'
  const isDeclined = alert.status === 'DECLINED'

  return (
    <div className={`emergency-request-card ${isHero ? 'hero-emergency-card' : ''} ${alert.urgency?.toLowerCase()}`}>
      <div className="emergency-card-left">
        <div className="emergency-indicator-bar" />
        <div className="emergency-meta-primary">
          <div className="emergency-top-row">
            <StatusBadge status={alert.urgency || 'CRITICAL'} size="small" />
            <span className="emergency-blood-pill">
              <strong>{alert.blood_group || alert.bloodGroup || 'O+'}</strong>
              <small>{alert.units || alert.units_required || 2} Units Needed</small>
            </span>
            <span className="emergency-time">
              <Clock size={13} />
              <span>{alert.time || alert.created_at || 'Just now'}</span>
            </span>
          </div>

          <h3 className="emergency-hospital-name">
            {alert.hospital || alert.hospital_name || 'Emergency Medical Facility'}
          </h3>

          <div className="emergency-sub-info">
            <span className="emergency-dist-chip">
              <MapPin size={13} />
              <span>{alert.distance || alert.distance_km || '3.2 km'} away</span>
            </span>
            {alert.required_by && (
              <span className="emergency-target-chip">
                Target: {alert.required_by}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="emergency-card-actions">
        {isAccepted ? (
          <span className="action-confirmed-badge">
            <Check size={14} /> Accepted • In Transit
          </span>
        ) : isDeclined ? (
          <span className="action-declined-badge">
            Unavailable
          </span>
        ) : (
          <>
            {onViewDetails && (
              <button
                type="button"
                className="secondary-button small-btn"
                onClick={() => onViewDetails(alert)}
              >
                <Eye size={14} /> Details
              </button>
            )}
            {onAccept && (
              <button
                type="button"
                className="primary-button small-btn accept-urgent-btn"
                onClick={() => onAccept(alert.id || alert.alert_id)}
              >
                <Check size={14} /> Accept Request
              </button>
            )}
            {onDecline && (
              <button
                type="button"
                className="ghost-button small-btn"
                onClick={() => onDecline(alert.id || alert.alert_id)}
              >
                Decline
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
