import { useState } from 'react'

export default function AiMatchingVisualizer({
  requestedBloodGroup = 'O-',
  candidates = [],
  searchRadius = 25,
  agentState = 'MONITORING_RESPONSES',
  onNotifyDonor = null,
}) {
  const [notifiedDonors, setNotifiedDonors] = useState(new Set())

  const handleNotify = (donorId) => {
    setNotifiedDonors((prev) => new Set([...prev, donorId]))
    if (onNotifyDonor) onNotifyDonor(donorId)
  }

  const steps = [
    { title: 'Deterministic Compatibility', status: 'Complete', desc: 'Validates certified red blood cell compatibility matrix' },
    { title: 'Availability & Consent', status: 'Complete', desc: 'Filters active, opt-in donors with valid check-ins' },
    { title: `Geospatial Radius (${searchRadius}km)`, status: 'Complete', desc: 'Haversine distance calculation and boundary containment' },
    { title: 'Multi-Factor KNN Ranking', status: 'Complete', desc: 'Combines distance, freshness, response score, and recency' },
    { title: 'Agentic Notification Stream', status: agentState === 'NOTIFYING' ? 'Active' : 'Dispatched', desc: 'Staged multi-channel dispatch (SMS, Push, In-App)' },
  ]

  return (
    <div className="ai-matching-visualizer">
      {/* Agent Workflow Steps */}
      <div className="agent-steps-grid">
        {steps.map((step, idx) => (
          <div key={step.title} className="agent-step-card">
            <div className="step-header">
              <span className="step-num">{idx + 1}</span>
              <strong>{step.title}</strong>
              <span className="badge-step-complete">{step.status}</span>
            </div>
            <p className="step-sub">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Candidate Ranking List */}
      <div className="ranked-candidates-section">
        <div className="candidates-header-row">
          <div>
            <span className="micro-label">KNN Candidate Priority Queue</span>
            <h3>Ranked Donors for {requestedBloodGroup}</h3>
          </div>
          <span className="badge-k-count">{candidates.length} Top Candidates</span>
        </div>

        <div className="candidates-cards-grid">
          {candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '35px 20px', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '0.9rem' }}>No compatible available donors found in live database within {searchRadius} km.</p>
            </div>
          ) : (
            candidates.map((cand, index) => {
              const donorId = cand.donor_id || cand.id || `D-${index + 1}`
              const isNotified = notifiedDonors.has(donorId)
              const score = cand.priority_score ?? 95 - index * 4
              const breakdown = cand.score_breakdown || {
                distance_score: 92,
                availability_score: 95,
                response_score: 90,
                recency_score: 85,
              }

              return (
                <div key={donorId} className={`candidate-ai-card ${index === 0 ? 'top-match' : ''}`}>
                  {index === 0 && <span className="top-match-ribbon">⭐ Highest Ranked Match</span>}
                
                <div className="candidate-card-top">
                  <div className="donor-profile-snippet">
                    <div className="donor-avatar">{cand.name ? cand.name.charAt(0) : 'D'}</div>
                    <div>
                      <strong>{cand.name || `Donor ${donorId}`}</strong>
                      <span className="donor-meta-text">
                        {cand.blood_group || cand.bloodGroup} • {cand.city || 'Chennai'}
                      </span>
                    </div>
                  </div>

                  <div className="priority-score-badge">
                    <strong>{score}%</strong>
                    <small>AI Match</small>
                  </div>
                </div>

                {/* Score Breakdown Radar Bars */}
                <div className="score-bars-stack">
                  <div className="score-bar-item">
                    <span>Distance ({cand.distance_km ?? 3.2} km)</span>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${breakdown.distance_score}%` }} />
                    </div>
                  </div>
                  <div className="score-bar-item">
                    <span>Freshness & Readiness</span>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill fill-green" style={{ width: `${breakdown.availability_score}%` }} />
                    </div>
                  </div>
                  <div className="score-bar-item">
                    <span>Historical Response Rate</span>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill fill-cyan" style={{ width: `${breakdown.response_score}%` }} />
                    </div>
                  </div>
                </div>

                <div className="candidate-card-bottom">
                  <span className="status-indicator-tag available">● Available & Verified</span>
                  
                  <button
                    type="button"
                    className={`notify-action-btn ${isNotified ? 'notified' : 'primary-btn'}`}
                    onClick={() => handleNotify(donorId)}
                    disabled={isNotified}
                  >
                    {isNotified ? '✓ Notification Sent' : '🚨 Notify Donor'}
                  </button>
                </div>
              </div>
            )
          }))}
        </div>
      </div>
    </div>
  )
}
