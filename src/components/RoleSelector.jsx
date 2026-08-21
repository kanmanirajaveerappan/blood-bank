import { useNavigate } from 'react-router-dom'
import { getDashboardPathForRole, setStoredRole } from '../lib/auth'

export default function RoleSelector() {
  const navigate = useNavigate()

  const handleSelect = (role) => {
    setStoredRole(role)
    navigate(getDashboardPathForRole(role))
  }

  return (
    <div className="role-picker">
      <button type="button" className="role-button active" onClick={() => handleSelect('donor')}>
        Donor
      </button>
      <button type="button" className="role-button" onClick={() => handleSelect('hospital')}>
        Hospital
      </button>
      <button type="button" className="role-button" onClick={() => handleSelect('blood-bank')}>
        Blood Bank
      </button>
      <button type="button" className="role-button" onClick={() => handleSelect('admin')}>
        Admin
      </button>
    </div>
  )
}
