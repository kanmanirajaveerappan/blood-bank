import { Link, Outlet } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/donor/dashboard' },
  { label: 'Availability', path: '/donor/availability' },
  { label: 'Location', path: '/donor/location' },
  { label: 'Notifications', path: '/donor/notifications' },
]

export default function RolePortalLayout() {
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <img src="/redradius-logo.png" alt="RedRadius Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <h2 style={{ margin: 0 }}>RedRadius</h2>
        </div>
        <nav className="portal-nav">
          {navItems.map((item) => (
            <Link key={item.label} to={item.path} className="portal-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="portal-content">
        <Outlet />
      </main>
    </div>
  )
}
