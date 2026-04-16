import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Zap, Loader2, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already logged in — redirect
  if (user) {
    if (user.role === 'admin') navigate('/dashboard', { replace: true })
    else navigate('/newusecase', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const loggedUser = await login(username, password)
      if (loggedUser.role === 'admin') navigate('/', { replace: true })
      else navigate('/newusecase', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Credenziali non valide')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <div style={{
          width: '3rem', height: '3rem',
          background: '#A100FF',
          borderRadius: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={24} color="#fff" />
        </div>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>BlueprintAI</h1>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Intelligence Layer v3</p>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', marginTop: 0 }}>Accesso</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '2rem', marginTop: 0 }}>
          Inserisci le tue credenziali per continuare
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.7rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--glass-border)',
                background: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#A100FF'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.7rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--glass-border)',
                background: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#A100FF'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; }}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              color: '#f87171',
              fontSize: '0.85rem',
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.8rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: '#A100FF',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'opacity 0.2s',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-dim)', opacity: 0.5 }}>
        © 2026 Developed by Carmelo Battiato
      </p>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
