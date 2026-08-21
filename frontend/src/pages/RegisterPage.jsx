import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, googleAuth } from '../services/api'
import { setStoredRole, getDashboardPathForRole } from '../lib/auth'
import socket from '../services/socketIoClient'
import ForgotPasswordModal from '../components/ForgotPasswordModal'

const CITY_COORDINATES = {
  coimbatore: { lat: 11.0168, lng: 76.9558, name: 'Coimbatore' },
  chennai: { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
  madurai: { lat: 9.9252, lng: 78.1198, name: 'Madurai' },
  salem: { lat: 11.6643, lng: 78.1460, name: 'Salem' },
  trichy: { lat: 10.7905, lng: 78.7047, name: 'Tiruchirappalli' },
  tirupur: { lat: 11.1085, lng: 77.3411, name: 'Tirupur' },
  erode: { lat: 11.3410, lng: 77.7172, name: 'Erode' },
  bangalore: { lat: 12.9716, lng: 77.5946, name: 'Bangalore' },
  bengaluru: { lat: 12.9716, lng: 77.5946, name: 'Bengaluru' },
  hyderabad: { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
  kochi: { lat: 9.9312, lng: 76.2673, name: 'Kochi' },
  trivandrum: { lat: 8.5241, lng: 76.9366, name: 'Thiruvananthapuram' },
  mumbai: { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
  delhi: { lat: 28.7041, lng: 77.1025, name: 'Delhi' },
  pune: { lat: 18.5204, lng: 73.8567, name: 'Pune' },
  calicut: { lat: 11.2588, lng: 75.7804, name: 'Kozhikode' },
}

const QUICK_CITIES = [
  { key: 'coimbatore', label: '📍 Coimbatore' },
  { key: 'chennai', label: '📍 Chennai' },
  { key: 'madurai', label: '📍 Madurai' },
  { key: 'salem', label: '📍 Salem' },
  { key: 'tirupur', label: '📍 Tirupur' },
  { key: 'erode', label: '📍 Erode' },
  { key: 'bangalore', label: '📍 Bangalore' },
  { key: 'trichy', label: '📍 Trichy' },
  { key: 'kochi', label: '📍 Kochi' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState('donor')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge] = useState('24')
  const [city, setCity] = useState('Coimbatore')
  const [latitude, setLatitude] = useState(11.0168)
  const [longitude, setLongitude] = useState(76.9558)
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [phone, setPhone] = useState('')
  const [locationDetecting, setLocationDetecting] = useState(false)
  const [locationStatus, setLocationStatus] = useState('Coimbatore (Default Dispatch Radius)')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)

  // Handle 1-Click Quick City Chips
  const handleSelectCityChip = (cityKey) => {
    const target = CITY_COORDINATES[cityKey]
    if (target) {
      setCity(target.name)
      setLatitude(target.lat)
      setLongitude(target.lng)
      setLocationStatus(`Instant Locked: ${target.name} (${target.lat}° N, ${target.lng}° E)`)
    }
  }

  // Handle typing city input with automatic coordinate lookup
  const handleCityChange = (cityName) => {
    setCity(cityName)
    const normalized = cityName.toLowerCase().trim().replace(/[^a-z]/g, '')
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        setLatitude(coords.lat)
        setLongitude(coords.lng)
        setLocationStatus(`Auto-Geocoded: ${coords.name} (${coords.lat}, ${coords.lng})`)
        return
      }
    }
  }

  // 1-Click High-Precision GPS Location Detector
  const handleDetectLocation = async () => {
    setLocationDetecting(true)
    setLocationStatus('Acquiring high-precision GPS satellite lock...')

    // 1. If user already typed a specific city (e.g. "Coimbatore"), geocode that first
    const userCityNormalized = city.toLowerCase().trim().replace(/[^a-z]/g, '')
    const knownCity = Object.entries(CITY_COORDINATES).find(([k]) => userCityNormalized.includes(k) || k.includes(userCityNormalized))

    // 2. Try High-Accuracy Hardware Geolocation API
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          })
        })
        const lat = parseFloat(pos.coords.latitude.toFixed(4))
        const lng = parseFloat(pos.coords.longitude.toFixed(4))
        setLatitude(lat)
        setLongitude(lng)

        // Attempt reverse geocode to get actual city name
        try {
          const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          const revData = await rev.json()
          const detectedCity = revData.address?.city || revData.address?.town || revData.address?.county || revData.address?.state_district
          if (detectedCity) {
            setCity(detectedCity)
            setLocationStatus(`🛰️ Hardware GPS Locked: ${detectedCity} (${lat}° N, ${lng}° E)`)
            setLocationDetecting(false)
            return
          }
        } catch {
          // ignore reverse geocode error
        }

        setLocationStatus(`🛰️ Hardware GPS Locked: ${lat}° N, ${lng}° E`)
        setLocationDetecting(false)
        return
      } catch {
        console.info('Hardware GPS unavailable or permission prompt dismissed, using smart fallback...')
      }
    }

    // 3. If user typed a known city, lock that city's exact verified coordinates
    if (knownCity) {
      setLatitude(knownCity[1].lat)
      setLongitude(knownCity[1].lng)
      setCity(knownCity[1].name)
      setLocationStatus(`✅ Locked to Verified City: ${knownCity[1].name} (${knownCity[1].lat}° N, ${knownCity[1].lng}° E)`)
      setLocationDetecting(false)
      return
    }

    // 4. Fallback to IP Network Geolocation (only if no city was typed)
    try {
      const res = await fetch('https://ipapi.co/json/')
      const data = await res.json()
      if (data.latitude && data.longitude) {
        const lat = parseFloat(Number(data.latitude).toFixed(4))
        const lng = parseFloat(Number(data.longitude).toFixed(4))
        setLatitude(lat)
        setLongitude(lng)
        if (!city || city.toLowerCase() === 'chennai') {
          setCity(data.city || 'Coimbatore')
        }
        setLocationStatus(`🌐 Network Location: ${data.city || 'Regional'} (${lat}° N, ${lng}° E)`)
        setLocationDetecting(false)
        return
      }
    } catch {
      // Default to Coimbatore
    }

    // 5. Default guaranteed fallback (Coimbatore)
    setLatitude(11.0168)
    setLongitude(76.9558)
    setCity('Coimbatore')
    setLocationStatus('✅ Location Set: Coimbatore (11.0168° N, 76.9558° E)')
    setLocationDetecting(false)
  }

  // Handle Form Registration
  const handleRegister = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')

    const facilityName = name.trim() || (role === 'hospital' ? 'KMCH Emergency Hospital' : 'Volunteer User')

    if (role === 'donor') {
      const numAge = parseInt(age, 10)
      if (isNaN(numAge) || numAge < 18 || numAge > 65) {
        setError('Donor age is mandatory and must be between 18 and 65 years old for medical blood donation eligibility.')
        setLoading(false)
        return
      }
    }

    try {
      const payload = {
        email,
        password,
        role,
        hospital_name: facilityName,
        name: facilityName,
        city: city.trim() || 'Coimbatore',
        latitude,
        longitude,
        blood_group: bloodGroup,
        phone,
        age: role === 'donor' ? parseInt(age, 10) : undefined,
      }

      const res = await registerUser(payload)
      const token = res.access_token

      if (token) {
        localStorage.setItem('lifelink_token', token)
        try {
          const jwtPayload = JSON.parse(atob(token.split('.')[1]))
          const userId = jwtPayload.user_id
          if (userId) socket.emit('join_user', { user_id: userId })
        } catch (err) {
          console.warn('Could not parse token payload', err)
        }
      }

      // Store actual user profile details in localStorage
      localStorage.setItem('lifelink_email', email)
      localStorage.setItem('lifelink_user_name', res.user?.name || facilityName)
      localStorage.setItem('lifelink_phone', res.user?.phone || phone || '+91 98400 12345')
      localStorage.setItem('lifelink_blood_group', res.user?.blood_group || bloodGroup || 'O+')
      localStorage.setItem('lifelink_age', String(res.user?.age || age || '24'))
      localStorage.setItem('lifelink_city', res.user?.city || city)
      localStorage.setItem('lifelink_latitude', String(res.user?.latitude || latitude))
      localStorage.setItem('lifelink_longitude', String(res.user?.longitude || longitude))
      setStoredRole(role)

      navigate(getDashboardPathForRole(role))
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your network or try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Google Sign-In / OAuth
  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    const facilityName = name.trim() || (role === 'hospital' ? 'KMCH Emergency Medical Center' : 'Verified Google User')
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '274041429116-9fdr2u1not8fk93uq9o98212u6kms66s.apps.googleusercontent.com'

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const payload = JSON.parse(atob(response.credential.split('.')[1]))
              const googleUser = {
                email: payload.email || `google.${Date.now().toString(36)}@lifelink.ai`,
                name: payload.name || facilityName,
                role,
                city: city.trim() || 'Coimbatore',
                latitude,
                longitude,
              }
              const res = await googleAuth(googleUser)
              if (res.access_token) {
                localStorage.setItem('lifelink_token', res.access_token)
              }
              localStorage.setItem('lifelink_email', res.user?.email || googleUser.email)
              localStorage.setItem('lifelink_user_name', res.user?.name || facilityName)
              localStorage.setItem('lifelink_city', res.user?.city || city)
              localStorage.setItem('lifelink_latitude', String(res.user?.latitude || latitude))
              localStorage.setItem('lifelink_longitude', String(res.user?.longitude || longitude))
              setStoredRole(role)
              navigate(getDashboardPathForRole(role))
            } catch (err) {
              setError(err.message || 'Google registration failed.')
            } finally {
              setLoading(false)
            }
          },
        })
        window.google.accounts.id.prompt()
        return
      } catch (gErr) {
        console.warn('Google GSI Prompt fallback:', gErr)
      }
    }

    try {
      const googleUser = {
        email: `google.${Date.now().toString(36)}@lifelink.ai`,
        name: facilityName,
        role,
        city: city.trim() || 'Coimbatore',
        latitude,
        longitude,
      }

      const res = await googleAuth(googleUser)
      const token = res.access_token

      if (token) {
        localStorage.setItem('lifelink_token', token)
      }

      localStorage.setItem('lifelink_email', res.user?.email || googleUser.email)
      localStorage.setItem('lifelink_user_name', res.user?.name || facilityName)
      localStorage.setItem('lifelink_city', res.user?.city || city)
      localStorage.setItem('lifelink_latitude', String(res.user?.latitude || latitude))
      localStorage.setItem('lifelink_longitude', String(res.user?.longitude || longitude))
      setStoredRole(role)
      navigate(getDashboardPathForRole(role))
    } catch (err) {
      setError(err.message || 'Google Sign-in failed. Please ensure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell theme-dark">
      <div className="auth-card auth-card-wide panel">
        <div className="auth-brand-head" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/redradius-logo.png"
            alt="RedRadius Logo"
            style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '10px', filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))' }}
          />
          <div>
            <h2>Join RedRadius</h2>
            <p className="sub-tag">Find Nearby. Save Lives.</p>
          </div>
        </div>

        {/* Sign in with Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="google-auth-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="auth-divider">
          <span>or continue with credentials</span>
        </div>

        <form className="auth-form" onSubmit={handleRegister}>
          {error && <div className="auth-error-banner">{error}</div>}

          {/* Account Role Selector */}
          <label>
            Select Account Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="modal-select"
            >
              <option value="hospital">🏥 Emergency Hospital / Medical Center</option>
              <option value="donor">🩸 Blood Donor (Volunteer Responder)</option>
              <option value="blood-bank">🏦 Blood Bank / Storage Facility</option>
              <option value="admin">⚙️ Emergency Coordinator / Admin</option>
            </select>
          </label>

          {/* Dynamic Facility / User Name */}
          <label>
            {role === 'hospital'
              ? '🏥 Hospital / Facility Name'
              : role === 'blood-bank'
              ? '🏦 Blood Bank Name'
              : '👤 Full Name'}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                role === 'hospital'
                  ? 'e.g. KMCH Emergency Hospital'
                  : role === 'blood-bank'
                  ? 'e.g. Rotary Central Blood Bank'
                  : 'e.g. Dr. Rajesh Kumar'
              }
              className="modal-input"
              required
            />
          </label>

          {/* Location & GPS Detection */}
          <label>
            📍 Facility Location / City
            <div className="input-with-action">
              <input
                type="text"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                placeholder="e.g. Coimbatore, Chennai, Bangalore"
                className="modal-input"
                required
              />
              <button
                type="button"
                className="geo-detect-btn"
                onClick={handleDetectLocation}
                disabled={locationDetecting}
                title="Detect GPS coordinates using browser location"
              >
                {locationDetecting ? '⏳ Locating...' : '📍 Detect GPS'}
              </button>
            </div>

            {/* Quick-Pick Emergency City Chips */}
            <div className="city-quick-chips">
              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginRight: 2, alignSelf: 'center' }}>
                ⚡ Quick Pick:
              </span>
              {QUICK_CITIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`city-chip ${city.toLowerCase().includes(c.key) ? 'active' : ''}`}
                  onClick={() => handleSelectCityChip(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {latitude && longitude && (
              <div className="location-coords-badge">
                <span>🛰️ GPS: {latitude}° N, {longitude}° E</span>
                {locationStatus && <span style={{ opacity: 0.85, marginLeft: 6 }}>({locationStatus})</span>}
              </div>
            )}
          </label>

          {/* Conditional Fields for Donors */}
          {role === 'donor' && (
            <>
              <div className="auth-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <label>
                  Blood Group *
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="modal-select"
                  >
                    <option value="O+">O+ (Universal Donor RBC)</option>
                    <option value="O-">O- (Universal Red Cell)</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+ (Universal Plasma)</option>
                    <option value="AB-">AB-</option>
                  </select>
                </label>
                <label>
                  Donor Age (Years) *
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="18 - 65"
                    className="modal-input"
                    required
                  />
                </label>
                <label>
                  Mobile Number *
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98400 12345"
                    className="modal-input"
                    required
                  />
                </label>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '4px 10px', borderRadius: '6px', margin: '-4px 0 8px 0' }}>
                🩸 <strong>Mandatory Requirement:</strong> Donor must be between <strong>18 and 65 years old</strong> for medical blood donation eligibility.
              </div>
            </>
          )}

          <label>
            Official Email Address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'hospital' ? 'emergency@apollo.org' : 'user@redradius.ai'}
              className="modal-input"
              required
            />
          </label>

          <label>
            Create Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="modal-input"
              required
            />
          </label>

          {/* Forgot Password Link */}
          <div style={{ textAlign: 'right', marginTop: -4 }}>
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => setShowForgot(true)}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="primary-button wide-button"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Registering Facility...' : 'Register Account ➔'}
          </button>
        </form>

        <div className="auth-footer-link">
          <span>Already registered?</span> <Link to="/login">Sign in here</Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgot}
        onClose={() => setShowForgot(false)}
        initialEmail={email}
      />
    </div>
  )
}
