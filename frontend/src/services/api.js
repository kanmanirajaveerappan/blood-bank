// Automatic API base URL resolution:
// Connects to Flask backend on port 8000 whether on localhost or LAN IP (e.g. 192.168.x.x)
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  if (typeof window === 'undefined') return 'http://localhost:8000/api/v1'
  const hostname = window.location.hostname || 'localhost'
  return `http://${hostname}:8000/api/v1`
}
export const API_BASE_URL = getApiBaseUrl()


async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('lifelink_token') : null
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Invalid server response from ${endpoint}: ${text.slice(0, 80)}`)
    }

    if (!response.ok || data.success === false) {
      const errorMsg = data.detail || data.error || `Request failed with status ${response.status}`
      throw new Error(errorMsg)
    }

    return data
  } catch (err) {
    console.warn(`API call to ${endpoint} failed:`, err.message)
    throw err
  }
}

// 1. Auth APIs
export async function loginUser(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function registerUser(payload) {
  // Support either payload object or legacy (email, password, role) arguments
  const body = typeof payload === 'object' && payload !== null && payload.email
    ? payload
    : { email: arguments[0], password: arguments[1], role: arguments[2] }

  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function googleAuth(payload) {
  return request('/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(email, new_password, otp) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, new_password, otp }),
  })
}



// 2. Matching & AI APIs
export async function requestDonorMatch(payload) {
  return request('/matching/rank', {
    method: 'POST',
    body: JSON.stringify({
      bloodGroup: payload.bloodGroup || payload.blood_group,
      latitude: payload.latitude,
      longitude: payload.longitude,
      k: payload.k || 5,
      maxDistanceKm: payload.maxDistanceKm || payload.max_distance_km || 25,
    }),
  })
}

export async function triggerAgentCoordination(payload) {
  return request('/matching/agent-coordinate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchCompatibilityMatrix() {
  return request('/matching/compatibility-matrix')
}

export async function compareAlgorithms(payload) {
  return request('/matching/compare-algorithms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// 3. Donor APIs
export async function fetchDonors(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/donors${query ? `?${query}` : ''}`)
}

export async function updateDonorAvailability(donorId, availability, status) {
  return request(`/donors/${donorId}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ availability, status }),
  })
}

export async function updateDonorLocation(donorId, latitude, longitude, city) {
  return request(`/donors/${donorId}/location`, {
    method: 'PATCH',
    body: JSON.stringify({ latitude, longitude, city }),
  })
}

export async function fetchDonorAlerts(donorId = 'D001') {
  return request(`/donors/${donorId}/alerts`)
}

export async function fetchDonorHistory(donorId = 'D001') {
  return request(`/donors/${donorId}/history`)
}

export async function respondToDonorAlert(donorId, alertId, response) {
  return request(`/donors/${donorId}/respond-alert`, {
    method: 'POST',
    body: JSON.stringify({ alert_id: alertId, response }),
  })
}

// 4. Hospital APIs
export async function searchHospitalLocations(query = '') {
  return request(`/hospitals/search-locations?q=${encodeURIComponent(query)}`)
}

export async function fetchHospitalRequests() {
  return request('/hospitals/requests')
}

export async function createEmergencyRequest(payload) {
  return request('/hospitals/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEmergencyRequestStatus(requestId, status) {
  return request(`/hospitals/requests/${requestId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

// 5. Blood Bank APIs
export async function fetchBloodInventory() {
  return request('/blood-banks/inventory')
}

export async function updateInventoryUnits(bloodGroup, units, delta = 0) {
  return request('/blood-banks/inventory/update', {
    method: 'POST',
    body: JSON.stringify({ blood_group: bloodGroup, units, delta }),
  })
}

export async function fetchBloodDispatches() {
  return request('/blood-banks/dispatches')
}

// 6. Admin & Analytics APIs
export async function fetchAdminStats() {
  return request('/admin/stats')
}

export async function fetchAiMonitorData() {
  return request('/admin/ai-monitor')
}

export async function fetchAuditLogs() {
  return request('/admin/audit-logs')
}

export async function validateExcelImport(formDataOrMock) {
  if (formDataOrMock instanceof FormData) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lifelink_token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch(`${API_BASE_URL}/admin/excel-import/validate`, {
      method: 'POST',
      headers,
      body: formDataOrMock,
    })
    return res.json()
  } else {
    return request('/admin/excel-import/validate', {
      method: 'POST',
      body: JSON.stringify(formDataOrMock || {}),
    })
  }
}

export async function confirmExcelImport(validRecordsOrCount) {
  const payload = Array.isArray(validRecordsOrCount)
    ? { valid_records: validRecordsOrCount, valid_count: validRecordsOrCount.length }
    : { valid_count: validRecordsOrCount }
  return request('/admin/excel-import/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchAnalyticsOverview() {
  return request('/analytics/overview')
}
