import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import RoutePanel from '../components/RoutePanel'
import { useLanguage } from '../context/LanguageContext'
import { ArrowLeft, Siren, Phone } from 'lucide-react'

export default function NavigationPage() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const [theme, setTheme] = useState('dark')
  const [request, setRequest] = useState(null)
  const { t } = useLanguage()

  // Dynamic user location from active session
  const userCity = localStorage.getItem('lifelink_city') || 'Coimbatore'
  const userLat = parseFloat(localStorage.getItem('lifelink_latitude')) || 11.0168
  const userLng = parseFloat(localStorage.getItem('lifelink_longitude')) || 76.9558
  const userName = localStorage.getItem('lifelink_user_name') || 'KMCH Emergency Medical Center'

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname || 'localhost'}:8000/api/v1/hospitals/requests/${requestId}`)
        const res = await response.json()
        if (res.success && res.data) {
          const r = res.data
          setRequest({
            id: r.id,
            bloodGroup: r.blood_group,
            units: r.units_required,
            urgency: r.urgency,
            hospitalName: r.hospital_name || `${userName} (${userCity})`,
            hospitalLat: r.latitude || userLat,
            hospitalLng: r.longitude || userLng,
            emergencyLocationName: r.address || `Emergency Facility, ${r.city || userCity}`,
            emergencyLat: (r.latitude || userLat) + 0.024,
            emergencyLng: (r.longitude || userLng) + 0.015,
            distance: '4.1 km',
            eta: '11 mins',
            status: r.status || 'ROUTING ACTIVE',
          })
          return
        }
      } catch (e) {
        console.warn('Could not fetch request details:', e)
      }

      // Default real session coordinates
      setRequest({
        id: requestId || 'REQ-EMERGENCY',
        bloodGroup: localStorage.getItem('lifelink_blood_group') || 'O+',
        units: 2,
        urgency: 'Critical',
        hospitalName: `${userName} (${userCity})`,
        hospitalLat: userLat,
        hospitalLng: userLng,
        emergencyLocationName: `Emergency Destination, ${userCity}`,
        emergencyLat: userLat + 0.024,
        emergencyLng: userLng + 0.015,
        distance: '4.1 km',
        eta: '11 mins',
        status: 'ROUTING ACTIVE',
      })
    }

    fetchRequestDetails()
  }, [requestId, userCity, userLat, userLng, userName])

  if (!request) {
    return (
      <div className="lifelink-app-shell theme-dark" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="loading-spinner-center">{t('locating')}</div>
      </div>
    )
  }

  const origin = {
    lat: request.hospitalLat,
    lng: request.hospitalLng,
    label: request.hospitalName,
  }
  const destination = {
    lat: request.emergencyLat,
    lng: request.emergencyLng,
    label: request.emergencyLocationName,
  }

  return (
    <div className={`lifelink-app-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <Navbar theme={theme} setTheme={setTheme} />

      <main className="portal-main-container">
        {/* Page Header */}
        <div className="page-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="button" className="ghost-button small-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> {t('backToDashboard')}
            </button>
            <div>
              <span className="eyebrow">{t('emergencyNavigation')} & Live GPS Route</span>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                <Siren size={24} style={{ color: 'var(--danger, #ef4444)' }} />
                {t('emergencyNavigation')}
              </h1>
            </div>
          </div>
          <div className="nav-page-request-chip">
            <span className="blood-tag">{request.bloodGroup}</span>
            <span className={`urgency-pill urgency-${request.urgency.toLowerCase()}`}>{request.urgency}</span>
            <code style={{ fontSize: '0.82rem', color: 'var(--cyan)' }}>{request.id}</code>
          </div>
        </div>

        {/* Main layout: 70% map + 30% panel */}
        <div className="navigation-page-layout">
          {/* Map + Route */}
          <div className="navigation-map-section">
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="nav-panel-inner-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Siren size={18} style={{ color: 'var(--danger, #ef4444)' }} />
                  <span style={{ fontWeight: 800, color: '#ffffff' }}>{t('emergencyRouteGuidance')}</span>
                </div>
                <span className="nav-route-status-chip">{t('dispatchActive')}</span>
              </div>
              <RoutePanel
                origin={origin}
                destination={destination}
                theme={theme}
                requestId={request.id}
                emergencyDetails={{
                  bloodGroup: request.bloodGroup,
                  units: request.units,
                  urgency: request.urgency,
                }}
                showMap={true}
                mapHeight={480}
              />
            </div>
          </div>

          {/* Right Info Panel */}
          <div className="navigation-info-section">
            {/* Emergency Summary Card */}
            <div className="panel nav-emergency-summary-card">
              <span className="micro-label">{t('dispatchOrder')}</span>
              <h3 style={{ marginTop: 6, marginBottom: 14, color: '#ffffff' }}>Request #{request.id}</h3>

              <div className="nav-detail-rows">
                <div className="nav-detail-row">
                  <span className="nav-row-label">📍 {t('areaCity')}:</span>
                  <strong className="nav-row-val" style={{ color: 'var(--cyan)' }}>{userCity}</strong>
                </div>
                <div className="nav-detail-row">
                  <span className="nav-row-label">🩸 {t('requiredBlood')}:</span>
                  <span className="blood-tag">{request.bloodGroup}</span>
                </div>
                <div className="nav-detail-row">
                  <span className="nav-row-label">📦 {t('quantity')}:</span>
                  <strong className="nav-row-val">{request.units} Units</strong>
                </div>
                <div className="nav-detail-row">
                  <span className="nav-row-label">⚠️ {t('priority')}:</span>
                  <span className={`urgency-pill urgency-${request.urgency.toLowerCase()}`}>
                    {request.urgency}
                  </span>
                </div>
                <div className="nav-detail-row">
                  <span className="nav-row-label">🛣️ {t('estDistance')}:</span>
                  <strong className="nav-row-val">{request.distance}</strong>
                </div>
                <div className="nav-detail-row">
                  <span className="nav-row-label">⏱️ {t('estimatedArrival')}:</span>
                  <strong className="nav-row-val" style={{ color: '#00ff88' }}>{request.eta}</strong>
                </div>
              </div>

              <div className="emergency-contact-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={16} style={{ color: 'var(--cyan)' }} />
                  <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
                    {t('emergencyHelpline')}: <strong>+91 98400 11223</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
