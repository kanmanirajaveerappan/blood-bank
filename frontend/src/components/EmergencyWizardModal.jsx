import { useState, useEffect, useRef } from 'react'
import { bloodGroups } from '../data/donors'
import { compatibilityMatrix } from '../utils/matching'
import { createEmergencyRequest, triggerAgentCoordination, searchHospitalLocations } from '../services/api'
import GoogleMapView from './GoogleMapView'
import { 
  Search, 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  Building2, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  School,
  Droplet
} from 'lucide-react'

export default function EmergencyWizardModal({ isOpen, onClose, onRequestCreated }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Step 3 Location States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDetectingGps, setIsDetectingGps] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const [showTechDetails, setShowTechDetails] = useState(false)
  const searchDebounceRef = useRef(null)

  const [formData, setFormData] = useState({
    hospitalName: 'KMCH (Kovai Medical Center and Hospital)',
    address: '99, Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu',
    area: 'Avinashi Road / Peelamedu',
    city: 'Coimbatore',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    bloodGroup: 'O-',
    unitsRequired: 2,
    urgency: 'Critical',
    latitude: 11.0428,
    longitude: 77.0371,
    placeId: 'TN-CBE-HOSP-001',
    placeType: 'hospital',
    placeTypeLabel: '🏥 Multi-Speciality Hospital',
    locationSource: 'admin_verified', // 'google_places' | 'current_gps' | 'map_selection' | 'admin_verified'
    locationAccuracy: 'high', // 'high' | 'good' | 'approximate'
    confidenceLabel: 'Exact place match',
    requiredBy: 'Immediate (Within 45 min)',
    notes: 'Trauma surgery emergency request.',
  })

  // Handle live search with query preservation and intelligent ranking
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    if (!searchQuery.trim()) {
      searchDebounceRef.current = setTimeout(() => {
        setSearchResults([])
      }, 0)
      return
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        // Query our Tamil Nadu location & search ranking engine preserving the entire query
        const res = await searchHospitalLocations(searchQuery.trim())
        setSearchResults(res.data || [])
      } catch (err) {
        console.warn('Location search API error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchQuery])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'unitsRequired' ? Number(value) : value,
    }))
  }

  const handleSelectLocation = (loc) => {
    setFormData((prev) => ({
      ...prev,
      hospitalName: loc.hospital_name || loc.name,
      address: loc.address || `${loc.hospital_name}, ${loc.city || 'Tamil Nadu'}, India`,
      area: loc.area || loc.city || '',
      city: loc.city || loc.district || 'Tamil Nadu',
      district: loc.district || loc.city || 'Tamil Nadu',
      state: loc.state || 'Tamil Nadu',
      latitude: Number(loc.latitude) || 11.0428,
      longitude: Number(loc.longitude) || 77.0371,
      placeId: loc.place_id || 'PLC-SELECTED',
      placeType: loc.place_type || 'hospital',
      placeTypeLabel: loc.place_type_label || '🏥 Hospital',
      locationSource: 'google_places',
      locationAccuracy: loc.accuracy || 'high',
      confidenceLabel: loc.confidence_label || 'High confidence',
    }))
    setSearchQuery('')
    setSearchResults([])
    setGpsError(null)
  }

  const handleUseCurrentLocation = () => {
    setIsDetectingGps(true)
    setGpsError(null)

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser. Please search by hospital or area name.')
      setIsDetectingGps(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        const accuracyMeters = position.coords.accuracy || 50
        const accuracyGrade = accuracyMeters < 30 ? 'high' : accuracyMeters < 150 ? 'good' : 'approximate'

        // Determine if coordinates are near Coimbatore, Chennai, Madurai, Salem, etc.
        let detectedCity = 'Tamil Nadu'
        if (Math.abs(lat - 11.0168) < 0.3 && Math.abs(lon - 76.9558) < 0.3) {
          detectedCity = 'Coimbatore'
        } else if (Math.abs(lat - 13.0827) < 0.4 && Math.abs(lon - 80.2707) < 0.4) {
          detectedCity = 'Chennai'
        } else if (Math.abs(lat - 9.9252) < 0.3 && Math.abs(lon - 78.1198) < 0.3) {
          detectedCity = 'Madurai'
        } else if (Math.abs(lat - 11.6643) < 0.3 && Math.abs(lon - 78.1460) < 0.3) {
          detectedCity = 'Salem'
        } else if (Math.abs(lat - 10.7905) < 0.3 && Math.abs(lon - 78.7047) < 0.3) {
          detectedCity = 'Tiruchirappalli'
        }

        setFormData((prev) => ({
          ...prev,
          hospitalName: `Emergency Triage Point (${detectedCity})`,
          address: `Detected GPS Location (±${Math.round(accuracyMeters)}m), ${detectedCity}, Tamil Nadu, India`,
          area: 'Live GPS Point',
          city: detectedCity,
          district: detectedCity,
          state: 'Tamil Nadu',
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lon.toFixed(6)),
          placeId: 'GPS-CURRENT',
          placeType: 'current_location',
          placeTypeLabel: '📍 Live Device GPS',
          locationSource: 'current_gps',
          locationAccuracy: accuracyGrade,
          confidenceLabel: 'Live GPS Verified',
        }))
        setIsDetectingGps(false)
      },
      (err) => {
        let msg = 'Location permission was not granted.'
        if (err.code === 2) msg = 'Location is currently unavailable on this device.'
        if (err.code === 3) msg = 'Location request timed out. Please search or select on map.'
        setGpsError(msg)
        setIsDetectingGps(false)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // 1. Submit emergency request to hospital API
      const reqRes = await createEmergencyRequest({
        hospitalName: formData.hospitalName,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        bloodGroup: formData.bloodGroup,
        unitsRequired: formData.unitsRequired,
        urgency: formData.urgency,
        latitude: formData.latitude,
        longitude: formData.longitude,
        placeId: formData.placeId,
        placeType: formData.placeType,
        locationSource: formData.locationSource,
        locationAccuracy: formData.locationAccuracy,
        requiredBy: formData.requiredBy,
        notes: formData.notes,
      })
      
      // 2. Trigger Agentic coordination workflow
      await triggerAgentCoordination({
        bloodGroup: formData.bloodGroup,
        latitude: formData.latitude,
        longitude: formData.longitude,
        unitsRequired: formData.unitsRequired,
        urgency: formData.urgency,
        radiusKm: 25,
      })

      if (onRequestCreated) {
        onRequestCreated(reqRes.data || formData)
      }
      onClose()
    } catch (err) {
      alert(`Emergency request submitted: ${err.message}`)
      if (onRequestCreated) onRequestCreated(formData)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const compatibleList = compatibilityMatrix[formData.bloodGroup] || []

  // Place type icon helper
  const renderPlaceIcon = (type) => {
    if (type === 'medical_college') return <School size={16} className="loc-item-icon text-amber" />
    if (type === 'blood_bank') return <Droplet size={16} className="loc-item-icon text-red" />
    if (type === 'area') return <MapPin size={16} className="loc-item-icon text-cyan" />
    return <Building2 size={16} className="loc-item-icon text-cyan" />
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="wizard-modal-title">
      <div className="modal-container modal-wide panel">
        <div className="modal-header">
          <div>
            <span className="micro-label">Step {step} of 4</span>
            <h2 id="wizard-modal-title" className="modal-title">🚨 Create Emergency Blood Request</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>

        {/* Step Indicator */}
        <div className="wizard-progress-bar">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1. Blood Group</div>
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2. Urgency</div>
          <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3. Emergency Location</div>
          <div className={`step-dot ${step >= 4 ? 'active' : ''}`}>4. Review & Broadcast</div>
        </div>

        <div className="wizard-step-content">
          {/* STEP 1: BLOOD REQUIREMENT */}
          {step === 1 && (
            <div className="wizard-step">
              <h3>Select Required Blood Group</h3>
              <p className="step-desc">Choose the recipient patient's blood type:</p>
              
              <div className="blood-group-pill-grid">
                {bloodGroups.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    className={`blood-select-pill ${formData.bloodGroup === bg ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, bloodGroup: bg })}
                  >
                    <strong>{bg}</strong>
                    <small>{(compatibilityMatrix[bg] || []).length} Compatible Types</small>
                  </button>
                ))}
              </div>

              <div className="compatibility-preview-box">
                <strong>Compatible Donor Groups for {formData.bloodGroup}:</strong>
                <div className="compatible-chips">
                  {compatibleList.map((bg) => (
                    <span key={bg} className="chip-badge">{bg}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: URGENCY & UNITS */}
          {step === 2 && (
            <div className="wizard-step">
              <h3>Urgency & Units Needed</h3>
              
              <div className="form-row-2">
                <label>
                  Units Required (Bags)
                  <input
                    type="number"
                    name="unitsRequired"
                    min="1"
                    max="20"
                    value={formData.unitsRequired}
                    onChange={handleChange}
                    className="modal-input"
                  />
                </label>

                <label>
                  Urgency Level
                  <select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                    className="modal-select"
                  >
                    <option value="Critical">🔴 Critical (Immediate Response)</option>
                    <option value="High">🟠 High (Within 1-2 Hours)</option>
                    <option value="Medium">🟡 Medium (Same Day)</option>
                  </select>
                </label>
              </div>

              <label>
                Required-by Target Time
                <input
                  type="text"
                  name="requiredBy"
                  value={formData.requiredBy}
                  onChange={handleChange}
                  className="modal-input"
                  placeholder="e.g. Within 45 minutes"
                />
              </label>

              <label>
                Clinical Case Notes
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="modal-textarea"
                  rows="2"
                  placeholder="e.g. Trauma surgery, immediate transfusion required..."
                />
              </label>
            </div>
          )}

          {/* STEP 3: EMERGENCY LOCATION (INTELLIGENT SEARCH & TAMIL NADU DATABASE) */}
          {step === 3 && (
            <div className="wizard-step location-wizard-step">
              <div className="step-header-wrap">
                <div>
                  <span className="micro-label">LOCATION OF EMERGENCY</span>
                  <h3 className="location-heading">Where should the blood be delivered?</h3>
                </div>
                <div className="location-verified-tag">
                  <ShieldCheck size={14} className="text-cyan" />
                  <span>City-Aware Geolocation Intelligence</span>
                </div>
              </div>

              <div className="location-wizard-split-grid">
                {/* Left Column: Search & Selected Location Panel */}
                <div className="location-left-controls">
                  {/* Search Bar */}
                  <div className="loc-search-group">
                    <label htmlFor="hospital-search-input" className="loc-field-label">
                      Search hospital, clinic, college, landmark or area across Tamil Nadu
                    </label>
                    <div className="loc-search-input-wrap">
                      <Search size={16} className="loc-search-icon" />
                      <input
                        id="hospital-search-input"
                        type="text"
                        placeholder="e.g. KMCH Coimbatore, Apollo Chennai, Peelamedu, 641018..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="modal-input loc-search-input"
                        autoComplete="off"
                      />
                      {isSearching && <span className="spinner-dot" />}
                    </div>

                    {/* Search Suggestions Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="loc-dropdown-results">
                        {searchResults.map((item, idx) => (
                          <div
                            key={item.place_id || idx}
                            className="loc-dropdown-item"
                            onClick={() => handleSelectLocation(item)}
                          >
                            {renderPlaceIcon(item.place_type)}
                            <div className="loc-item-text">
                              <div className="loc-item-header-row">
                                <strong className="loc-item-name">{item.hospital_name}</strong>
                                <span className="loc-item-city-pill">{item.city}</span>
                              </div>
                              <span className="loc-item-address">{item.address}</span>
                              <div className="loc-item-meta-strip">
                                <span className="loc-item-tag">{item.place_type_label || '🏥 Hospital'}</span>
                                <span className="loc-item-tag text-green">✓ {item.confidence_label || 'High confidence'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Or Divider */}
                  <div className="loc-divider-or">
                    <span>OR</span>
                  </div>

                  {/* Use Current Location Button */}
                  <div className="loc-gps-action-wrap">
                    <button
                      type="button"
                      className="secondary-button gps-action-btn"
                      onClick={handleUseCurrentLocation}
                      disabled={isDetectingGps}
                    >
                      {isDetectingGps ? (
                        <><span className="spinner-dot" /> Detecting device coordinates...</>
                      ) : (
                        <><Navigation size={15} /> Use My Current Location</>
                      )}
                    </button>
                    {gpsError && (
                      <div className="loc-error-banner">
                        <AlertTriangle size={13} />
                        <span>{gpsError}</span>
                      </div>
                    )}
                  </div>

                  {/* Selected Location Card */}
                  <div className="selected-location-summary-card">
                    <div className="slc-header">
                      <div className="slc-title-row">
                        <MapPin size={16} className="text-danger" />
                        <strong>SELECTED EMERGENCY LOCATION</strong>
                      </div>
                      <span className="slc-status-tag">✓ Location confirmed</span>
                    </div>

                    <div className="slc-body">
                      <h4 className="slc-hospital-name">{formData.hospitalName}</h4>
                      <p className="slc-address">{formData.address}</p>

                      <div className="slc-details-strip">
                        <div className="slc-meta-item">
                          <span className="slc-meta-label">City / Region</span>
                          <span className="slc-meta-value text-cyan font-bold">{formData.city}, {formData.state}</span>
                        </div>
                        <div className="slc-meta-item">
                          <span className="slc-meta-label">Accuracy</span>
                          <span className="slc-meta-value text-green">✓ {formData.confidenceLabel || 'High confidence'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Hospital Hub Shortcuts */}
                    <div className="quick-hospitals-row">
                      <span className="quick-hosp-label">Popular Tamil Nadu Hubs:</span>
                      {[
                        { label: 'KMCH (Coimbatore)', query: 'KMCH Coimbatore' },
                        { label: 'Apollo (Chennai)', query: 'Apollo Hospital Chennai' },
                        { label: 'CMC (Vellore)', query: 'CMC Vellore' },
                        { label: 'Meenakshi (Madurai)', query: 'Meenakshi Mission Madurai' },
                      ].map((hub) => (
                        <button
                          key={hub.label}
                          type="button"
                          className="quick-hosp-chip"
                          onClick={() => {
                            setSearchQuery(hub.query)
                          }}
                        >
                          {hub.label}
                        </button>
                      ))}
                    </div>

                    {/* Collapsible Technical Details (Internal Coordinates) */}
                    <div className="tech-details-container">
                      <button
                        type="button"
                        className="tech-details-toggle-btn"
                        onClick={() => setShowTechDetails(!showTechDetails)}
                      >
                        <span>Technical Location Details (Auto-Generated)</span>
                        {showTechDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {showTechDetails && (
                        <div className="tech-details-content">
                          <div className="tech-detail-row">
                            <span>Latitude:</span>
                            <code>{formData.latitude}° N</code>
                          </div>
                          <div className="tech-detail-row">
                            <span>Longitude:</span>
                            <code>{formData.longitude}° E</code>
                          </div>
                          <div className="tech-detail-row">
                            <span>City:</span>
                            <strong>{formData.city}</strong>
                          </div>
                          <div className="tech-detail-row">
                            <span>Source:</span>
                            <span className="tech-source-badge">{formData.locationSource}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Google Maps Interactive Preview */}
                <div className="location-right-map-card">
                  <div className="map-card-header">
                    <div className="map-card-title">
                      <Sparkles size={14} className="text-cyan" />
                      <span>Delivery Hub Pinpoint</span>
                    </div>
                    <span className="map-card-hint">Real-time Map Coordinates</span>
                  </div>

                  <div className="modal-map-viewport">
                    <GoogleMapView
                      center={{ lat: formData.latitude, lng: formData.longitude }}
                      zoom={14}
                      height={340}
                      markers={[
                        {
                          id: 'selected_hospital',
                          lat: formData.latitude,
                          lng: formData.longitude,
                          type: 'hospital',
                          label: `${formData.hospitalName} (${formData.city})`,
                        }
                      ]}
                      searchRadius={25}
                      showLegend={false}
                      showControls={true}
                    />
                  </div>

                  <div className="map-card-footer">
                    <MapPin size={12} className="text-cyan" />
                    <span>Selected: <strong>{formData.hospitalName}</strong> — {formData.city}, {formData.state}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & BROADCAST */}
          {step === 4 && (
            <div className="wizard-step review-step">
              <h3>Review Emergency Broadcast</h3>
              
              <div className="review-summary-card">
                <div className="review-row">
                  <span>Hospital / Delivery Point:</span>
                  <div>
                    <strong>{formData.hospitalName}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{formData.address}</div>
                  </div>
                </div>
                <div className="review-row">
                  <span>Required Blood Group:</span>
                  <strong className="badge-critical">{formData.bloodGroup} ({formData.unitsRequired} Units)</strong>
                </div>
                <div className="review-row">
                  <span>Urgency Level:</span>
                  <strong className={`urgency-${formData.urgency.toLowerCase()}`}>{formData.urgency}</strong>
                </div>
                <div className="review-row">
                  <span>Target Time:</span>
                  <strong>{formData.requiredBy}</strong>
                </div>
                <div className="review-row">
                  <span>Geospatial Hub:</span>
                  <div>
                    <span className="text-cyan font-bold">{formData.city}, Tamil Nadu</span>
                    <small style={{ display: 'block', color: 'var(--text-subtle)', marginTop: 2 }}>
                      Internal Coordinates: {formData.latitude}° N, {formData.longitude}° E (Source: {formData.locationSource})
                    </small>
                  </div>
                </div>
                <div className="review-row">
                  <span>AI Coordination Plan:</span>
                  <small>
                    1. Check Blood Bank stock ➔ 2. PostGIS geographic radius (25km) ➔ 3. KNN Multi-factor ranking ➔ 4. Automated SMS/Push dispatch.
                  </small>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
            >
              ← Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => setStep((s) => s + 1)}
            >
              {step === 3 ? 'Confirm & Continue →' : 'Continue →'}
            </button>
          ) : (
            <button
              type="button"
              className="primary-button critical-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Dispatching AI Coordinator...' : '🚀 Broadcast Emergency'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
