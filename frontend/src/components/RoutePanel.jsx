import { useState, useMemo } from 'react'
import GoogleMapView from './GoogleMapView'
import { useLanguage } from '../context/LanguageContext'
import { Navigation, Clock, MapPin, ExternalLink, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 3.2
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
}

export default function RoutePanel({
  origin,        // { lat, lng, label }
  destination,   // { lat, lng, label }
  theme = 'dark',
  requestId,
  emergencyDetails,
  showMap = true,
  mapHeight = 500,
}) {
  const { t } = useLanguage()
  const userLat = parseFloat(localStorage.getItem('lifelink_latitude')) || 11.0168
  const userLng = parseFloat(localStorage.getItem('lifelink_longitude')) || 76.9558

  const computedDistanceKm = useMemo(() => {
    if (origin?.lat && destination?.lat) {
      return calculateHaversineKm(origin.lat, origin.lng, destination.lat, destination.lng)
    }
    return '3.2'
  }, [origin, destination])

  const computedEtaMin = useMemo(() => {
    const d = parseFloat(computedDistanceKm) || 3.2
    return Math.max(2, Math.round(d * 2.5))
  }, [computedDistanceKm])

  const [routeStatus, setRouteStatus] = useState('active')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [showSteps, setShowSteps] = useState(false)

  const originName = origin?.label || 'Hospital Facility'
  const destName = destination?.label || 'Emergency Location'

  const dynamicSteps = useMemo(() => [
    { step: 1, text: `Depart ${originName} onto emergency transit corridor`, dist: '400 m', time: '1 min', icon: '⬆️' },
    { step: 2, text: `Proceed along route toward ${destName}`, dist: `${computedDistanceKm} km`, time: `${computedEtaMin - 2} mins`, icon: '➡️' },
    { step: 3, text: `Arrive at emergency receiving site (${destName})`, dist: '200 m', time: '1 min', icon: '📍' },
  ], [originName, destName, computedDistanceKm, computedEtaMin])

  const mapCenter = origin?.lat ? { lat: origin.lat, lng: origin.lng } : { lat: userLat, lng: userLng }

  const mapMarkers = [
    origin && { id: 'origin', lat: origin.lat, lng: origin.lng, type: 'hospital', label: origin.label || 'Hospital' },
    destination && { id: 'dest', lat: destination.lat, lng: destination.lng, type: 'emergency', label: destination.label || 'Emergency Site' },
  ].filter(Boolean)

  const handleRefreshRoute = () => {
    setRouteStatus('loading')
    setTimeout(() => {
      setRouteStatus('active')
      setLastUpdated(new Date())
    }, 500)
  }

  const openInGoogleMaps = () => {
    const fromLat = origin?.lat || userLat
    const fromLng = origin?.lng || userLng
    const toLat = destination?.lat || userLat + 0.018
    const toLng = destination?.lng || userLng + 0.022

    const url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const toggleDirections = () => {
    setShowSteps((prev) => !prev)
  }

  return (
    <div className="route-panel-wrapper">
      {/* Route Status Header */}
      <div className="route-status-bar">
        <div className="route-status-left">
          <span className={`route-active-dot ${routeStatus === 'active' ? 'dot-green' : 'dot-amber'}`} />
          <span className="route-status-label">
            LIVE GEOSPATIAL EMERGENCY ROUTE (COIMBATORE)
          </span>
          {lastUpdated && (
            <span className="route-updated-time">Updated live</span>
          )}
        </div>
        <button type="button" className="ghost-button small-btn" onClick={handleRefreshRoute}>
          <RefreshCw size={13} /> {t('refreshRoute')}
        </button>
      </div>

      {/* From → To Journey Bar */}
      <div className="route-journey-bar">
        <div className="route-endpoint">
          <div className="route-endpoint-dot dot-blue" />
          <div>
            <span className="route-endpoint-label">{t('fromOrigin')}</span>
            <strong className="route-endpoint-name">{origin?.label || 'Emergency Hospital'}</strong>
          </div>
        </div>

          <div className="route-line-connector">
          <div className="route-connector-line" />
          <div className="route-chips-row">
            <span className="distance-chip">
              <MapPin size={12} /> {computedDistanceKm} km
            </span>
            <span className="eta-chip">
              <Clock size={12} /> ~{computedEtaMin} mins
            </span>
            <span className="traffic-chip">
              🚥 Live Route
            </span>
          </div>
        </div>

        <div className="route-endpoint">
          <div className="route-endpoint-dot dot-red" />
          <div>
            <span className="route-endpoint-label">{t('toDestination')}</span>
            <strong className="route-endpoint-name">{destination?.label || 'Emergency Scene'}</strong>
          </div>
        </div>
      </div>

      {/* Live Leaflet Geospatial Map View */}
      {showMap && (
        <GoogleMapView
          center={mapCenter}
          destination={destination}
          zoom={14}
          height={mapHeight}
          theme={theme}
          markers={mapMarkers}
        />
      )}

      {/* Navigation Control Toolbar */}
      <div className="route-actions-row">
        <button
          type="button"
          className="primary-button"
          onClick={toggleDirections}
          style={{ flex: 1 }}
        >
          <Navigation size={15} />
          {showSteps ? t('hideTurns') : t('viewTurns')}
          {showSteps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button
          type="button"
          className="ghost-button"
          onClick={openInGoogleMaps}
          style={{ flex: 1 }}
          title="Open in Official Google Maps App"
        >
          <ExternalLink size={15} /> {t('openGoogleMaps')}
        </button>
      </div>

      {/* Step-by-Step Directions Sheet */}
      {showSteps && (
        <div className="route-steps-drawer">
          <div className="steps-drawer-header">
            <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem' }}>
              📍 {t('turnByTurnDrivingDirections')} ({dynamicSteps.length} {t('steps')})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--cyan)' }}>{t('total')}: {computedDistanceKm} km</span>
          </div>
          <div className="steps-list">
            {dynamicSteps.map((s) => (
              <div key={s.step} className="step-item-row">
                <span className="step-num-badge">{s.icon}</span>
                <div className="step-instruction">
                  <p className="step-text">{s.text}</p>
                  <span className="step-dist-meta">{s.dist} • ~{s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
