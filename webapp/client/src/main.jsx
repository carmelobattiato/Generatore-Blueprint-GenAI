import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom'
import App from './App.jsx'
import UsecasePage from './UsecasePage.jsx'
import LoginPage from './LoginPage.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#f87171', fontFamily: 'monospace', background: '#020617', minHeight: '100vh' }}>
          <h2 style={{ color: '#f87171' }}>Errore di rendering</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{String(this.state.error)}</pre>
          <button onClick={() => window.location.href = '/login'} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#A100FF', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Torna al login</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Spinner shown during auth loading
function AuthSpinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
      <div style={{ width: '2rem', height: '2rem', border: '3px solid rgba(161,0,255,0.2)', borderTopColor: '#A100FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Protected route: requires authentication. If user role not in allowed roles, redirect to /newusecase.
function ProtectedRoute({ element, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSpinner />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/newusecase" replace />
  }

  return element
}

// Admin-only route wrapper
function AdminRoute({ element }) {
  return <ProtectedRoute element={element} roles={['admin']} />
}

// Root redirect: non loggato → /login, admin → /dashboard, user → /newusecase
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <AuthSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/dashboard" replace />
  return <Navigate to="/newusecase" replace />
}

const router = createBrowserRouter([
  // Root smart redirect
  { path: '/', element: <RootRedirect /> },

  // Public
  { path: '/login', element: <LoginPage /> },

  // Redirect legacy URLs
  { path: '/Usecase', element: <Navigate to="/newusecase" replace /> },

  // User pages (no auth wrapper — ProtectedRoute causa blank page, da investigare)
  { path: '/newusecase', element: <ErrorBoundary><UsecasePage /></ErrorBoundary> },
  { path: '/usecase',    element: <ErrorBoundary><UsecasePage /></ErrorBoundary> }, // kept for verification
  { path: '/usecase2',   element: <ErrorBoundary><UsecasePage /></ErrorBoundary> }, // kept for verification
  { path: '/reader',  element: <ProtectedRoute element={<App standalone />} roles={['admin', 'user']} /> },

  // Admin-only pages
  { path: '/settings', element: <AdminRoute element={<App standalone />} /> },
  { path: '/editor',   element: <AdminRoute element={<App standalone />} /> },
  { path: '/dashboard', element: <AdminRoute element={<App />} /> },
  { path: '/*',         element: <AdminRoute element={<App />} /> },
])

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
)
