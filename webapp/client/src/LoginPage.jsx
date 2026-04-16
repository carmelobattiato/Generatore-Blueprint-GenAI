import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Zap, Loader2, AlertTriangle } from 'lucide-react'
import { C, GRID_BG, BG_ICONS } from './blueprintTheme'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

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
    <div style={{ ...GRID_BG, minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>

      {/* ── floating background icons ── */}
      {BG_ICONS.map(({ Ic, size, opacity, style }, i) => (
        <div key={i} aria-hidden="true"
          style={{ position: 'absolute', ...style, color: C.accent, opacity, pointerEvents: 'none', zIndex: 0 }}>
          <Ic size={size} />
        </div>
      ))}

      {/* ── centered content ── */}
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

        {/* logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ width: '3rem', height: '3rem', background: C.accent, borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${C.accentLight}` }}>
            <Zap size={24} color="#fff" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: C.textMain }}>BlueprintAI</h1>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Intelligence Layer v3</p>
          </div>
        </div>

        {/* card */}
        <div style={{ background: C.cardBg, backdropFilter: 'blur(20px)', border: `1px solid ${C.cardBorder}`, borderRadius: '1.5rem', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: C.cardShadow }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', marginTop: 0, color: C.textMain }}>Accesso</h2>
          <p style={{ fontSize: '0.85rem', color: C.textDim, marginBottom: '2rem', marginTop: 0 }}>
            Inserisci le tue credenziali per continuare
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.textDim, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Username
              </label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                autoComplete="username" required disabled={loading}
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 1rem', borderRadius: '0.75rem', border: `1px solid ${C.cardBorder}`, background: C.inputBg, color: C.textMain, fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                onFocus={e  => { e.target.style.borderColor = C.accent }}
                onBlur={e   => { e.target.style.borderColor = C.cardBorder }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.textDim, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password" required disabled={loading}
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 1rem', borderRadius: '0.75rem', border: `1px solid ${C.cardBorder}`, background: C.inputBg, color: C.textMain, fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                onFocus={e  => { e.target.style.borderColor = C.accent }}
                onBlur={e   => { e.target.style.borderColor = C.cardBorder }}
              />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: C.danger, fontSize: '0.85rem' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{ marginTop: '0.5rem', padding: '0.8rem 1.5rem', borderRadius: '0.75rem', border: 'none', background: C.accent, color: '#fff', fontSize: '0.9rem', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'opacity 0.2s, background 0.2s', letterSpacing: '0.04em', textTransform: 'uppercase' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.accentHover }}
              onMouseLeave={e => { e.currentTarget.style.background = C.accent }}
            >
              {loading && <Loader2 size={16} style={{ animation: 'lp_spin 1s linear infinite' }} />}
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: C.textMuted, opacity: 0.6 }}>
          © 2026 Developed by Carmelo Battiato
        </p>

      </div>

      <style>{`@keyframes lp_spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
