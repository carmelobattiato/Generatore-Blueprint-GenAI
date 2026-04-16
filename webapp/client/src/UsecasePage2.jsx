import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { LogOut, Upload, Loader2, CheckCircle, XCircle, FileText, BookOpen } from 'lucide-react'
import { useAuth } from './AuthContext'
import { C, GRID_BG, BG_ICONS, BADGES } from './blueprintTheme'

const API_BASE = '/api'

export default function UsecasePage2() {
  const navigate  = useNavigate()
  const { user, logout } = useAuth()
  const [text,     setText]     = useState('')
  const [fileName, setFileName] = useState('')
  const [status,   setStatus]   = useState('idle')
  const [message,  setMessage]  = useState('')
  const [progress, setProgress] = useState([])
  const [savedId,  setSavedId]  = useState(null)
  const fileRef = useRef()

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const content = await file.text()
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'json') {
      try {
        const obj = JSON.parse(content)
        setText(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2))
      } catch { setText(content) }
    } else {
      setText(content)
    }
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    setStatus('loading')
    setProgress([])
    setMessage('')
    try {
      const apiKey = localStorage.getItem('GEMINI_API_KEY') || ''
      const { data: job } = await axios.post(`${API_BASE}/run`, { text: text.trim(), apiKey })
      setProgress(p => [...p, `→ Generazione blueprint avviata…`])

      let sseToken = ''
      try { const { data: d } = await axios.get(`${API_BASE}/auth/sse-token`); sseToken = d.token } catch {}

      let lastSavedId = null
      const es = new EventSource(`${API_BASE}/run/stream/${job.jobId}?token=${encodeURIComponent(sseToken)}`)
      es.onmessage = (e) => {
        const ev = JSON.parse(e.data)
        if (ev.type === 'item_start') {
          setProgress(p => [...p, `→ Elaborazione: ${ev.title || text.split('\n')[0].slice(0, 80)}`])
        } else if (ev.type === 'item') {
          const dbId = ev.savedFile || null
          if (dbId) lastSavedId = dbId
          if (ev.isErr) {
            const reason = ev.timedOut ? 'timeout' : ev.spawnError ? `spawn error: ${ev.spawnError}` : `exit code ${ev.exitCode}`
            setProgress(p => [...p, `✗ Generazione fallita (${reason})`])
            if (ev.stderr?.trim()) setProgress(p => [...p, `  ${ev.stderr.trim().slice(0, 300)}`])
          } else if (dbId) {
            setProgress(p => [...p, `✓ Blueprint salvata nel DB (ID: ${dbId})`])
          } else {
            setProgress(p => [...p, `✗ Output vuoto — nessun record salvato`])
          }
        } else if (ev.type === 'done') {
          es.close(); setSavedId(lastSavedId); setStatus('success'); setMessage('Blueprint generata con successo!')
        } else if (ev.type === 'error') {
          es.close(); setStatus('error'); setMessage(ev.message || 'Errore durante la generazione')
        } else if (ev.type === 'cancelled') {
          es.close(); setStatus('error'); setMessage('Generazione annullata')
        }
      }
      es.onerror = () => { es.close(); setStatus('error'); setMessage('Connessione persa.') }
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.error || err.message)
    }
  }

  const reset = () => { setStatus('idle'); setProgress([]); setMessage(''); setText(''); setFileName(''); setSavedId(null) }

  return (
    <div style={{ ...GRID_BG, minHeight: '100vh', position: 'relative', overflowX: 'hidden', overflowY: 'auto' }}>

      {/* ── floating background icons ── */}
      {BG_ICONS.map(({ Ic, size, opacity, style }, i) => (
        <div key={i} aria-hidden="true"
          style={{ position: 'absolute', ...style, color: C.accent, opacity, pointerEvents: 'none', zIndex: 0 }}>
          <Ic size={size} />
        </div>
      ))}

      {/* ── interactive content ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>

        {/* top-right user / logout */}
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {user && <span style={{ fontSize: '0.75rem', color: C.textDim, fontWeight: 600 }}>{user.username}</span>}
          <button
            onClick={logout} title="Logout"
            style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: `1px solid ${C.cardBorder}`, background: C.cardBg, backdropFilter: 'blur(12px)', cursor: 'pointer', color: C.textDim, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, boxShadow: C.cardShadow, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>

        {/* title */}
        <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.4rem', background: 'linear-gradient(135deg, #5b21b6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.1 }}>
          Blueprint AI
        </h1>
        <p style={{ color: C.textMuted, marginBottom: '1.2rem', fontSize: '1rem', textAlign: 'center', letterSpacing: '0.01em' }}>
          Descrivi il tuo usecase e genera una blueprint automaticamente
        </p>

        {/* tech badge strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
          {BADGES.map(({ Ic, label }) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '99px', border: `1px solid ${C.cardBorder}`, background: C.cardBg, backdropFilter: 'blur(8px)', color: C.textDim, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.02em', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
              <Ic size={15} color={C.accent} />
              {label}
            </span>
          ))}
        </div>

        {/* main card */}
        <div style={{ background: C.cardBg, backdropFilter: 'blur(16px)', border: `1px solid ${C.cardBorder}`, borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '680px', boxShadow: C.cardShadow }}>
          {fileName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: C.textDim }}>
              <FileText size={14} />{fileName}
            </div>
          )}
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Descrivi il tuo usecase qui oppure carica un file…"
            disabled={status === 'loading'}
            style={{ width: '100%', height: '200px', background: C.inputBg, border: 'none', outline: 'none', resize: 'vertical', color: C.textMain, fontSize: '0.95rem', lineHeight: '1.6', fontFamily: 'inherit', borderRadius: '0.5rem', padding: '0.25rem 0' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${C.divider}`, gap: '0.75rem' }}>
            <button
              onClick={() => fileRef.current?.click()} disabled={status === 'loading'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: '0.5rem', border: `1px solid ${C.cardBorder}`, background: 'transparent', color: C.textDim, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.accentLight}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Upload size={15} /> Carica file (txt, csv, json, yml)
            </button>
            <input ref={fileRef} type="file" accept=".txt,.csv,.json,.yml,.yaml" onChange={handleFileUpload} style={{ display: 'none' }} />

            <button
              onClick={status === 'success' || status === 'error' ? reset : handleSubmit}
              disabled={status === 'loading' || (!text.trim() && status === 'idle')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1.2rem', borderRadius: '0.5rem', border: 'none', background: status === 'error' ? C.danger : C.accent, color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: (status === 'loading' || (!text.trim() && status === 'idle')) ? 0.45 : 1, transition: 'opacity 0.2s, background 0.2s', letterSpacing: '0.01em' }}
              onMouseEnter={e => { if (status !== 'loading') e.currentTarget.style.background = status === 'error' ? '#b91c1c' : C.accentHover }}
              onMouseLeave={e => e.currentTarget.style.background = status === 'error' ? C.danger : C.accent}
            >
              {status === 'loading' && <Loader2 size={15} style={{ animation: 'bp2spin 1s linear infinite' }} />}
              {status === 'success' ? 'Nuovo usecase' : status === 'error' ? 'Riprova' : 'Genera Blueprint'}
            </button>
          </div>
        </div>

        {/* progress log */}
        {(progress.length > 0 || status === 'success' || status === 'error') && (
          <div style={{ background: C.logBg, backdropFilter: 'blur(12px)', border: `1px solid ${C.logBorder}`, borderRadius: '0.75rem', padding: '1rem 1.25rem', width: '100%', maxWidth: '680px', marginTop: '1rem', boxShadow: '0 2px 12px rgba(109,40,217,0.07)' }}>
            {progress.map((line, i) => (
              <p key={i} style={{ fontSize: '0.82rem', color: C.textDim, fontFamily: 'monospace', margin: '0.15rem 0' }}>{line}</p>
            ))}
            {status === 'success' && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: C.success, fontSize: '0.9rem' }}>
                  <CheckCircle size={16} />{message}
                </div>
                {savedId && (
                  <button
                    onClick={() => navigate(`/reader?id=${encodeURIComponent(savedId)}`)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: C.accent, color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.accentHover}
                    onMouseLeave={e => e.currentTarget.style.background = C.accent}
                  >
                    <BookOpen size={15} /> Apri in Blueprint Reader
                  </button>
                )}
              </div>
            )}
            {status === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: C.danger, marginTop: '0.5rem', fontSize: '0.9rem' }}>
                <XCircle size={16} />{message}
              </div>
            )}
          </div>
        )}

        {/* corner watermark */}
        <div aria-hidden="true" style={{ position: 'fixed', bottom: '1.5rem', left: '2rem', fontSize: '0.68rem', color: C.textMuted, fontFamily: 'monospace', letterSpacing: '0.08em', opacity: 0.55, pointerEvents: 'none', userSelect: 'none' }}>
          BLUEPRINT AI · v2.1
        </div>

      </div>

      <style>{`@keyframes bp2spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
