import { useState } from 'react'
import { forgotPassword, resetPassword } from '../services/api'
import { setStoredRole, getDashboardPathForRole } from '../lib/auth'
import socket from '../services/socketIoClient'

export default function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail)
  const [step, setStep] = useState(1) // 1 = Request Code, 2 = Enter New Password
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your registered email address.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await forgotPassword(email)
      setMessage(res.message || 'Verification code sent to your email.')
      if (res.demo_otp) {
        setOtp(res.demo_otp)
      }
      setStep(2)
    } catch (err) {
      setError(err.message || 'Failed to request reset code. Please check your email address.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await resetPassword(email, newPassword, otp)
      setMessage(res.message || 'Password reset successfully!')
      
      const token = res.access_token
      const userRole = res.user?.role || 'hospital'

      if (token) {
        localStorage.setItem('lifelink_token', token)
        try {
          const jwtPayload = JSON.parse(atob(token.split('.')[1]))
          const userId = jwtPayload.user_id
          if (userId) socket.emit('join_user', { user_id: userId })
        } catch (tokErr) {
          console.warn('Could not parse token payload', tokErr)
        }
      }

      localStorage.setItem('lifelink_email', email)
      setStoredRole(userRole)

      setTimeout(() => {
        onClose()
        window.location.href = getDashboardPathForRole(userRole)
      }, 1200)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-reset-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>🔐</span>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Reset Password</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                {step === 1 ? 'Verify your registered account' : 'Enter your new security credentials'}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="auth-error-banner" style={{ margin: '12px 0' }}>{error}</div>}
        {message && <div className="auth-success-banner" style={{ margin: '12px 0' }}>{message}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              Registered Email Address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. kmch@gmail.com or hospital@redradius.ai"
                className="modal-input"
                required
                autoFocus
              />
            </label>

            <button
              type="submit"
              className="primary-button wide-button"
              disabled={loading}
              style={{ marginTop: 6 }}
            >
              {loading ? 'Sending Code...' : 'Send Verification Code ➔'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              Security OTP Code
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                className="modal-input"
                required
              />
            </label>

            <label>
              New Password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="modal-input"
                required
                autoFocus
              />
            </label>

            <label>
              Confirm New Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="modal-input"
                required
              />
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="logout-ghost-btn"
                style={{ flex: 1 }}
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="primary-button"
                style={{ flex: 2 }}
                disabled={loading}
              >
                {loading ? 'Saving in DB...' : 'Update & Log In ➔'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
