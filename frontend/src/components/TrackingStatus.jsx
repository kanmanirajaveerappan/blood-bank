import { useState, useEffect, useRef } from 'react'
import { Radio, RadioTower, Square, RotateCcw, MapPin, Clock, Navigation } from 'lucide-react'

export default function TrackingStatus({
  requestId,
  hospitalName = 'Emergency Medical Center',
  emergencyLocation = null,
  onTrackingStart,
  onTrackingStop,
  role = 'hospital',
}) {
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [eta, setEta] = useState(null)
  const [distance, setDistance] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const watchRef = useRef(null)
  const timerRef = useRef(null)

  // Update "seconds ago" display
  useEffect(() => {
    if (!lastUpdated) return
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  // Compute estimated distance to emergency (simple haversine)
  const computeDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
  }

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setShowConsent(false)
    setIsTracking(true)

    // Throttle: update at most every 15 seconds
    let lastUpdate = 0
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        if (now - lastUpdate < 15000) return
        lastUpdate = now

        const { latitude, longitude, accuracy: acc } = pos.coords
        setCurrentLocation({ lat: latitude, lng: longitude })
        setAccuracy(Math.round(acc))
        setLastUpdated(now)
        setSecondsAgo(0)

        if (emergencyLocation?.lat && emergencyLocation?.lng) {
          const dist = computeDistance(latitude, longitude, emergencyLocation.lat, emergencyLocation.lng)
          setDistance(dist)
          setEta(Math.round(parseFloat(dist) * 2.5) + ' min') // rough: 2.5 min/km
        }

        onTrackingStart && onTrackingStart({ lat: latitude, lng: longitude })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true)
          setIsTracking(false)
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 14000 }
    )
  }

  const stopTracking = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setIsTracking(false)
    setCurrentLocation(null)
    onTrackingStop && onTrackingStop()
  }

  useEffect(() => () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
  }, [])

  if (permissionDenied) {
    return (
      <div className="tracking-permission-denied">
        <MapPin size={20} style={{ color: 'var(--danger)' }} />
        <p>Location permission is disabled.</p>
        <small>Enable location access in your browser settings to use live tracking.</small>
      </div>
    )
  }

  if (!isTracking && !showConsent) {
    return (
      <div className="tracking-consent-card">
        <div className="tracking-consent-header">
          <RadioTower size={18} style={{ color: 'var(--cyan)' }} />
          <span>Live Emergency Tracking</span>
        </div>
        <p className="tracking-consent-text">
          Sharing your location helps calculate distance and provide emergency navigation for <strong>{hospitalName}</strong>. Your location is shared only for this authorized emergency workflow.
        </p>
        <div className="tracking-consent-actions">
          <button type="button" className="primary-button" onClick={() => setShowConsent(true)}>
            <Radio size={14} /> Start Tracking
          </button>
          <button type="button" className="ghost-button" onClick={() => {}}>
            Not Now
          </button>
        </div>
      </div>
    )
  }

  if (showConsent && !isTracking) {
    return (
      <div className="tracking-consent-card">
        <p className="tracking-consent-text tracking-consent-warning">
          ⚠️ <strong>Location sharing is active for this emergency workflow.</strong> Your current position will be shared with authorized hospital staff only, and tracking will automatically stop when the emergency is resolved.
        </p>
        <div className="tracking-consent-actions">
          <button type="button" className="primary-button" onClick={startTracking}>
            <Radio size={14} /> Allow & Start Tracking
          </button>
          <button type="button" className="ghost-button" onClick={() => setShowConsent(false)}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tracking-active-panel">
      {/* Status Bar */}
      <div className="tracking-status-bar">
        <div className="tracking-status-left">
          <span className="tracking-pulse-dot" />
          <span className="tracking-status-label">TRACKING ACTIVE</span>
          <span className="tracking-update-time">
            <Clock size={12} /> Updated {secondsAgo}s ago
          </span>
        </div>
        <button type="button" className="tracking-stop-btn" onClick={stopTracking}>
          <Square size={12} /> Stop Tracking
        </button>
      </div>

      {/* Live metrics */}
      <div className="tracking-metrics-row">
        {distance && (
          <div className="tracking-metric-chip">
            <span className="tracking-metric-label">Distance</span>
            <strong className="tracking-metric-value">{distance} km</strong>
          </div>
        )}
        {eta && (
          <div className="tracking-metric-chip">
            <span className="tracking-metric-label">ETA</span>
            <strong className="tracking-metric-value">{eta}</strong>
          </div>
        )}
        {accuracy && (
          <div className="tracking-metric-chip">
            <span className="tracking-metric-label">Accuracy</span>
            <strong className="tracking-metric-value">±{accuracy}m</strong>
          </div>
        )}
      </div>

      <div className="tracking-privacy-notice">
        <span>📍 Location sharing is active for this emergency workflow.</span>
        <button type="button" className="ghost-button small-btn" onClick={stopTracking}>
          Stop
        </button>
      </div>
    </div>
  )
}
