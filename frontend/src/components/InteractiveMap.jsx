import { useState } from 'react'

export default function InteractiveMap({
  hospitalLat = 11.0168,
  hospitalLon = 76.9558,
  hospitalName = 'KMCH Medical Center',
  donors = [],
  radiusKm = 25,
  onRadiusChange = null,
  selectedDonorId = null,
  onSelectDonor = null,
}) {
  const [hoveredDonor, setHoveredDonor] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Map center and scaling
  const mapCenter = { lat: hospitalLat, lon: hospitalLon }
  const scaleKmToPixels = (320 / Math.max(radiusKm * 1.3, 10)) * zoomLevel

  // Convert lat/lon offset to relative SVG coordinate (centered at 250, 200)
  const getCoordinates = (lat, lon) => {
    const dLatKm = (lat - mapCenter.lat) * 111.0
    const dLonKm = (lon - mapCenter.lon) * (111.0 * Math.cos((mapCenter.lat * Math.PI) / 180))
    
    // In SVG: X is longitude (East = right), Y is inverted latitude (North = up)
    const x = 250 + dLonKm * scaleKmToPixels
    const y = 200 - dLatKm * scaleKmToPixels
    return { x, y }
  }

  // Radius rings in km
  const rings = [5, 10, 20, Math.min(radiusKm, 50)]

  return (
    <div className="interactive-map-container">
      <div className="map-controls-bar">
        <div className="map-title-row">
          <span className="map-badge">🛰️ Live Geospatial Radar</span>
          <span className="map-center-name">{hospitalName}</span>
        </div>

        <div className="map-actions-row">
          <div className="radius-selector">
            <span>Radius:</span>
            {[5, 10, 20, 25, 50].map((r) => (
              <button
                key={r}
                type="button"
                className={`radius-pill ${radiusKm === r ? 'active' : ''}`}
                onClick={() => onRadiusChange && onRadiusChange(r)}
              >
                {r} km
              </button>
            ))}
          </div>

          <div className="zoom-controls">
            <button
              type="button"
              className="zoom-btn"
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
              title="Zoom Out"
            >
              -
            </button>
            <button
              type="button"
              className="zoom-btn"
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))}
              title="Zoom In"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="map-canvas-wrapper">
        <svg
          viewBox="0 0 500 400"
          className="geospatial-svg-map"
          aria-label="Geospatial Emergency Donor Map"
        >
          <defs>
            {/* Radar Sweep Effect */}
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#00E5FF" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
            </radialGradient>

            {/* Grid Pattern */}
            <pattern id="gridPattern" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(0, 229, 255, 0.07)" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="500" height="400" fill="url(#gridPattern)" />

          {/* Radius Glow */}
          <circle
            cx="250"
            cy="200"
            r={radiusKm * scaleKmToPixels}
            fill="url(#radarGlow)"
          />

          {/* Concentric Distance Rings */}
          {rings.map((ring) => {
            const rPx = ring * scaleKmToPixels
            if (rPx > 240) return null
            return (
              <g key={ring}>
                <circle
                  cx="250"
                  cy="200"
                  r={rPx}
                  fill="none"
                  stroke="rgba(0, 229, 255, 0.25)"
                  strokeWidth="1"
                  strokeDasharray={ring === radiusKm ? 'none' : '4,4'}
                />
                <text
                  x={255 + rPx}
                  y="196"
                  fill="rgba(0, 229, 255, 0.7)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {ring}km
                </text>
              </g>
            )
          })}

          {/* Crosshairs */}
          <line x1="250" y1="20" x2="250" y2="380" stroke="rgba(0, 229, 255, 0.12)" strokeWidth="1" />
          <line x1="20" y1="200" x2="480" y2="200" stroke="rgba(0, 229, 255, 0.12)" strokeWidth="1" />

          {/* Blood Bank Pin */}
          <g transform="translate(310, 160)" className="map-pin blood-bank-pin">
            <circle r="7" fill="#00E676" opacity="0.9" />
            <text y="3" textAnchor="middle" fill="#0B132B" fontSize="9" fontWeight="bold">B</text>
          </g>

          {/* Donor Pins */}
          {donors.map((donor, idx) => {
            const lat = donor.latitude ?? (hospitalLat + ((idx % 5) - 2) * 0.03)
            const lon = donor.longitude ?? (hospitalLon + ((idx % 4) - 1.5) * 0.03)
            const { x, y } = getCoordinates(lat, lon)
            const isSelected = selectedDonorId === (donor.donor_id || donor.id)
            const isAvailable = donor.availability !== false

            // Keep within map boundaries
            const boundedX = Math.max(25, Math.min(475, x))
            const boundedY = Math.max(25, Math.min(375, y))

            const pinColor = isSelected ? '#FF3366' : isAvailable ? '#00E5FF' : '#94A3B8'

            return (
              <g
                key={donor.donor_id || donor.id || idx}
                transform={`translate(${boundedX}, ${boundedY})`}
                className={`map-donor-pin ${isSelected ? 'selected' : ''}`}
                onMouseEnter={() => setHoveredDonor(donor)}
                onMouseLeave={() => setHoveredDonor(null)}
                onClick={() => onSelectDonor && onSelectDonor(donor)}
                style={{ cursor: 'pointer' }}
              >
                {/* Outer pulsing ring for selected/top candidates */}
                {isSelected && (
                  <circle r="14" fill="none" stroke="#FF3366" strokeWidth="2" opacity="0.8" className="pulse-ring" />
                )}

                <circle r={isSelected ? 9 : 7} fill={pinColor} opacity="0.9" />
                <text
                  y="3"
                  textAnchor="middle"
                  fill="#0B132B"
                  fontSize={isSelected ? '9' : '8'}
                  fontWeight="bold"
                >
                  {donor.blood_group || donor.bloodGroup || 'D'}
                </text>
              </g>
            )
          })}

          {/* Center Hospital Beacon */}
          <g transform="translate(250, 200)" className="hospital-center-beacon">
            <circle r="18" fill="none" stroke="#FF3366" strokeWidth="1.5" opacity="0.5" className="beacon-wave" />
            <circle r="10" fill="#FF3366" />
            <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">H</text>
          </g>
        </svg>

        {/* Floating Tooltip */}
        {hoveredDonor && (
          <div className="map-hover-card">
            <div className="hover-card-header">
              <strong>{hoveredDonor.name || hoveredDonor.donor_id || 'Donor'}</strong>
              <span className="blood-tag">{hoveredDonor.blood_group || hoveredDonor.bloodGroup}</span>
            </div>
            <div className="hover-card-details">
              <span>📍 {hoveredDonor.distance_km ?? hoveredDonor.distanceKm ?? '3.5'} km away</span>
              <span>⚡ Match Score: {hoveredDonor.priority_score ?? '95'}%</span>
              <span>● Status: {hoveredDonor.availability ? 'Available' : 'Unavailable'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="map-legend">
        <div className="legend-item"><span className="dot hospital-dot" /> Hospital (Origin)</div>
        <div className="legend-item"><span className="dot bank-dot" /> Blood Bank</div>
        <div className="legend-item"><span className="dot donor-avail-dot" /> Compatible Donor</div>
        <div className="legend-item"><span className="dot donor-select-dot" /> Selected / Top Match</div>
      </div>
    </div>
  )
}
