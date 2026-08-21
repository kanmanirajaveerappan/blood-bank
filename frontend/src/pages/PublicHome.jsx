import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { bloodGroups } from '../data/donors'
import { compatibilityMatrix } from '../utils/matching'
import { requestDonorMatch, fetchAdminStats } from '../services/api'
import Navbar from '../components/Navbar'

export default function PublicHome() {
  const [selectedBlood, setSelectedBlood] = useState('O-')
  const [simBlood, setSimBlood] = useState('O+')
  const [simRadius, setSimRadius] = useState(25)
  const [simResults, setSimResults] = useState([])
  const [simLoading, setSimLoading] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [stats, setStats] = useState({
    total_registered_donors: 0,
    hospitals_connected: 0,
    avg_match_time_minutes: 0,
    system_uptime: '100%',
  })

  useEffect(() => {
    fetchAdminStats()
      .then((res) => {
        if (res.data) setStats(res.data)
      })
      .catch(() => {})
  }, [])

  const handleSimulateMatch = async () => {
    setSimLoading(true)
    try {
      const res = await requestDonorMatch({
        bloodGroup: simBlood,
        latitude: 11.0168,
        longitude: 76.9558,
        k: 4,
        maxDistanceKm: simRadius,
      })
      setSimResults(res.data || [])
    } catch {
      setSimResults([])
    } finally {
      setSimLoading(false)
    }
  }

  const compatibleDonorsForSelected = compatibilityMatrix[selectedBlood] || []

  return (
    <div className={`lifelink-app-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <Navbar theme={theme} setTheme={setTheme} />

      <main className="public-landing-container">
        {/* HERO SECTION */}
        <section className="landing-hero-section">
          <div className="hero-badge-pill">
            <span className="sparkle">✨</span>
            <span>Next-Gen Healthcare + KNN AI Coordination</span>
          </div>

          <h1 className="hero-headline">
            Connecting the right help, <br />
            <span className="headline-gradient">when every second matters.</span>
          </h1>

          <p className="hero-subtitle">
            RedRadius coordinates emergency blood donor matching through deterministic medical compatibility, 
            geospatial proximity analysis, and explainable multi-factor KNN candidate ranking. Find nearby. Save lives.
          </p>

          <div className="hero-cta-group">
            <Link to="/hospital/dashboard" className="primary-button hero-cta-btn">
              🚨 Hospital Emergency Command
            </Link>
            <Link to="/donor/dashboard" className="secondary-button hero-cta-btn">
              🩸 Become a RedRadius Donor
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hero-metrics-bar">
            <div className="metric-box">
              <strong>{stats.avg_match_time_minutes ? `${stats.avg_match_time_minutes} min` : '< 15 min'}</strong>
              <span>Avg Matching Time</span>
            </div>
            <div className="metric-box">
              <strong>100%</strong>
              <span>Deterministic Medical Safety</span>
            </div>
            <div className="metric-box">
              <strong>{(stats.total_registered_donors || 0).toLocaleString()}</strong>
              <span>Active Registered Donors</span>
            </div>
            <div className="metric-box">
              <strong>{stats.hospitals_connected || 0}</strong>
              <span>Connected Facilities</span>
            </div>
          </div>
        </section>

        {/* INTERACTIVE COMPATIBILITY MATRIX */}
        <section className="landing-section">
          <div className="section-header-center">
            <span className="micro-label">Deterministic Medical Safety</span>
            <h2>Certified Blood Compatibility Matrix</h2>
            <p>Click any recipient blood group to view certified safe red blood cell donor groups.</p>
          </div>

          <div className="compatibility-interactive-card panel">
            <div className="blood-selector-tabs">
              {bloodGroups.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  className={`blood-tab ${selectedBlood === bg ? 'active' : ''}`}
                  onClick={() => setSelectedBlood(bg)}
                >
                  {bg}
                </button>
              ))}
            </div>

            <div className="compatibility-display-box">
              <div className="recipient-summary">
                <span className="target-label">Recipient Blood Group:</span>
                <span className="target-badge">{selectedBlood}</span>
              </div>

              <div className="compatible-donors-showcase">
                <span className="can-receive-label">Can safely receive red blood cells from:</span>
                <div className="donor-badges-row">
                  {compatibleDonorsForSelected.map((dbg) => (
                    <div key={dbg} className="compatible-donor-chip">
                      <strong>{dbg}</strong>
                      <small>✓ Compatible</small>
                    </div>
                  ))}
                </div>
              </div>

              {selectedBlood === 'AB+' && (
                <p className="special-notice">🌟 Universal Recipient: AB+ patients can receive red blood cells from all blood groups.</p>
              )}
              {selectedBlood === 'O-' && (
                <p className="special-notice">🌟 Universal Donor: O- blood can be given to all blood groups, but can only receive O-.</p>
              )}
            </div>
          </div>
        </section>

        {/* LIVE AI SIMULATOR PLAYGROUND */}
        <section className="landing-section">
          <div className="section-header-center">
            <span className="micro-label">Interactive Demonstration</span>
            <h2>AI-Powered KNN Matching Playground</h2>
            <p>Simulate how RedRadius surfaces and ranks nearest compatible candidates in real-time within your radius.</p>
          </div>

          <div className="simulator-card panel">
            <div className="simulator-controls">
              <label>
                Patient Blood Group
                <select
                  value={simBlood}
                  onChange={(e) => setSimBlood(e.target.value)}
                  className="modal-select"
                >
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </label>

              <label>
                Search Radius
                <select
                  value={simRadius}
                  onChange={(e) => setSimRadius(Number(e.target.value))}
                  className="modal-select"
                >
                  <option value={5}>5 km (Immediate Urban)</option>
                  <option value={10}>10 km (City Sector)</option>
                  <option value={25}>25 km (Metropolitan)</option>
                  <option value={50}>50 km (Regional Expansion)</option>
                </select>
              </label>

              <button
                type="button"
                className="primary-button sim-run-btn"
                onClick={handleSimulateMatch}
                disabled={simLoading}
              >
                {simLoading ? 'Calculating KNN...' : '⚡ Run AI Match Simulation'}
              </button>
            </div>

            {simResults.length > 0 && (
              <div className="sim-results-grid">
                {simResults.map((donor, idx) => (
                  <div key={idx} className="sim-donor-card">
                    <div className="sim-donor-head">
                      <strong>{donor.name || `Donor #${idx + 1}`}</strong>
                      <span className="blood-tag">{donor.blood_group || simBlood}</span>
                    </div>
                    <div className="sim-meta">
                      <span>📍 {donor.distance_km ?? '3.4'} km away</span>
                      <span>⚡ Priority Score: {donor.priority_score ?? '96'}%</span>
                      <span>● Status: Available</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* HOW IT WORKS 4-STEP WORKFLOW */}
        <section className="landing-section">
          <div className="section-header-center">
            <span className="micro-label">Workflow Automation</span>
            <h2>How RedRadius Coordinates Emergencies</h2>
          </div>

          <div className="workflow-steps-grid">
            <div className="workflow-step-card panel">
              <span className="step-badge">01</span>
              <h3>Emergency Intake</h3>
              <p>Authorized hospitals submit urgent blood requirements with target response times and case priority.</p>
            </div>

            <div className="workflow-step-card panel">
              <span className="step-badge">02</span>
              <h3>Deterministic Filtering</h3>
              <p>Medical rules validate compatibility first so AI algorithms never suggest incompatible blood types.</p>
            </div>

            <div className="workflow-step-card panel">
              <span className="step-badge">03</span>
              <h3>KNN & Geospatial Ranking</h3>
              <p>Multi-factor KNN ranks candidates based on Haversine distance, availability freshness, and response history.</p>
            </div>

            <div className="workflow-step-card panel">
              <span className="step-badge">04</span>
              <h3>Agentic Dispatch</h3>
              <p>Automated staged notifications mobilize donors while real-time dashboards track response arrivals.</p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="landing-footer">
          <div className="footer-content">
            <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/redradius-logo.png" alt="RedRadius Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '10px' }} />
              <div>
                <strong style={{ fontSize: '1.1rem' }}>RedRadius</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Find Nearby. Save Lives. • AI Emergency Donor Coordination</p>
              </div>
            </div>
            <div className="footer-links">
              <Link to="/hospital/dashboard">Hospital Portal</Link>
              <Link to="/donor/dashboard">Donor Hub</Link>
              <Link to="/blood-bank/dashboard">Blood Bank</Link>
              <Link to="/admin/dashboard">Admin Monitor</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 RedRadius. Emergency Healthcare Platform.</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
