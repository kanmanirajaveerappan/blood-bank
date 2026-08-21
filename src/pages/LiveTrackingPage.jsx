import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import GoogleMapView from '../components/GoogleMapView'
import TrackingStatus from '../components/TrackingStatus'
import { ArrowLeft, Clock, RotateCcw, Navigation } from 'lucide-react'

const formatTime = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function ActivityTimeline({ events }) {
  return (
    <div className="activity-timeline">
      {events.map((event, i) => (
        <div key={i} className="timeline-event-row">
          <div className="timeline-marker-col">
            <div className={`timeline-node ${event.completed ? 'node-verified' : 'node-pending'}`}>
              {event.completed ? '✓' : '○'}
            </div>
            {i < events.length - 1 && <div className="timeline-connector-line" />}
          </div>
          <div className="timeline-content-col">
            <div className="timeline-event-header">
              <strong className="timeline-event-title">{event.title}</strong>
              <span className="timeline-event-time">{event.time}</span>
            </div>
            {event.detail && <p className="timeline-event-desc">{event.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LiveTrackingPage() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const [theme, setTheme] = useState('dark')
  const [request, setRequest] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: 11.0168, lng: 76.9558 })
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true)
      try {
        const response = await fetch(`http://${window.location.hostname || 'localhost'}:8000/api/v1/hospitals/requests/${requestId}`)
        const data = await response.json()
        if (data.success && data.data) {
          const r = data.data
          setRequest({
            id: r.id,
            bloodGroup: r.blood_group,
            units: r.units_required,
            urgency: r.urgency,
            hospitalName: r.hospital_name,
            hospitalLat: r.latitude || 11.0168,
            hospitalLng: r.longitude || 76.9558,
            emergencyLat: r.latitude || 11.0168,
            emergencyLng: r.longitude || 76.9558,
            status: r.status,
          })
          setMapCenter({ lat: r.latitude || 11.0168, lng: r.longitude || 76.9558 })
        }
      } catch (err) {
        console.warn('Failed to load request:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRequest()
  }, [requestId])

  const handleRefresh = () => {
    setLastRefresh(new Date())
  }

  const mapMarkers = request ? [
    { id: 'hospital', lat: request.hospitalLat, lng: request.hospitalLng, type: 'hospital', label: request.hospitalName },
    { id: 'emergency', lat: request.emergencyLat, lng: request.emergencyLng, type: 'emergency', label: 'Emergency Destination' },
    ...(currentLocation ? [{ id: 'current', lat: currentLocation.lat, lng: currentLocation.lng, type: 'current', label: 'Current Position' }] : []),
  ] : []

  return (
    <div className={`lifelink-app-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <Navbar theme={theme} setTheme={setTheme} />

      <main className="portal-main-container">
        {/* Header */}
        <div className="page-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="ghost-button small-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <span className="eyebrow">Live Tracking</span>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="tracking-live-dot-header" />
                Emergency Live Tracking
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="live-pulse-chip">
              <span className="pulse-dot" /> LIVE
            </span>
            <button type="button" className="secondary-button small-btn" onClick={handleRefresh}>
              <RotateCcw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Tracking Status Bar */}
        <div className="panel tracking-status-summary-panel">
          <div className="tracking-summary-grid">
            <div className="tracking-summary-item">
              <span className="tracking-summary-label">Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="tracking-pulse-dot" />
                <strong style={{ color: 'var(--success)' }}>ACTIVE</strong>
              </div>
            </div>
            <div className="tracking-summary-item">
              <span className="tracking-summary-label">Request</span>
              <code>{request?.id || requestId}</code>
            </div>
            <div className="tracking-summary-item">
              <span className="tracking-summary-label">Blood</span>
              <span className="blood-tag">{request?.bloodGroup || '—'}</span>
            </div>
            <div className="tracking-summary-item">
              <span className="tracking-summary-label">Urgency</span>
              <span className={`urgency-pill urgency-${(request?.urgency || 'critical').toLowerCase()}`}>{request?.urgency || 'Critical'}</span>
            </div>
            <div className="tracking-summary-item">
              <span className="tracking-summary-label">Last Refresh</span>
              <span style={{ color: 'var(--text-subtle)', fontSize: '0.82rem' }}>
                <Clock size={12} /> {formatTime(lastRefresh)}
              </span>
            </div>
          </div>
        </div>

        {/* Main 2-column: Map + Info */}
        <div className="tracking-page-layout">
          {/* Map */}
          <div className="tracking-map-section">
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="nav-panel-inner-header">
                <span className="tracking-pulse-dot" />
                Live Emergency Map {loading ? '(Loading...)' : ''}
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  Hospital → Route → Destination
                </span>
              </div>
              <GoogleMapView
                center={mapCenter}
                zoom={13}
                height={520}
                theme={theme}
                markers={mapMarkers}
                showLegend={true}
                showControls={true}
                mode="tracking"
              />
            </div>

            {/* Map Action Buttons */}
            <div className="tracking-map-actions">
              <button type="button" className="secondary-button" onClick={() => setMapCenter({ lat: request?.hospitalLat || 13.0827, lng: request?.hospitalLng || 80.2707 })}>
                ⊕ Re-center Map
              </button>
              <button type="button" className="secondary-button" onClick={() => {
                if (!request) return
                const url = `https://www.google.com/maps/dir/?api=1&origin=${request.hospitalLat},${request.hospitalLng}&destination=${request.emergencyLat},${request.emergencyLng}&travelmode=driving`
                window.open(url, '_blank', 'noopener,noreferrer')
              }}>
                <Navigation size={14} /> Get Directions
              </button>
              <button type="button" className="secondary-button" onClick={handleRefresh}>
                <RotateCcw size={14} /> Refresh Location
              </button>
            </div>
          </div>

          {/* Right Rail: Tracking Controls & Live Updates */}
          <div className="tracking-side-panel">
            <TrackingStatus
              requestId={requestId}
              hospitalName={request?.hospitalName || 'Emergency Medical Center'}
              emergencyLocation={request ? { lat: request.emergencyLat, lng: request.emergencyLng } : null}
              onTrackingStart={(pos) => setCurrentLocation(pos)}
              onTrackingStop={() => setCurrentLocation(null)}
            />

            {/* Quick telemetry summary */}
            <div className="panel">
              <div className="route-info-mini-grid">
                <div className="route-info-mini-item">
                  <span>Target Distance</span>
                  <strong>~4.8 km</strong>
                </div>
                <div className="route-info-mini-item">
                  <span>ETA</span>
                  <strong>~14 min</strong>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="panel">
              <span className="micro-label">Activity Timeline</span>
              <div style={{ marginTop: 12 }}>
                <ActivityTimeline
                  events={[
                    { title: 'Emergency Broadcast Initiated', time: '10:00 AM', detail: 'KNN matching dispatched notifications to nearby eligible donors.', completed: true },
                    { title: 'Donor Accepted Request', time: '10:03 AM', detail: 'Donor confirmed dispatch and is en route to facility.', completed: true },
                    { title: 'In-Transit Route Tracking', time: '10:05 AM', detail: 'Real-time GPS telemetry active.', completed: request?.status !== 'CANCELLED' },
                    { title: 'Arrival & Blood Verification', time: 'Pending', detail: 'Final clinical screening at hospital blood bank.', completed: request?.status === 'FULFILLED' || request?.status === 'Delivered' },
                  ]}
                />
              </div>
            </div>

            {/* Privacy notice */}
            <div className="nav-privacy-notice">
              🔒 Location data shared only with authorized hospital staff for this emergency.
              Tracking stops automatically when the emergency is resolved.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
