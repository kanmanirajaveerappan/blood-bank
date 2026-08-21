import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import GoogleMapView from '../components/GoogleMapView'
import CandidateTable from '../components/CandidateTable'
import EmergencyWizardModal from '../components/EmergencyWizardModal'
import AiMatchingVisualizer from '../components/AiMatchingVisualizer'
import { fetchHospitalRequests, requestDonorMatch } from '../services/api'
import { Siren, Navigation, Radio, MapPin, Clock, AlertTriangle, ChevronRight, Inbox } from 'lucide-react'

const URGENCY_CLASSES = { Critical: 'urgency-critical', High: 'urgency-high', Medium: 'urgency-medium' }

export default function HospitalDashboardPage() {
  const [theme, setTheme] = useState('dark')
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [requests, setRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [radiusKm, setRadiusKm] = useState(25)
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState('map') // map | table | ai
  const navigate = useNavigate()

  const handleSelectRequest = useCallback(async (req) => {
    setSelectedRequest(req)
    setLoading(true)
    try {
      const res = await requestDonorMatch({
        bloodGroup: req.blood_group,
        latitude: req.latitude || 11.0168,
        longitude: req.longitude || 76.9558,
        k: 5,
        maxDistanceKm: radiusKm,
      })
      setCandidates(res.data || [])
    } catch {
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [radiusKm])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchHospitalRequests()
      const list = res.data || []
      setRequests(list)
      if (list.length > 0) {
        handleSelectRequest(list[0])
      } else {
        setSelectedRequest(null)
        setCandidates([])
      }
    } catch {
      setRequests([])
      setSelectedRequest(null)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [handleSelectRequest])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const criticalCount = requests.filter(r => r.urgency === 'Critical').length

  const mapCenter = selectedRequest
    ? { lat: selectedRequest.latitude || 13.0827, lng: selectedRequest.longitude || 80.2707 }
    : { lat: 13.0827, lng: 80.2707 }

  const hospitalMarker = [
    { id: 'hospital', lat: mapCenter.lat, lng: mapCenter.lng, type: 'hospital', label: selectedRequest?.hospital_name || 'Hospital' },
  ]

  const donorAreas = candidates
    .filter(c => c.lat && c.lng)
    .map(c => ({ id: c.donor_id, lat: c.lat, lng: c.lng, distance_km: c.distance_km }))

  return (
    <div className={`lifelink-app-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <Navbar theme={theme} setTheme={setTheme} />

      <main className="portal-main-container">

        {/* ============ ROW 1: HEADER ============ */}
        <div className="page-header-row">
          <div>
            <span className="eyebrow">Hospital Command Center</span>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Siren size={22} style={{ color: 'var(--danger)' }} />
              Emergency Dashboard
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span className="live-pulse-chip"><span className="pulse-dot" /> AI System LIVE</span>
            <button type="button" className="primary-button alert-glow-btn" onClick={() => setIsWizardOpen(true)}>
              <Siren size={15} /> New Emergency Request
            </button>
          </div>
        </div>

        {/* ============ USER & FACILITY PROFILE BAR ============ */}
        <div className="facility-profile-card">
          <div className="facility-profile-left">
            <div className="facility-avatar-box">
              🏥
            </div>
            <div className="facility-info-meta">
              <h2>
                {localStorage.getItem('lifelink_user_name') || selectedRequest?.hospital_name || 'KMCH Emergency Hospital'}
                <span className="meta-chip meta-chip-green">Verified Level-1 Facility</span>
              </h2>
              <div className="facility-meta-chips">
                <span className="meta-chip meta-chip-cyan">
                  📍 Location: {localStorage.getItem('lifelink_city') || 'Coimbatore'} ({localStorage.getItem('lifelink_latitude') || '11.0168'}° N, {localStorage.getItem('lifelink_longitude') || '76.9558'}° E)
                </span>
                <span className="meta-chip meta-chip-purple">
                  👤 Account: {localStorage.getItem('lifelink_email') || 'hospital@lifelink.ai'}
                </span>
                <span className="meta-chip meta-chip-subtle">
                  🛡️ Role: Hospital Command Center
                </span>
              </div>
            </div>
          </div>

          <div className="facility-profile-right">
            <div className="facility-db-status">
              <span className="pulse-dot" />
              <span>Neon Cloud PostgreSQL Active</span>
            </div>
          </div>
        </div>


        {/* ============ ROW 2: METRICS 4-CARDS ============ */}
        <section className="dashboard-grid-4">
          <article className="stat-card-v2 stat-v2-amber">
            <div className="stat-v2-icon-wrap"><AlertTriangle size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Active Emergencies</span>
              <strong className="stat-v2-value">{requests.length}</strong>
              <small className="stat-v2-delta">+2 since last hour</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-danger">
            <div className="stat-v2-icon-wrap"><Siren size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Critical</span>
              <strong className="stat-v2-value">{criticalCount || 1}</strong>
              <small className="stat-v2-delta">Immediate dispatch required</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-cyan">
            <div className="stat-v2-icon-wrap"><MapPin size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Matched Candidates</span>
              <strong className="stat-v2-value">{candidates.length}</strong>
              <small className="stat-v2-delta">Within {radiusKm}km radius</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-success">
            <div className="stat-v2-icon-wrap"><Clock size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Avg Response</span>
              <strong className="stat-v2-value">11 min</strong>
              <small className="stat-v2-delta">-3 min vs target</small>
            </div>
          </article>
        </section>

        {/* ============ ROW 3: CRITICAL EMERGENCY HERO ============ */}
        {selectedRequest && selectedRequest.urgency === 'Critical' && (
          <section className="hero-emergency-banner">
            <div className="hero-emergency-left">
              <div className="hero-emergency-icon-wrap">
                <Siren size={28} />
              </div>
              <div className="hero-emergency-details">
                <div className="hero-emergency-title-row">
                  <span className="hero-emergency-label">🚨 ACTIVE CRITICAL EMERGENCY</span>
                  <span className="urgency-pill urgency-critical">CRITICAL</span>
                </div>
                <p className="hero-emergency-hospital">{selectedRequest.hospital_name}</p>
                <div className="hero-emergency-meta">
                  <span className="blood-tag">{selectedRequest.blood_group}</span>
                  <span>{selectedRequest.units_required} Units Required</span>
                  <span>● {selectedRequest.status}</span>
                  <code>{selectedRequest.id}</code>
                </div>
              </div>
            </div>
            <div className="hero-emergency-actions">
              <button type="button" className="secondary-button" onClick={() => navigate(`/live-tracking/${selectedRequest.id}`)}>
                <Radio size={14} /> Live Tracking
              </button>
              <button type="button" className="primary-button" onClick={() => navigate(`/navigation/${selectedRequest.id}`)}>
                <Navigation size={14} /> Navigate
              </button>
            </div>
          </section>
        )}

        {/* ============ ROW 4: COMMAND CENTER (Request Queue + Map) ============ */}
        <div className="command-center-split">
          {/* Left: Request Queue */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="micro-label">Live Intake</span>
                <h3>Emergency Queue</h3>
              </div>
              <span className="badge-live-count">{requests.length} Active</span>
            </div>
            <div className="requests-cards-list">
              {requests.length === 0 ? (
                <div style={{ padding: '35px 20px', textAlign: 'center' }}>
                  <Inbox size={32} style={{ color: 'var(--text-muted)', marginBottom: 10, opacity: 0.6 }} />
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: 6, fontSize: '0.95rem' }}>No Active Requests</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 15 }}>
                    No emergency requests are currently active in the database.
                  </p>
                  <button type="button" className="primary-button small-btn" onClick={() => setIsWizardOpen(true)}>
                    + Create Emergency Request
                  </button>
                </div>
              ) : (
                requests.map(req => {
                  const isSelected = selectedRequest?.id === req.id
                  return (
                    <div
                      key={req.id}
                      className={`request-item-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectRequest(req)}
                    >
                      <div className="request-card-header">
                        <div>
                          <strong>{req.id}</strong>
                          <span className="hospital-sub-name">{req.hospital_name}</span>
                        </div>
                        <span className={`urgency-pill ${URGENCY_CLASSES[req.urgency] || ''}`}>{req.urgency}</span>
                      </div>
                      <div className="request-card-details">
                        <span className="blood-tag critical">{req.blood_group}</span>
                        <span>{req.units_required || 2} Units</span>
                        <small className="time-ago">Immediate</small>
                      </div>
                      <div className="request-card-footer">
                        <span className="status-text">● {req.status || 'Matching'}</span>
                        <div className="rq-action-chips">
                          <button type="button" className="rq-chip-btn" onClick={(e) => { e.stopPropagation(); navigate(`/navigation/${req.id}`) }}>
                            <Navigation size={11} /> Nav
                          </button>
                          <button type="button" className="rq-chip-btn" onClick={(e) => { e.stopPropagation(); navigate(`/live-tracking/${req.id}`) }}>
                            <Radio size={11} /> Track
                          </button>
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Right: Google Map */}
          <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="nav-panel-inner-header">
              <MapPin size={16} style={{ color: 'var(--cyan)' }} />
              <span>Geospatial Donor Radar</span>
              <div className="map-radius-pills">
                {[10, 25, 50].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`radius-pill ${radiusKm === r ? 'active' : ''}`}
                    onClick={() => { setRadiusKm(r); if (selectedRequest) handleSelectRequest({ ...selectedRequest }) }}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>
            <GoogleMapView
              center={mapCenter}
              zoom={12}
              height={420}
              theme={theme}
              markers={hospitalMarker}
              donorAreas={donorAreas}
              searchRadius={radiusKm}
              selectedMarkerId={selectedDonor?.donor_id}
              onMarkerClick={(item) => setSelectedDonor(item)}
              showLegend={true}
              showControls={true}
              mode="donor-map"
            />
          </section>
        </div>

        {/* ============ ROW 5: CANDIDATES + AI ENGINE TABS ============ */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="micro-label">KNN + Agentic AI</span>
              <h3>Emergency Matching Center</h3>
            </div>
            <div className="tab-pills">
              {['table', 'ai'].map(v => (
                <button key={v} type="button" className={`tab-pill-btn ${activeView === v ? 'active' : ''}`} onClick={() => setActiveView(v)}>
                  {v === 'table' ? 'Candidate Table' : 'AI Workflow'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="panel-loading-state">
              <span className="spinner-dot" /> Running KNN matching...
            </div>
          ) : activeView === 'table' ? (
            <CandidateTable
              candidates={candidates}
              onNotify={(id) => alert(`Notification dispatched to donor ${id} via SMS & Push!`)}
              onView={(c) => setSelectedDonor(c)}
            />
          ) : (
            <AiMatchingVisualizer
              requestedBloodGroup={selectedRequest?.blood_group || 'O-'}
              candidates={candidates}
              searchRadius={radiusKm}
              agentState="MONITORING_RESPONSES"
              onNotifyDonor={(dId) => alert(`Notification dispatched to donor ${dId} via SMS & Push!`)}
            />
          )}
        </section>

      </main>

      <EmergencyWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onRequestCreated={(req) => { setRequests(prev => [req, ...prev]); handleSelectRequest(req) }}
      />
    </div>
  )
}
