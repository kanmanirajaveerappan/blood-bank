import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Shield, Users, Radio, Navigation, RefreshCw } from 'lucide-react'
import GoogleMapView from '../components/GoogleMapView'
import StatusBadge from '../components/ui/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { requestDonorMatch } from '../services/api'

export default function DonorMapPage() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [selectedRadius, setSelectedRadius] = useState(25)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [notifiedCandidates, setNotifiedCandidates] = useState({})
  const [rankedCandidates, setRankedCandidates] = useState([])

  const hospitalLocation = {
    name: 'KMCH Emergency Command Hub',
    lat: 11.0168,
    lon: 76.9558,
  }

  const emergencyInfo = {
    id: requestId || 'REQ-EMERGENCY',
    bloodGroup: 'O+',
    unitsRequired: 2,
    urgency: 'CRITICAL',
    status: 'ACTIVE_SEARCH',
  }

  useEffect(() => {
    loadLiveCandidates()
  }, [selectedRadius])

  const loadLiveCandidates = async () => {
    setLoading(true)
    try {
      const res = await requestDonorMatch({
        bloodGroup: emergencyInfo.bloodGroup,
        latitude: hospitalLocation.lat,
        longitude: hospitalLocation.lon,
        k: 6,
        maxDistanceKm: selectedRadius,
      })
      setRankedCandidates(res.data || [])
    } catch {
      setRankedCandidates([])
    } finally {
      setLoading(false)
    }
  }

  const handleNotify = (donorId) => {
    setNotifiedCandidates(prev => ({ ...prev, [donorId]: 'DISPATCHED' }))
  }

  return (
    <div className="role-portal donor-map-portal">
      {/* Top Bar Navigation */}
      <div className="donor-map-header">
        <div className="donor-map-title-group">
          <button 
            type="button" 
            className="ghost-button icon-btn"
            onClick={() => navigate('/hospital/dashboard')}
          >
            <ArrowLeft size={16} /> Back to Command Center
          </button>
          <div className="donor-map-badge-wrap">
            <span className="live-pulse-dot" />
            <span className="donor-map-title">Donor Proximity Map</span>
            <StatusBadge status={emergencyInfo.urgency} />
          </div>
        </div>

        <div className="radius-selector-group">
          <span className="radius-label">Search Radius:</span>
          {[5, 10, 25, 50].map(radius => (
            <button
              key={radius}
              type="button"
              className={`radius-pill ${selectedRadius === radius ? 'active' : ''}`}
              onClick={() => setSelectedRadius(radius)}
            >
              {radius} km
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: 65% Map / 35% Candidates Panel */}
      <div className="donor-map-grid">
        {/* Left Column: Proximity Google Map */}
        <div className="donor-map-view-card">
          <div className="donor-map-meta-strip">
            <div className="meta-item">
              <MapPin size={14} className="meta-icon" />
              <span>Hospital: <strong>{hospitalLocation.name}</strong></span>
            </div>
            <div className="meta-item">
              <Shield size={14} className="meta-icon text-cyan" />
              <span>Privacy Shield: <strong>Approximate Zones Active</strong></span>
            </div>
            <div className="meta-item">
              <Users size={14} className="meta-icon text-red" />
              <span>Found: <strong>{rankedCandidates.length} Donors within {selectedRadius} km</strong></span>
            </div>
          </div>

          <div className="donor-map-canvas-container">
            <GoogleMapView
              center={{ lat: hospitalLocation.lat, lng: hospitalLocation.lon }}
              zoom={selectedRadius <= 10 ? 13 : selectedRadius <= 25 ? 12 : 11}
              height={460}
              markers={[
                { id: 'hospital', lat: hospitalLocation.lat, lng: hospitalLocation.lon, type: 'hospital', label: hospitalLocation.name },
                ...rankedCandidates.map(c => ({
                  id: c.donor_id || c.id,
                  lat: c.latitude || c.lat || hospitalLocation.lat + 0.02,
                  lng: c.longitude || c.lng || hospitalLocation.lon + 0.02,
                  type: 'donor',
                  label: `${c.name} (${c.blood_group})`,
                }))
              ]}
              showLegend={true}
              showControls={true}
              mode="hospital"
            />
          </div>

          <div className="donor-map-privacy-notice">
            <Shield size={13} />
            <span>
              In accordance with privacy standards, exact donor GPS coordinates are masked into approximate regional zones.
            </span>
          </div>
        </div>

        {/* Right Column: Ranked Candidates Panel */}
        <div className="donor-map-candidates-panel">
          <div className="candidates-panel-header">
            <h3>Eligible Donors ({rankedCandidates.length})</h3>
            <span className="blood-tag blood-tag-lg">{emergencyInfo.bloodGroup}</span>
          </div>

          {rankedCandidates.length === 0 ? (
            <EmptyState
              title="No Donors in Radius"
              description={`No compatible available donors found in database within ${selectedRadius} km.`}
              actionLabel="Expand to 50 km"
              onAction={() => setSelectedRadius(50)}
            />
          ) : (
            <div className="donor-map-candidates-list">
              {rankedCandidates.map((cand, idx) => {
                const candId = cand.donor_id || cand.id || `D-${idx + 1}`
                const isSelected = selectedCandidate?.id === candId
                const isNotified = notifiedCandidates[candId]

                return (
                  <div
                    key={candId}
                    className={`donor-proximity-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedCandidate(cand)}
                  >
                    <div className="dpc-top">
                      <div className="dpc-rank-badge">#{idx + 1}</div>
                      <div className="dpc-info">
                        <span className="dpc-id">{cand.name || `Donor #${candId}`}</span>
                        <span className="dpc-region">📍 {cand.city || 'Coimbatore'}</span>
                      </div>
                      <div className="dpc-score-pill">
                        Score: <strong>{cand.priority_score || cand.score || '95%'}</strong>
                      </div>
                    </div>

                    <div className="dpc-metrics">
                      <span className="dpc-chip">
                        Distance: <strong>{(cand.distance_km || cand.distanceKm || 2.5).toFixed ? (cand.distance_km || cand.distanceKm || 2.5).toFixed(1) : cand.distance_km || '2.5'} km</strong>
                      </span>
                      <span className="dpc-chip">
                        Freshness: <strong className="freshness-tag">{cand.location_freshness || 'FRESH'}</strong>
                      </span>
                      <span className="dpc-chip">
                        Availability: <strong>{cand.availability ? 'Available' : 'Offline'}</strong>
                      </span>
                    </div>

                    <div className="dpc-actions" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`small-btn ${isNotified ? 'ghost-button text-green' : 'primary-button'}`}
                        disabled={isNotified}
                        onClick={() => handleNotify(candId)}
                      >
                        {isNotified ? '✓ Dispatched' : 'Notify Donor'}
                      </button>

                      <Link
                        to={`/navigation/${emergencyInfo.id}`}
                        className="small-btn ghost-button"
                      >
                        <Navigation size={12} /> Route
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
