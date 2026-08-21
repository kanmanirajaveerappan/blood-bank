import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getStoredRole, setStoredRole, clearStoredRole, getDashboardPathForRole } from '../lib/auth'
import { useLanguage } from '../context/LanguageContext'
import { Globe } from 'lucide-react'

export default function Navbar({ theme, setTheme }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { language, setLanguage, t, languages } = useLanguage()

  const [role, setRole] = useState(getStoredRole() || 'hospital')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userCity, setUserCity] = useState('')
  const [userLat, setUserLat] = useState('')
  const [userLng, setUserLng] = useState('')
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    const current = getStoredRole()
    if (current) setRole(current)
    const email = localStorage.getItem('lifelink_email') || 'operations@lifelink.ai'
    setUserEmail(email)
    const name = localStorage.getItem('lifelink_user_name') || (current === 'hospital' ? 'KMCH Emergency Hospital' : 'User Account')
    setUserName(name)
    const city = localStorage.getItem('lifelink_city') || 'Coimbatore'
    setUserCity(city)
    const lat = localStorage.getItem('lifelink_latitude') || '11.0168'
    setUserLat(lat)
    const lng = localStorage.getItem('lifelink_longitude') || '76.9558'
    setUserLng(lng)
  }, [location.pathname])

  const handleRoleChange = (newRole) => {
    setRole(newRole)
    setStoredRole(newRole)
    navigate(getDashboardPathForRole(newRole))
  }

  const handleLogout = () => {
    clearStoredRole()
    localStorage.removeItem('lifelink_token')
    localStorage.removeItem('lifelink_email')
    localStorage.removeItem('lifelink_user_name')
    localStorage.removeItem('lifelink_phone')
    localStorage.removeItem('lifelink_blood_group')
    localStorage.removeItem('lifelink_city')
    localStorage.removeItem('lifelink_latitude')
    localStorage.removeItem('lifelink_longitude')
    navigate('/login')
  }

  const navLinks = useMemo(() => {
    if (role === 'donor') {
      return [
        { label: t('navHome'), path: '/' },
        { label: '🩸 ' + t('navDonor'), path: '/donor/dashboard' },
        { label: '🚨 Emergency Route', path: '/navigation' },
        { label: t('navMatching'), path: '/ai-matching' },
      ]
    }
    if (role === 'hospital') {
      return [
        { label: t('navHome'), path: '/' },
        { label: '🏥 ' + t('navHospital'), path: '/hospital/dashboard' },
        { label: '🚨 Emergency Route', path: '/navigation' },
        { label: t('navMatching'), path: '/ai-matching' },
      ]
    }
    if (role === 'blood-bank' || role === 'blood_bank') {
      return [
        { label: t('navHome'), path: '/' },
        { label: '🏦 ' + t('navBloodBank'), path: '/blood-bank/dashboard' },
        { label: t('navMatching'), path: '/ai-matching' },
      ]
    }
    // Admin role has full access
    return [
      { label: t('navHome'), path: '/' },
      { label: '⚙️ ' + t('navAdmin'), path: '/admin/dashboard' },
      { label: '🏥 ' + t('navHospital'), path: '/hospital/dashboard' },
      { label: '🩸 ' + t('navDonor'), path: '/donor/dashboard' },
      { label: '🏦 ' + t('navBloodBank'), path: '/blood-bank/dashboard' },
      { label: t('navMatching'), path: '/ai-matching' },
    ]
  }, [role, t])

  return (
    <header className="global-navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          <img
            src="/redradius-logo.png"
            alt="RedRadius Logo"
            className="brand-logo-img"
            style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '10px', filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))' }}
          />
          <div className="brand-text">
            <strong className="brand-title">Red<span style={{ color: '#ef4444' }}>Radius</span></strong>
            <span className="brand-sub">{t('emergencyCoord')}</span>
          </div>
        </Link>

        <nav className="navbar-links" aria-label="Portal Navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || 
              (link.path === '/ai-matching' && (location.pathname === '/dashboard' || location.pathname === '/matching'))
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-pill ${isActive ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="navbar-right">
        {/* Multi-Language Selector (English / தமிழ் / हिन्दी) */}
        <div className="language-selector-box" title="Select Display Language">
          <Globe size={14} style={{ color: 'var(--cyan, #00d2ff)' }} />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="language-select-dropdown"
            aria-label="Select Language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Role Quick Switcher for seamless pair-testing */}
        <div className="role-switcher-box" title="Switch active portal role simulator">
          <span className="role-label">{t('role')}:</span>
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="role-select"
          >
            <option value="hospital">🏥 {t('roleHospital')}</option>
            <option value="donor">🩸 {t('roleDonor')}</option>
            <option value="blood-bank">🏦 {t('roleBloodBank')}</option>
            <option value="admin">⚙️ {t('roleAdmin')}</option>
          </select>
        </div>

        {/* Live Pulse Indicator */}
        <div className="live-pulse-chip">
          <span className="pulse-dot" />
          <span>{t('systemActive')}</span>
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          className="theme-toggle-btn"
          title={`Switch to ${theme === 'dark' ? t('lightMode') : t('darkMode')}`}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? `☀️ ${t('lightMode')}` : `🌙 ${t('darkMode')}`}
        </button>

        {/* User Account / Profile Popover */}
        <div className="user-account-menu">
          <div
            className="user-avatar-initials"
            onClick={() => setShowProfile(!showProfile)}
            title="Click to view user profile details"
            style={{ cursor: 'pointer' }}
          >
            {role.slice(0, 2).toUpperCase()}
          </div>

          {showProfile && (
            <div className="user-profile-popover">
              <div className="popover-arrow" />
              
              {/* Profile Header */}
              <div className="user-profile-header">
                <div className="facility-avatar-box popover-avatar">
                  {role === 'hospital' ? '🏥' : role === 'donor' ? '🩸' : role === 'blood-bank' ? '🏦' : '⚙️'}
                </div>
                <div className="popover-user-meta">
                  <h3 className="popover-user-title">
                    {userName || (role === 'hospital' ? 'KMCH Emergency Hospital' : userEmail.split('@')[0])}
                  </h3>
                  <span className="popover-role-badge">
                    {t('role')}: {role.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Profile Details List */}
              <div className="user-profile-details">
                <div className="user-profile-row">
                  <span className="profile-row-label">📧 {t('email')}:</span>
                  <span className="profile-row-value email-value" title={userEmail}>
                    {userEmail}
                  </span>
                </div>

                <div className="user-profile-row">
                  <span className="profile-row-label">📞 {t('phone')}:</span>
                  <span className="profile-row-value" style={{ color: '#00d2ff', fontFamily: 'monospace' }}>
                    {localStorage.getItem('lifelink_phone') || '+91 98400 12345'}
                  </span>
                </div>

                <div className="user-profile-row">
                  <span className="profile-row-label">🩸 {t('bloodGroup')}:</span>
                  <span className="blood-tag" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    {localStorage.getItem('lifelink_blood_group') || 'O+'}
                  </span>
                </div>

                <div className="user-profile-row location-row-block">
                  <span className="profile-row-label">📍 {t('location')}:</span>
                  <div className="profile-location-group">
                    <strong className="city-name-text">
                      {userCity ? userCity.charAt(0).toUpperCase() + userCity.slice(1) : 'Coimbatore'}
                    </strong>
                    <span className="gps-pill-mini">
                      {userLat || '11.0168'}° N, {userLng || '76.9558'}° E
                    </span>
                  </div>
                </div>

                <div className="user-profile-row">
                  <span className="profile-row-label">⚡ {t('database')}:</span>
                  <span className="profile-db-badge">
                    <span className="live-dot-green" /> Neon PostgreSQL
                  </span>
                </div>

                <div className="user-profile-row">
                  <span className="profile-row-label">🛡️ {t('status')}:</span>
                  <span className="meta-chip meta-chip-green">
                    ✓ {t('verifiedActive')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="popover-actions-row">
                <button
                  type="button"
                  className="popover-close-btn"
                  onClick={() => setShowProfile(false)}
                >
                  {t('close')}
                </button>
                <button
                  type="button"
                  className="popover-logout-btn"
                  onClick={handleLogout}
                >
                  {t('signOut')} ➔
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="logout-ghost-btn"
            onClick={handleLogout}
            title={t('signOut')}
          >
            {t('signOut')}
          </button>
        </div>
      </div>
    </header>
  )
}
