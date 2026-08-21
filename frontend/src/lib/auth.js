export const ROLE_PATHS = {
  donor: '/donor/dashboard',
  hospital: '/hospital/dashboard',
  'blood-bank': '/blood-bank/dashboard',
  admin: '/admin/dashboard',
}

export const ROLES = Object.keys(ROLE_PATHS)

export function getStoredRole() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('lifelink-role')
}

export function setStoredRole(role) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('lifelink-role', role)
}

export function clearStoredRole() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('lifelink-role')
}

export function getDashboardPathForRole(role) {
  return ROLE_PATHS[role] || '/login'
}
