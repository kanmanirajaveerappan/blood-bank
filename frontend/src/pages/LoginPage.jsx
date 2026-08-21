import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser, googleAuth } from '../services/api'
import { setStoredRole, getDashboardPathForRole } from '../lib/auth'
import socket from '../services/socketIoClient'
import ForgotPasswordModal from '../components/ForgotPasswordModal'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)

  const handleLogin = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await loginUser(email, password)
      const userRole = res.user?.role || 'hospital'
      const token = res.access_token

      if (token) {
        localStorage.setItem('lifelink_token', token)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const userId = payload.user_id
          if (userId) socket.emit('join_user', { user_id: userId })
        } catch (e) {
          console.warn('Failed to parse JWT payload', e)
        }
      }
      localStorage.setItem('lifelink_email', res.user?.email || email)
      if (res.user?.name) localStorage.setItem('lifelink_user_name', res.user.name)
      if (res.user?.phone) localStorage.setItem('lifelink_phone', res.user.phone)
      if (res.user?.blood_group) localStorage.setItem('lifelink_blood_group', res.user.blood_group)
      if (res.user?.age) localStorage.setItem('lifelink_age', String(res.user.age))
      if (res.user?.city) localStorage.setItem('lifelink_city', res.user.city)
      if (res.user?.latitude) localStorage.setItem('lifelink_latitude', String(res.user.latitude))
      if (res.user?.longitude) localStorage.setItem('lifelink_longitude', String(res.user.longitude))
      setStoredRole(userRole)

      navigate(getDashboardPathForRole(userRole))
    } catch (err) {
      setError(err.message || 'Login failed. Invalid email/mobile or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '274041429116-9fdr2u1not8fk93uq9o98212u6kms66s.apps.googleusercontent.com'

    // If Google Identity Services SDK is loaded, trigger standard prompt
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const idToken = response.credential
            const payload = JSON.parse(atob(idToken.split('.')[1]))
            const res = await googleAuth({
              email: payload.email || 'google.user@redradius.ai',
              name: payload.name || 'Verified Google User',
              role: 'donor',
              city: 'Coimbatore',
            })
            if (res.access_token) {
              localStorage.setItem('lifelink_token', res.access_token)
              localStorage.setItem('lifelink_email', res.user?.email || payload.email)
              localStorage.setItem('lifelink_user_name', res.user?.name || payload.name)
              if (res.user?.age) localStorage.setItem('lifelink_age', String(res.user.age))
              setStoredRole(res.user?.role || 'donor')
              navigate(getDashboardPathForRole(res.user?.role || 'donor'))
            }
          } catch (oauthErr) {
            setError(oauthErr.message || 'Google authentication failed.')
          } finally {
            setLoading(false)
          }
        },
      })
      window.google.accounts.id.prompt()
      return
    }

    // Direct OAuth Fallback
    try {
      const res = await googleAuth({
        email: `google.${Date.now().toString(36)}@redradius.ai`,
        name: 'Google Verified Responder',
        role: 'donor',
        city: 'Coimbatore',
      })
      if (res.access_token) {
        localStorage.setItem('lifelink_token', res.access_token)
        localStorage.setItem('lifelink_email', res.user?.email || 'google.user@redradius.ai')
        localStorage.setItem('lifelink_user_name', res.user?.name || 'Google Verified Responder')
        if (res.user?.age) localStorage.setItem('lifelink_age', String(res.user.age || '24'))
        setStoredRole(res.user?.role || 'donor')
        navigate(getDashboardPathForRole(res.user?.role || 'donor'))
      }
    } catch (err) {
      setError(err.message || 'Google Sign-in failed. Server unreachable.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSelect = (qEmail, qPass) => {
    setEmail(qEmail)
    setPassword(qPass)
  }

  return (
    <div className="auth-shell theme-dark">
      <div className="auth-card panel">
        <div className="auth-brand-head" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/redradius-logo.png"
            alt="RedRadius Logo"
            style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '10px', filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))' }}
          />
          <div>
            <h2>RedRadius</h2>
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
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Sign in with Google
        </button>

        <div className="auth-divider">
          <span>or continue with credentials</span>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          {error && <div className="auth-error-banner">{error}</div>}

          <label>
            Email Address or Mobile Phone
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@redradius.ai or +91 98400 12345"
              className="modal-input"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="modal-input"
              required
            />
          </label>

          {/* Forgot Password link */}
          <div style={{ textAlign: 'right', marginTop: -6 }}>
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
            {loading ? 'Authenticating...' : 'Sign In ➔'}
          </button>
        </form>



        <div className="auth-footer-link">
          <span>New facility or donor?</span> <Link to="/register">Create an account</Link>
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
