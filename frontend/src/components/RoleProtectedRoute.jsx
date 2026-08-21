import { Link } from 'react-router-dom'
import { getStoredRole, getDashboardPathForRole } from '../lib/auth'
import Navbar from './Navbar'
import { ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react'

export default function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const currentRole = getStoredRole() || 'donor'

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
    return (
      <div className="lifelink-app-shell theme-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar theme="dark" setTheme={() => {}} />
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '24px' }}>
          <div className="panel" style={{ maxWidth: '520px', width: '100%', textAlign: 'center', padding: '36px 24px', border: '1.5px solid rgba(239, 68, 68, 0.4)', background: 'rgba(11, 21, 40, 0.95)', borderRadius: '16px', boxShadow: '0 12px 36px rgba(0, 0, 0, 0.8)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'grid', placeItems: 'center', margin: '0 auto 16px auto', color: '#ef4444' }}>
              <ShieldAlert size={32} />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '8px' }}>Access Restricted</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '20px' }}>
              This section is reserved for <strong>{allowedRoles.join(' / ').toUpperCase()}</strong> personnel. Your current logged-in account role is <strong style={{ color: '#00d2ff' }}>{currentRole.toUpperCase()}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to={getDashboardPathForRole(currentRole)} className="primary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Go to My {currentRole === 'donor' ? 'Donor Hub' : 'Portal'} <ArrowRight size={16} />
              </Link>
              <Link to="/" className="ghost-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeft size={16} /> Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return children
}
