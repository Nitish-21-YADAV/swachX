import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

import Landing        from './pages/Landing'
import LoginPage      from './pages/Login'
import RegisterPage   from './pages/Register'
import UserDashboard  from './pages/UserDashboard'
import NewComplaint   from './pages/NewComplaint'
import AdminDashboard from './pages/AdminDashboard'
import StaffDashboard from './pages/StaffDashboard'
import ReportsPage    from './pages/Reports'

function Guard({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{background:'var(--bg-base)'}}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
             style={{borderColor:'var(--border)',borderTopColor:'var(--acid)'}} />
        <p style={{color:'var(--text-2)',fontFamily:'Syne,sans-serif',fontSize:'13px'}}>Loading…</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    const dest = user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff' : '/dashboard'
    return <Navigate to={dest} replace />
  }
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={user ? <Navigate to={user.role==='admin'?'/admin':user.role==='staff'?'/staff':'/dashboard'} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />

      <Route path="/dashboard"   element={<Guard roles={['user']}><UserDashboard /></Guard>} />
      <Route path="/new-complaint" element={<Guard roles={['user']}><NewComplaint /></Guard>} />

      <Route path="/admin"   element={<Guard roles={['admin']}><AdminDashboard /></Guard>} />
      <Route path="/reports" element={<Guard roles={['admin']}><ReportsPage /></Guard>} />

      <Route path="/staff"   element={<Guard roles={['staff']}><StaffDashboard /></Guard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{
        style: { background:'#0B1A0B', color:'#E8F5E2', border:'1px solid rgba(200,241,53,0.2)', fontFamily:'Inter,sans-serif', fontSize:'14px' },
        success: { iconTheme: { primary:'#C8F135', secondary:'#050D05' } },
        error:   { iconTheme: { primary:'#F87171', secondary:'#050D05' } }
      }} />
    </AuthProvider>
  )
}
