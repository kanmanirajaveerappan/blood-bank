import { useState, useEffect } from 'react'
import { MapPin, Clock, Wifi, ShieldCheck, AlertTriangle } from 'lucide-react'

const FRESHNESS_CONFIG = {
  FRESH: { color: 'var(--success)', dot: 'dot-green', text: 'Fresh', maxAgeMin: 5 },
  RECENT: { color: 'var(--warning)', dot: 'dot-amber', text: 'Recent', maxAgeMin: 30 },
  STALE: { color: 'var(--danger)', dot: 'dot-red', text: 'Stale', maxAgeMin: Infinity },
  UNKNOWN: { color: 'var(--text-subtle)', dot: 'dot-grey', text: 'Unknown', maxAgeMin: Infinity },
}

function getFreshness(lastUpdatedDate) {
  if (!lastUpdatedDate) return 'UNKNOWN'
  const minutesAgo = (Date.now() - new Date(lastUpdatedDate).getTime()) / 60000
  if (minutesAgo < 5) return 'FRESH'
  if (minutesAgo < 30) return 'RECENT'
  return 'STALE'
}

export default function LocationStatus({
  region = 'Coimbatore',
  lastUpdated = null,
  freshness = null,
  showPrivacyToggle = true,
  privacyMask = true,
  onPrivacyChange,
  onReverify,
  isVerifying = false,
  role = 'donor', // 'donor' | 'hospital' | 'admin'
}) {
  const [timeAgo, setTimeAgo] = useState('Just now')
  const computedFreshness = freshness || getFreshness(lastUpdated)
  const config = FRESHNESS_CONFIG[computedFreshness] || FRESHNESS_CONFIG.UNKNOWN

  useEffect(() => {
    const update = () => {
      if (!lastUpdated) { setTimeAgo('Unknown'); return }
      const seconds = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000)
      if (seconds < 60) setTimeAgo(`${seconds}s ago`)
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)} min ago`)
      else setTimeAgo(`${Math.floor(seconds / 3600)} hr ago`)
    }
    update()
    const interval = setInterval(update, 15000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  return (
    <div className="location-status-card">
      <div className="location-status-header">
        <div className="location-status-title-row">
          <MapPin size={16} style={{ color: 'var(--cyan)' }} />
          <span className="location-status-title">Location Status</span>
        </div>
        <div className={`location-freshness-badge freshness-${computedFreshness.toLowerCase()}`}>
          <span className={`freshness-dot ${config.dot}`} />
          <span>{config.text}</span>
        </div>
      </div>

      <div className="location-details-grid">
        <div className="location-detail-row">
          <span className="location-detail-label">Approximate Region</span>
          <strong className="location-detail-value">{region}</strong>
        </div>

        <div className="location-detail-row">
          <span className="location-detail-label">
            <Clock size={12} /> Last Updated
          </span>
          <strong className="location-detail-value" style={{ color: config.color }}>
            {timeAgo}
          </strong>
        </div>

        {computedFreshness === 'STALE' && (
          <div className="location-stale-warning">
            <AlertTriangle size={13} />
            <span>Location data is outdated. Please re-verify your GPS.</span>
          </div>
        )}
      </div>

      {/* Privacy controls (donor only) */}
      {showPrivacyToggle && role === 'donor' && (
        <div className="location-privacy-section">
          <div className="privacy-section-header">
            <ShieldCheck size={14} style={{ color: 'var(--cyan)' }} />
            <span className="privacy-section-title">Privacy Controls</span>
          </div>
          <label className="privacy-toggle-label">
            <input
              type="checkbox"
              checked={privacyMask}
              onChange={(e) => onPrivacyChange && onPrivacyChange(e.target.checked)}
              className="privacy-checkbox"
            />
            <span>Mask exact coordinates from hospitals (~1km circle)</span>
          </label>
          <p className="location-consent-note">
            Your location helps calculate distance for emergency matching. Shared only for authorized emergency workflows.
          </p>
        </div>
      )}

      {/* Re-verify button */}
      <button
        type="button"
        className="secondary-button wide-button"
        onClick={onReverify}
        disabled={isVerifying}
      >
        {isVerifying ? (
          <><span className="spinner-dot" /> Verifying GPS...</>
        ) : (
          <><MapPin size={14} /> Re-verify GPS Location</>
        )}
      </button>

      {freshness === 'FRESH' && (
        <div className="location-verified-notice">
          <Wifi size={13} style={{ color: 'var(--success)' }} />
          <span>Location verified and active</span>
        </div>
      )}
    </div>
  )
}
