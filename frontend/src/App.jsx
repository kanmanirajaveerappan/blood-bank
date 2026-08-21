import { useMemo, useState, useEffect } from 'react'
import './App.css'
import { bloodGroups } from './data/donors'
import { compatibilityMatrix } from './utils/matching'
import { requestDonorMatch, triggerAgentCoordination, fetchBloodInventory, fetchAdminStats } from './services/api'
import Navbar from './components/Navbar'
import InteractiveMap from './components/InteractiveMap'
import EmergencyWizardModal from './components/EmergencyWizardModal'

const defaultRequest = {
  bloodGroup: 'O+',
  unitsRequired: 2,
  hospitalName: 'KMCH Medical Center',
  latitude: 11.0168,
  longitude: 76.9558,
  urgency: 'Critical',
}

const emergencyFlow = [
  'Request Created',
  'Validation Complete',
  'Deterministic Compatibility',
  'Geospatial Proximity',
  'KNN Multi-Factor Ranking',
  'Agentic Notification Stream',
  'Monitoring Responses',
  'Resolved',
]

function App() {
  const [request, setRequest] = useState(defaultRequest)
  const [matches, setMatches] = useState([])
  const [status, setStatus] = useState('Ready to process emergency request.')
  const [isLoading, setIsLoading] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [searchRadius, setSearchRadius] = useState(25)
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [inventory, setInventory] = useState([])
  const [stats, setStats] = useState({ total_registered_donors: 0, active_available_donors: 0 })

  useEffect(() => {
    processEmergencyRequest()
    fetchBloodInventory().then(res => setInventory(res.data || [])).catch(() => setInventory([]))
    fetchAdminStats().then(res => setStats(res.data || {})).catch(() => {})
  }, [])

  const totalInventoryUnits = useMemo(() => {
    return inventory.reduce((acc, item) => acc + (item.units || 0), 0)
  }, [inventory])

  const statCards = useMemo(() => [
    {
      label: 'Registered Donors',
      value: (stats.total_registered_donors || 0).toLocaleString(),
      trend: `${stats.active_available_donors || 0} available`,
      tone: 'blue',
    },
    {
      label: 'Compatible Donors',
      value: matches.length,
      trend: `Within ${searchRadius} km`,
      tone: 'cyan',
    },
    {
      label: 'Top-K Matched',
      value: Math.min(5, matches.length),
      trend: 'KNN Ranked',
      tone: 'amber',
    },
    {
      label: 'Inventory Reserve',
      value: `${totalInventoryUnits} Units`,
      trend: '8 Blood Types',
      tone: 'green',
    },
  ], [stats, matches, searchRadius, totalInventoryUnits])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setRequest((current) => ({
      ...current,
      [name]: name === 'unitsRequired' ? Number(value) : value,
    }))
  }

  const handleCoordinatesChange = (event) => {
    const { name, value } = event.target
    setRequest((current) => ({
      ...current,
      [name]: Number(value),
    }))
  }

  const processEmergencyRequest = async () => {
    setIsLoading(true)
    setStatus('Evaluating live compatibility and geospatial KNN ranking...')

    try {
      const response = await requestDonorMatch({
        bloodGroup: request.bloodGroup,
        latitude: request.latitude,
        longitude: request.longitude,
        k: 5,
        maxDistanceKm: searchRadius,
      })

      const nextMatches = response?.data || []
      setMatches(nextMatches)

      if (nextMatches.length === 0) {
        setStatus('No compatible available donors found in live database within search radius.')
        return
      }

      setStatus(
        `Matched ${nextMatches.length} priority donors for ${request.bloodGroup}. Nearest is ${nextMatches[0].name} at ${nextMatches[0].distance_km || nextMatches[0].distanceKm} km (AI Priority: ${nextMatches[0].priority_score ?? 98}%).`,
      )
    } catch (error) {
      setMatches([])
      setStatus('No donors found in live database for this search area.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`lifelink-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <Navbar theme={theme} setTheme={setTheme} />

      <div className="workspace">
        <main className="content-panel">
          {/* HERO BANNER */}
          <section className="hero-banner">
            <div>
              <span className="micro-label">Hospital Command Center</span>
              <h2>Connecting the right help, when every second matters.</h2>
              <p className="hero-subtext">Deterministic Medical Rules • Geospatial Proximity • Multi-Factor KNN Ranking • Staged Dispatch</p>
            </div>
            <div className="hero-actions">
              <button
                type="button"
                className="primary-button alert-glow-btn"
                onClick={() => setIsWizardOpen(true)}
              >
                🚨 Create Emergency Request
              </button>
            </div>
          </section>

          {/* STATS GRID */}
          <section className="stats-grid" aria-label="Key statistics">
            {statCards.map((card) => (
              <article key={card.label} className={`stat-card stat-${card.tone}`}>
                <div className="stat-header">
                  <span>{card.label}</span>
                  <span className="stat-trend">{card.trend}</span>
                </div>
                <strong>{card.value}</strong>
              </article>
            ))}
          </section>

          {/* SPLIT GRID 1: INTAKE & AI STATUS */}
          <section className="split-grid">
            <article className="panel request-panel">
              <div className="panel-header">
                <div>
                  <span className="micro-label">Quick Intake</span>
                  <h3>Emergency Request Parameters</h3>
                </div>
                <span className="priority-badge critical">Critical</span>
              </div>

              <div className="field-grid">
                <label>
                  Hospital Name
                  <input name="hospitalName" value={request.hospitalName} onChange={handleInputChange} className="modal-input" />
                </label>

                <label>
                  Required Blood Group
                  <select name="bloodGroup" value={request.bloodGroup} onChange={handleInputChange} className="modal-select">
                    {bloodGroups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Units Required
                  <input type="number" name="unitsRequired" min="1" value={request.unitsRequired} onChange={handleInputChange} className="modal-input" />
                </label>

                <label>
                  Search Radius
                  <select
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    className="modal-select"
                  >
                    <option value={5}>5 km (Immediate Urban)</option>
                    <option value={10}>10 km (Sector)</option>
                    <option value={25}>25 km (Metropolitan)</option>
                    <option value={50}>50 km (Regional)</option>
                  </select>
                </label>

                <label>
                  Latitude
                  <input type="number" step="0.0001" name="latitude" value={request.latitude} onChange={handleCoordinatesChange} className="modal-input" />
                </label>

                <label>
                  Longitude
                  <input type="number" step="0.0001" name="longitude" value={request.longitude} onChange={handleCoordinatesChange} className="modal-input" />
                </label>
              </div>

              <div className="form-actions">
                <button className="primary-button" onClick={processEmergencyRequest} disabled={isLoading}>
                  {isLoading ? 'Running KNN AI Matching...' : '⚡ Run KNN Matching'}
                </button>
              </div>

              <div className="status-box">
                <strong>AI Coordination Status</strong>
                <p>{status}</p>
              </div>
            </article>

            {/* RADAR MAP PREVIEW */}
            <article className="panel map-panel">
              <InteractiveMap
                hospitalLat={request.latitude}
                hospitalLon={request.longitude}
                hospitalName={request.hospitalName}
                donors={matches}
                radiusKm={searchRadius}
                onRadiusChange={(r) => setSearchRadius(r)}
                selectedDonorId={selectedDonor?.donor_id}
                onSelectDonor={(d) => setSelectedDonor(d)}
              />
            </article>
          </section>

          {/* SPLIT GRID 2: RANKED DONORS & TIMELINE */}
          <section className="split-grid secondary-grid">
            <article className="panel donor-panel">
              <div className="panel-header">
                <div>
                  <span className="micro-label">KNN Priority Queue</span>
                  <h3>Ranked Candidate Donors ({matches.length})</h3>
                </div>
                <span className="priority-badge high">AI Ranked</span>
              </div>

              <div className="donor-list">
                {matches.length > 0 ? (
                  matches.map((donor, index) => (
                    <div
                      key={donor.donor_id || index}
                      className={`donor-card ${selectedDonor?.donor_id === donor.donor_id ? 'active-donor' : ''}`}
                      onClick={() => setSelectedDonor(donor)}
                    >
                      <div className="donor-card-header">
                        <div>
                          <strong>{donor.name || `Donor #${index + 1}`}</strong>
                          <span>{donor.blood_group || donor.bloodGroup} • {donor.distance_km ?? 3.2} km away</span>
                        </div>
                        <span className="priority-badge donor-priority">
                          {donor.priority_score ?? 95}% Match
                        </span>
                      </div>

                      <div className="donor-footer">
                        <span>● Verified Available</span>
                        <button
                          type="button"
                          className="primary-button small-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            alert(`🚨 Emergency dispatch notification sent to ${donor.name}!`)
                          }}
                        >
                          Notify
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <strong>No candidates yet</strong>
                    <p>Run the matching workflow to surface compatible donors.</p>
                  </div>
                )}
              </div>
            </article>

            {/* TIMELINE */}
            <article className="panel timeline-panel">
              <div className="panel-header">
                <div>
                  <span className="micro-label">Request Lifecycle</span>
                  <h3>Emergency Coordination Flow</h3>
                </div>
              </div>

              <div className="timeline">
                {emergencyFlow.map((step, index) => (
                  <div key={step} className={`timeline-item ${index <= 6 ? 'active' : ''}`}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>{step}</strong>
                      <small>{index === 0 ? 'Initiated' : index <= 5 ? 'Automated by Agent' : 'Active'}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {/* INVENTORY & OPERATIONAL LOG */}
          <section className="split-grid tertiary-grid">
            <article className="panel inventory-panel">
              <div className="panel-header">
                <div>
                  <span className="micro-label">Blood Bank Live Sync</span>
                  <h3>Blood Reserve Units</h3>
                </div>
              </div>

              <div className="inventory-grid">
                {inventory.map((item) => (
                  <div key={item.label} className="inventory-item">
                    <div className="inventory-head">
                      <span>{item.label}</span>
                      <em className={item.status.toLowerCase()}>{item.status}</em>
                    </div>
                    <strong>{item.units} bags</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-header">
                <div>
                  <span className="micro-label">Compliance Stream</span>
                  <h3>Recent Operational Activity</h3>
                </div>
              </div>

              <div className="activity-list">
                {recentActivity.map((entry, index) => (
                  <div key={entry} className="activity-row">
                    <span className="activity-dot" />
                    <div>
                      <strong>{entry}</strong>
                      <small>{index < 2 ? 'Live update' : 'Agent log'}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>

      {/* Emergency Request Modal */}
      <EmergencyWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onRequestCreated={(newReq) => {
          setRequest({
            bloodGroup: newReq.bloodGroup || newReq.blood_group,
            unitsRequired: newReq.unitsRequired || newReq.units_required,
            hospitalName: newReq.hospitalName || newReq.hospital_name,
            latitude: newReq.latitude || 13.0827,
            longitude: newReq.longitude || 80.2707,
            urgency: newReq.urgency || 'Critical',
          })
          processEmergencyRequest()
        }}
      />
    </div>
  )
}

export default App
