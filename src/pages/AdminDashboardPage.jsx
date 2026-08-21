import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import ExcelImportModal from '../components/ExcelImportModal'
import GoogleMapView from '../components/GoogleMapView'
import { fetchAdminStats, fetchAiMonitorData, fetchAuditLogs, fetchHospitalRequests } from '../services/api'
import { Users, Building2, Siren, Clock, Activity, CheckCircle2, Inbox } from 'lucide-react'

export default function AdminDashboardPage() {
  const [theme, setTheme] = useState('dark')
  const [stats, setStats] = useState({
    total_registered_donors: 0,
    active_available_donors: 0,
    hospitals_connected: 0,
    blood_banks_connected: 0,
    active_emergencies: 0,
    critical_emergencies: 0,
    successful_matches: 0,
    avg_match_time_minutes: 0,
    donor_response_rate: '0%',
    system_uptime: '100%',
  })
  const [aiData, setAiData] = useState({})
  const [logs, setLogs] = useState([])
  const [activeRequests, setActiveRequests] = useState([])
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)

  const loadAdminData = useCallback(async () => {
    try {
      const statsRes = await fetchAdminStats()
      if (statsRes.data) setStats(statsRes.data)
    } catch {
      // zeroed initial state retained
    }

    try {
      const aiRes = await fetchAiMonitorData()
      setAiData(aiRes.data || {})
    } catch {
      setAiData({})
    }

    try {
      const logsRes = await fetchAuditLogs()
      setLogs(logsRes.data || [])
    } catch {
      setLogs([])
    }

    try {
      const reqRes = await fetchHospitalRequests()
      setActiveRequests(reqRes.data || [])
    } catch {
      setActiveRequests([])
    }
  }, [])

  useEffect(() => {
    loadAdminData()
  }, [loadAdminData])

  const handleImportCompleted = () => {
    loadAdminData()
  }

  return (
    <div className={`lifelink-app-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <Navbar theme={theme} setTheme={setTheme} />

      <main className="portal-main-container">
        {/* HEADER */}
        <div className="page-header-row">
          <div>
            <span className="eyebrow">Super Administrator</span>
            <h1>LifeLink AI Platform & Model Monitoring</h1>
          </div>

          <button
            type="button"
            className="primary-button excel-hub-btn"
            onClick={() => setIsExcelModalOpen(true)}
          >
            📊 Excel / CSV Intelligence Hub
          </button>
        </div>

        {/* METRICS ROW 1 — System Scale */}
        <section className="dashboard-grid-4">
          <article className="stat-card-v2 stat-v2-blue">
            <div className="stat-v2-icon-wrap"><Users size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Registered Donors</span>
              <strong className="stat-v2-value">{(stats.total_registered_donors ?? 0).toLocaleString()}</strong>
              <small className="stat-v2-delta">{stats.active_available_donors ?? 0} currently available</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-cyan">
            <div className="stat-v2-icon-wrap"><Building2 size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Hospitals Connected</span>
              <strong className="stat-v2-value">{stats.hospitals_connected ?? 0}</strong>
              <small className="stat-v2-delta">Verified hospital facilities</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-amber">
            <div className="stat-v2-icon-wrap"><Siren size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Active Emergencies</span>
              <strong className="stat-v2-value">{stats.active_emergencies ?? 0}</strong>
              <small className="stat-v2-delta">{stats.critical_emergencies ?? 0} Critical priority</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-success">
            <div className="stat-v2-icon-wrap"><Activity size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">System Reliability</span>
              <strong className="stat-v2-value">{stats.system_uptime || '100%'}</strong>
              <small className="stat-v2-delta">Connected to Neon DB</small>
            </div>
          </article>
        </section>

        {/* METRICS ROW 2 — Performance */}
        <section className="dashboard-grid-4">
          <article className="stat-card-v2 stat-v2-green">
            <div className="stat-v2-icon-wrap"><Clock size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Avg Match Latency</span>
              <strong className="stat-v2-value">{stats.avg_match_time_minutes ?? 0} min</strong>
              <small className="stat-v2-delta">Fast KNN computation</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-cyan">
            <div className="stat-v2-icon-wrap"><CheckCircle2 size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Successful Matches</span>
              <strong className="stat-v2-value">{stats.successful_matches ?? 0}</strong>
              <small className="stat-v2-delta">Fulfilled / committed</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-success">
            <div className="stat-v2-icon-wrap"><Activity size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Donor Response Rate</span>
              <strong className="stat-v2-value">{stats.donor_response_rate || '0%'}</strong>
              <small className="stat-v2-delta">Live calculation</small>
            </div>
          </article>

          <article className="stat-card-v2 stat-v2-amber">
            <div className="stat-v2-icon-wrap"><Building2 size={20} /></div>
            <div className="stat-v2-body">
              <span className="stat-v2-label">Blood Banks</span>
              <strong className="stat-v2-value">{stats.blood_banks_connected ?? 0}</strong>
              <small className="stat-v2-delta">Storage facilities</small>
            </div>
          </article>
        </section>

        {/* AI MODEL MONITOR SECTION */}
        <section className="panel ai-monitor-panel">
          <div className="panel-header">
            <div>
              <span className="micro-label">Machine Learning Telemetry</span>
              <h3>KNN Model Status & Feature Weights</h3>
            </div>
            <span className="badge-model-version">Model: Multi-Factor KNN v2.4</span>
          </div>

          <div className="ai-monitor-grid">
            <div className="feature-weights-box">
              <h4>Operational Ranking Feature Weights</h4>
              <div className="weight-row">
                <span>Haversine Distance</span>
                <div className="progress-bar-track"><div className="progress-bar-fill fill-cyan" style={{ width: '45%' }} /></div>
                <strong>45%</strong>
              </div>
              <div className="weight-row">
                <span>Availability & Freshness</span>
                <div className="progress-bar-track"><div className="progress-bar-fill fill-green" style={{ width: '25%' }} /></div>
                <strong>25%</strong>
              </div>
              <div className="weight-row">
                <span>Response Reliability</span>
                <div className="progress-bar-track"><div className="progress-bar-fill fill-amber" style={{ width: '20%' }} /></div>
                <strong>20%</strong>
              </div>
              <div className="weight-row">
                <span>Donation Recency</span>
                <div className="progress-bar-track"><div className="progress-bar-fill fill-blue" style={{ width: '10%' }} /></div>
                <strong>10%</strong>
              </div>
            </div>

            <div className="benchmark-comparison-box">
              <h4>Algorithm Evaluation Comparison</h4>
              <table className="benchmark-table">
                <thead>
                  <tr>
                    <th>Algorithm</th>
                    <th>Avg Dist</th>
                    <th>Response Rate</th>
                    <th>Inference</th>
                  </tr>
                </thead>
                <tbody>
                  {(aiData.benchmark_comparison || []).map((bm, i) => (
                    <tr key={i} className={bm.algorithm.includes('Hybrid') ? 'highlight-row' : ''}>
                      <td><strong>{bm.algorithm}</strong></td>
                      <td>{bm.avg_distance_km} km</td>
                      <td><span className="good-badge">{bm.response_rate}</span></td>
                      <td><code>{bm.inference_ms} ms</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* GEOSPATIAL OVERVIEW MAP */}
        <div className="dashboard-grid-8-4">
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="nav-panel-inner-header">
              <span>🗺️</span>
              <span>System-Wide Emergency Map — Active Incidents</span>
              <span className="live-pulse-chip" style={{ marginLeft: 'auto' }}><span className="pulse-dot" /> LIVE</span>
            </div>
            <GoogleMapView
              center={{ lat: 11.0168, lng: 76.9558 }}
              destination={activeRequests.length > 0 ? { lat: activeRequests[0].latitude, lng: activeRequests[0].longitude } : null}
              zoom={13}
              height={440}
              theme={theme}
              markers={activeRequests.map((r, idx) => ({
                id: r.id || `req-${idx}`,
                lat: r.latitude || 11.0168,
                lng: r.longitude || 76.9558,
                type: 'emergency',
                label: `${r.blood_group} — ${r.hospital_name || 'Emergency'}`,
              }))}
              showLegend={true}
              showControls={true}
              mode="admin"
            />
          </div>

          <div className="panel">
            <span className="micro-label">Active Emergencies</span>
            <div className="admin-emergency-mini-list" style={{ marginTop: 12 }}>
              {activeRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)' }}>
                  <Inbox size={22} style={{ display: 'block', margin: '0 auto 6px auto', opacity: 0.6 }} />
                  <span style={{ fontSize: '0.85rem' }}>No active emergencies in database</span>
                </div>
              ) : (
                activeRequests.map(r => (
                  <div key={r.id} className="admin-emergency-mini-row">
                    <span className={`urgency-pill urgency-${(r.urgency || 'high').toLowerCase()}`}>{r.urgency || 'High'}</span>
                    <span className="blood-tag">{r.blood_group}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.hospital_name}</span>
                    <code style={{ fontSize: '0.75rem', opacity: 0.6 }}>{r.id}</code>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AUDIT LOGS STREAM */}
        <section className="panel audit-logs-panel">
          <div className="panel-header">
            <div>
              <span className="micro-label">Compliance & Security</span>
              <h3>System & Agentic AI Audit Trail</h3>
            </div>
            <span className="badge-log-count">{logs.length} Logged Events</span>
          </div>

          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      <Inbox size={24} style={{ display: 'block', margin: '0 auto 6px auto', opacity: 0.6 }} />
                      <span>No audit logs recorded in database yet.</span>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td><small>{log.timestamp}</small></td>
                      <td><code>{log.actor}</code></td>
                      <td><span className="action-tag">{log.action}</span></td>
                      <td>{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Excel Import Intelligence Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportCompleted={handleImportCompleted}
      />
    </div>
  )
}
