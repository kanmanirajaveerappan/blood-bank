import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import PublicHome from './pages/PublicHome'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DonorDashboardPage from './pages/DonorDashboardPage'
import HospitalDashboardPage from './pages/HospitalDashboardPage'
import BloodBankDashboardPage from './pages/BloodBankDashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import NavigationPage from './pages/NavigationPage'
import LiveTrackingPage from './pages/LiveTrackingPage'
import DonorMapPage from './pages/DonorMapPage'
import RoleProtectedRoute from './components/RoleProtectedRoute'

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/ai-matching" element={<App />} />
        <Route path="/matching" element={<App />} />

        {/* Donor Portal Routes (Accessible by Donor & Admin) */}
        <Route
          path="/donor/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['donor', 'admin']}>
              <DonorDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/donor/availability"
          element={
            <RoleProtectedRoute allowedRoles={['donor', 'admin']}>
              <DonorDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/donor/location"
          element={
            <RoleProtectedRoute allowedRoles={['donor', 'admin']}>
              <DonorDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/donor/notifications"
          element={
            <RoleProtectedRoute allowedRoles={['donor', 'admin']}>
              <DonorDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/donor/history"
          element={
            <RoleProtectedRoute allowedRoles={['donor', 'admin']}>
              <DonorDashboardPage />
            </RoleProtectedRoute>
          }
        />

        {/* Hospital Portal Routes (Accessible by Hospital & Admin) */}
        <Route
          path="/hospital/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['hospital', 'admin']}>
              <HospitalDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/hospital/emergency-requests"
          element={
            <RoleProtectedRoute allowedRoles={['hospital', 'admin']}>
              <HospitalDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/hospital/matching"
          element={
            <RoleProtectedRoute allowedRoles={['hospital', 'admin']}>
              <HospitalDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/hospital/matching/:requestId/map"
          element={
            <RoleProtectedRoute allowedRoles={['hospital', 'admin']}>
              <DonorMapPage />
            </RoleProtectedRoute>
          }
        />

        {/* Blood Bank Portal Routes (Accessible by Blood Bank & Admin) */}
        <Route
          path="/blood-bank/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['blood-bank', 'blood_bank', 'admin']}>
              <BloodBankDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/blood-bank/inventory"
          element={
            <RoleProtectedRoute allowedRoles={['blood-bank', 'blood_bank', 'admin']}>
              <BloodBankDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/blood-bank/requests"
          element={
            <RoleProtectedRoute allowedRoles={['blood-bank', 'blood_bank', 'admin']}>
              <BloodBankDashboardPage />
            </RoleProtectedRoute>
          }
        />

        {/* Admin Portal Routes (Accessible ONLY by Admin) */}
        <Route
          path="/admin/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/ai-monitor"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/excel-import"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage />
            </RoleProtectedRoute>
          }
        />

        {/* Map & Emergency Navigation Routes (Accessible to Donors and Responders) */}
        <Route path="/navigation" element={<NavigationPage />} />
        <Route path="/navigation/:requestId" element={<NavigationPage />} />
        <Route path="/live-tracking/:requestId" element={<LiveTrackingPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
