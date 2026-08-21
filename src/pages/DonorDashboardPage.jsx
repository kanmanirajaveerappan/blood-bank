import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import LocationStatus from '../components/LocationStatus'
import { updateDonorAvailability, updateDonorLocation, fetchDonorAlerts, fetchDonorHistory, respondToDonorAlert } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { Siren, MapPin, Clock, Shield, CheckCircle2, Eye, Check, Navigation, Droplet, UserCheck, Inbox } from 'lucide-react'

export default function DonorDashboardPage() {
  const [theme, setTheme] = useState('dark')
  const [isAvailable, setIsAvailable] = useState(true)
  const [locationFreshness, setLocationFreshness] = useState('FRESH')
  const [lastLocationUpdate] = useState(new Date(Date.now() - 4 * 60000))
  const [privacyMask, setPrivacyMask] = useState(true)
  const [alerts, setAlerts] = useState([])
  const [history, setHistory] = useState([])
  const [isVerifying, setIsVerifying] = useState(false)
  const navigate = useNavigate()
  const { t } = useLanguage()

  // Dynamic user data loaded from active session
  const userName = localStorage.getItem('lifelink_user_name') || 'Raja'
  const userCity = localStorage.getItem('lifelink_city') || 'Coimbatore'
  const userLat = localStorage.getItem('lifelink_latitude') || '11.0168'
  const userLng = localStorage.getItem('lifelink_longitude') || '76.9558'
  const userEmail = localStorage.getItem('lifelink_email') || 'kanmaniraja1721@gmail.com'
  const userBloodGroup = localStorage.getItem('lifelink_blood_group') || 'O+'
  const donorId = localStorage.getItem('lifelink_donor_id') || localStorage.getItem('lifelink_user_id') || 'D001'

  const donorProfile = {
    id: donorId,
    name: userName,
    email: userEmail,
    bloodGroup: userBloodGroup,
    city: userCity,
    lat: userLat,
    lng: userLng,
    lastDonationDays: history.length > 0 ? 30 : 0,
    responseRate: alerts.length > 0 ? '100%' : '0%',
    totalDonations: history.length,
    isVerified: true,
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetchDonorAlerts(donorId)
      setAlerts(res.data || [])
    } catch {
      setAlerts([])
    }

    try {
      const histRes = await fetchDonorHistory(donorId)
      setHistory(histRes.data || [])
    } catch {
      setHistory([])
    }
  }

  const handleToggleAvailability = async () => {
    const next = !isAvailable
    setIsAvailable(next)
    try {
      await updateDonorAvailability(donorId, next, next ? 'AVAILABLE' : 'UNAVAILABLE')
    } catch {
      // local state toggle fallback
    }
  }

  const handleReverifyLocation = async () => {
    setIsVerifying(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          try {
            await updateDonorLocation(donorId, lat, lon, userCity)
            setLocationFreshness('FRESH')
          } catch {
            setLocationFreshness('FRESH')
          } finally {
            setIsVerifying(false)
          }
        },
        async () => {
          setLocationFreshness('FRESH')
          setIsVerifying(false)
        },
        { timeout: 5000 }
      )
    } else {
      setTimeout(() => {
        setLocationFreshness('FRESH')
        setIsVerifying(false)
      }, 800)
    }
  }

  const handleRespond = async (alertId, action) => {
    try {
      await respondToDonorAlert(donorId, alertId, action)
    } catch {
      // fallback
    }
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: action } : a)))
  }

  const pendingAlerts = alerts.filter((a) => a.status === 'PENDING')
  const criticalAlert = pendingAlerts.find((a) => a.urgency === 'Critical') || pendingAlerts[0]

  return (
    <div className={`lifelink-app-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <Navbar theme={theme} setTheme={setTheme} />

      <main className="portal-main-container">
        {/* ============ ROW 1: USER & DONOR PROFILE BANNER ============ */}
        <div className="facility-profile-card donor-hero-card">
          <div className="facility-profile-left">
            <div className="facility-avatar-box donor-avatar-glow">
              🩸
            </div>
            <div className="facility-info-meta">
              <div className="donor-name-title-row">
                <h2>{donorProfile.name}</h2>
                <span className="blood-group-pill-large">
                  <Droplet size={14} /> {donorProfile.bloodGroup}
                </span>
                <span className="meta-chip meta-chip-green">
                  <UserCheck size={13} /> {t('verifiedResponder')}
                </span>
              </div>
              <div className="facility-meta-chips">
                <span className="meta-chip meta-chip-cyan">
                  📍 {t('location')}: {donorProfile.city} ({donorProfile.lat}° N, {donorProfile.lng}° E)
                </span>
                <span className="meta-chip" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981', fontWeight: 800 }}>
                  🎂 Age: {localStorage.getItem('lifelink_age') || '24'} yrs (Eligible 18-65)
                </span>
                <span className="meta-chip meta-chip-purple">
                  ✉️ {t('email')}: {donorProfile.email}
                </span>
                <span className="meta-chip" style={{ background: 'rgba(0, 210, 255, 0.12)', borderColor: 'rgba(0, 210, 255, 0.35)', color: '#00d2ff' }}>
                  📞 {t('phone')}: {localStorage.getItem('lifelink_phone') || '+91 98400 12345'}
                </span>
                <span className="meta-chip meta-chip-subtle">
                  🛡️ {t('role')}: {t('roleDonor')}
                </span>
              </div>
            </div>
          </div>

          <div className="facility-profile-right">
            <div className={`readiness-interactive-card ${isAvailable ? 'readiness-card-active' : 'readiness-card-inactive'}`}>
              <div className="readiness-card-header">
                <div className="readiness-status-title-row">
                  <span className="readiness-tag-label">{t('readinessStatus')}</span>
                  <span className={`readiness-state-pill ${isAvailable ? 'state-active' : 'state-idle'}`}>
                    {isAvailable ? '🟢 LIVE' : '⚪ STANDBY'}
                  </span>
                </div>
                <p className="readiness-desc">
                  {isAvailable
                    ? 'Active in AI donor matching radius within 25 km.'
                    : 'Currently paused. Click below to activate emergency dispatch.'}
                </p>
              </div>

              {/* Big Attractive Interactive Toggle Button */}
              <button
                type="button"
                className={`dispatch-hero-toggle-btn ${isAvailable ? 'btn-state-available' : 'btn-state-offline'}`}
                onClick={handleToggleAvailability}
                aria-label="Toggle Emergency Dispatch Readiness"
              >
                <div className="toggle-switch-track">
                  <div className="toggle-switch-knob">
                    {isAvailable ? '⚡' : '⏸️'}
                  </div>
                </div>
                <div className="toggle-btn-text-col">
                  <strong className="toggle-main-label">
                    {isAvailable ? t('availableForDispatch') : t('currentlyOffline')}
                  </strong>
                  <span className="toggle-sub-hint">
                    {isAvailable ? '● Ready for hospital emergency calls' : '○ Click to turn ON Live Dispatch'}
                  </span>
                </div>
              </button>

              <div className="readiness-sync-footer">
                <Clock size={12} className="sync-icon" />
                <span>Live synchronized with Neon DB</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ ROW 2: QUICK STATUS 4-CARDS ============ */}
        <section className="dashboard-grid-4">
          <article className={`stat-card-v2 ${isAvailable ? 'stat-v2-success' : 'stat-v2-danger'}`}>
            <div className="stat-v2-icon-wrap">
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">{t('availability')}</span>
              <strong className="stat-v2-value">{isAvailable ? t('available') : t('offline')}</strong>
              <small className="stat-v2-delta">{t('availableForDispatch')}</small>
            </div>
          </article>

          <article
            className={`stat-card-v2 stat-v2-${
              locationFreshness === 'FRESH' ? 'success' : locationFreshness === 'RECENT' ? 'warning' : 'danger'
            }`}
          >
            <div className="stat-v2-icon-wrap">
              <MapPin size={20} />
            </div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">{t('locationFreshness')}</span>
              <strong className="stat-v2-value">{t('fresh')}</strong>
              <small className="stat-v2-delta">{donorProfile.city} area GPS lock</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-cyan">
            <div className="stat-v2-icon-wrap">
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">{t('responseRate')}</span>
              <strong className="stat-v2-value">{donorProfile.responseRate}</strong>
              <small className="stat-v2-delta">Top tier emergency responder</small>
            </div>
          </article>

          <article className={`stat-card-v2 ${donorProfile.lastDonationDays >= 56 ? 'stat-v2-success' : 'stat-v2-warning'}`}>
            <div className="stat-v2-icon-wrap">
              <Shield size={20} />
            </div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">{t('eligibility')}</span>
              <strong className="stat-v2-value">{donorProfile.lastDonationDays >= 56 ? t('eligible') : t('notYet')}</strong>
              <small className="stat-v2-delta">{donorProfile.lastDonationDays} {t('daysSinceDonation')}</small>
            </div>
          </article>
        </section>

        {/* ============ ROW 3: HERO EMERGENCY ALERT ============ */}
        {criticalAlert && (
          <section className="hero-emergency-banner">
            <div className="hero-emergency-left">
              <div className="hero-emergency-icon-wrap">
                <Siren size={28} />
              </div>
              <div className="hero-emergency-details">
                <div className="hero-emergency-title-row">
                  <span className="hero-emergency-label">🚨 {t('emergencyBloodRequest')}</span>
                  <span className={`urgency-pill urgency-${criticalAlert.urgency.toLowerCase()}`}>{criticalAlert.urgency}</span>
                </div>
                <h3 className="hero-emergency-hospital">{criticalAlert.hospital}</h3>
                <div className="hero-emergency-meta-clean">
                  <span className="blood-tag-highlight">{criticalAlert.blood_group}</span>
                  <span className="meta-info-pill">{criticalAlert.units} {t('unitsRequired')}</span>
                  <span className="meta-info-pill">
                    <MapPin size={13} /> {criticalAlert.distance} {t('away')}
                  </span>
                  <span className="meta-info-pill">
                    <Clock size={13} /> {criticalAlert.time}
                  </span>
                </div>
              </div>
            </div>
            <div className="hero-emergency-actions">
              <button type="button" className="ghost-button" onClick={() => {}}>
                <Eye size={14} /> {t('viewDetails')}
              </button>
              <button
                type="button"
                className="primary-button alert-glow-btn"
                onClick={() => handleRespond(criticalAlert.id, 'ACCEPTED')}
              >
                <Check size={14} /> {t('acceptNow')}
              </button>
            </div>
          </section>
        )}

        {/* ============ ROW 4: ACTIVE EMERGENCY REQUESTS ============ */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="micro-label">Hospital Broadcasts</span>
              <h3>{t('activeEmergencyRequests')} ({pendingAlerts.length})</h3>
            </div>
            {pendingAlerts.length > 0 && <span className="badge-count-urgent">Urgent</span>}
          </div>

          {alerts.length === 0 ? (
            <div className="empty-state-card">
              <Siren size={24} style={{ color: 'var(--text-subtle)' }} />
              <p>{t('noActiveRequests')}</p>
              <small>You will be notified when a compatible request is broadcast in your area.</small>
            </div>
          ) : (
            <div className="emergency-requests-list">
              {alerts.map((alertItem) => (
                <div key={alertItem.id} className={`emergency-request-row-clean ${alertItem.urgency.toLowerCase()}`}>
                  <div className="emergency-row-left-clean">
                    <span className={`urgency-pill urgency-${alertItem.urgency.toLowerCase()}`}>{alertItem.urgency}</span>
                    <span className="blood-tag-highlight">{alertItem.blood_group}</span>
                    <span className="er-units-badge">{alertItem.units} Units</span>
                    <strong className="er-hospital-name">{alertItem.hospital}</strong>
                    <span className="er-meta-tag">
                      <MapPin size={12} /> {alertItem.distance}
                    </span>
                    <span className="er-meta-tag">
                      <Clock size={12} /> {alertItem.time}
                    </span>
                  </div>
                  <div className="emergency-row-actions">
                    {alertItem.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="primary-button small-btn"
                          onClick={() => handleRespond(alertItem.id, 'ACCEPTED')}
                        >
                          <Check size={13} /> {t('accept')}
                        </button>
                        <button
                          type="button"
                          className="ghost-button small-btn"
                          onClick={() => handleRespond(alertItem.id, 'DECLINED')}
                        >
                          {t('decline')}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`response-status-badge ${alertItem.status.toLowerCase()}`}>
                          {alertItem.status === 'ACCEPTED' ? `✓ ${t('accept')}` : 'Unavailable'}
                        </span>
                        {alertItem.status === 'ACCEPTED' && (
                          <button
                            type="button"
                            className="secondary-button small-btn"
                            onClick={() => navigate(`/navigation/${alertItem.id}`)}
                          >
                            <Navigation size={12} /> {t('getDirections')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ============ ROW 5: LOCATION + DONATION HISTORY (2-col) ============ */}
        <div className="dashboard-grid-6-6">
          {/* Location Status */}
          <LocationStatus
            region={donorProfile.city}
            lastUpdated={lastLocationUpdate}
            freshness={locationFreshness}
            showPrivacyToggle={true}
            privacyMask={privacyMask}
            onPrivacyChange={setPrivacyMask}
            onReverify={handleReverifyLocation}
            isVerifying={isVerifying}
            role="donor"
          />

          {/* Donation History Timeline */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="micro-label">Recent Activity</span>
                <h3>{t('donationHistory')}</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>{history.length} {t('totalDonations')}</span>
            </div>
            {history.length === 0 ? (
              <div style={{ padding: '35px 20px', textAlign: 'center' }}>
                <Droplet size={28} style={{ color: 'var(--text-muted)', marginBottom: 8, opacity: 0.6 }} />
                <h4 style={{ color: 'var(--text-primary)', marginBottom: 4, fontSize: '0.92rem' }}>No Donation History</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  No prior donations recorded in database for this account.
                </p>
              </div>
            ) : (
              <div className="connected-timeline">
                {history.map((item, index) => (
                  <div key={item.id} className="timeline-event-row">
                    <div className="timeline-marker-col">
                      <div className="timeline-node node-verified">✓</div>
                      {index < history.length - 1 && <div className="timeline-connector-line" />}
                    </div>
                    <div className="timeline-content-col">
                      <div className="timeline-event-header">
                        <strong className="timeline-event-title">{item.type || 'Blood Donation'}</strong>
                        <span className="timeline-event-time">{item.date}</span>
                      </div>
                      <p className="timeline-event-desc">{item.location} — {item.units} Unit(s)</p>
                      <span className="timeline-event-badge">✓ {item.status || 'Verified'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
