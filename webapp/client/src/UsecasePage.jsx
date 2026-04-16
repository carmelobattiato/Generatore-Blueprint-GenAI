import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { LogOut, Upload, Loader2, CheckCircle, XCircle, FileText, BookOpen } from 'lucide-react'
import { useAuth } from './AuthContext'

const API_BASE = '/api'

export default function UsecasePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState([])
  const [savedId, setSavedId] = useState(null)
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
      } catch {
        setText(content)
      }
    } else {
      // txt, csv, yml — usa il contenuto grezzo
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
      // Avvia generazione blueprint passando il testo direttamente (nessun usecase persistente creato)
      const apiKey = localStorage.getItem('GEMINI_API_KEY') || ''
      const { data: job } = await axios.post(`${API_BASE}/run`, { text: text.trim(), apiKey })
      setProgress(p => [...p, `→ Generazione blueprint avviata…`])

      // 3. Segui progresso via SSE (rimane sulla pagina)
      // EventSource non invia cookie HTTP-only: otteniamo un token SSE short-lived dal server
      let sseToken = ''
      try {
        const { data: sseData } = await axios.get(`${API_BASE}/auth/sse-token`)
        sseToken = sseData.token
      } catch {}
      let lastSavedId = null
      const es = new EventSource(`${API_BASE}/run/stream/${job.jobId}?token=${encodeURIComponent(sseToken)}`)
      es.onmessage = (e) => {
        const ev = JSON.parse(e.data)
        if (ev.type === 'item_start') {
          setProgress(p => [...p, `→ Elaborazione: ${ev.title || text.split('\n')[0].slice(0, 80)}`])
        } else if (ev.type === 'item') {
          const dbId = ev.savedFile || null  // savedFile ora è l'ID numerico nel DB
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
          es.close()
          setSavedId(lastSavedId)
          setStatus('success')
          setMessage('Blueprint generata con successo!')
        } else if (ev.type === 'error') {
          es.close()
          setStatus('error')
          setMessage(ev.message || 'Errore durante la generazione')
        } else if (ev.type === 'cancelled') {
          es.close()
          setStatus('error')
          setMessage('Generazione annullata')
        }
      }
      es.onerror = () => {
        es.close()
        setStatus('error')
        setMessage('Connessione persa. La generazione potrebbe essere ancora in corso.')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.error || err.message)
    }
  }

  const reset = () => {
    setStatus('idle')
    setProgress([])
    setMessage('')
    setText('')
    setFileName('')
    setSavedId(null)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        overflowY: 'auto',
      }}
    >
      {/* Logout button */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {user && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            {user.username}
          </span>
        )}
        <button
          onClick={logout}
          title="Logout"
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--glass-border)',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            cursor: 'pointer',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #A100FF, #B847FF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Blueprint AI
      </h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: '2.5rem', fontSize: '1.1rem', textAlign: 'center' }}>
        Descrivi il tuo usecase e genera una blueprint automaticamente
      </p>

      {/* Main card */}
      <div
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '1rem',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '680px',
        }}
      >
        {fileName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '0.75rem',
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
            }}
          >
            <FileText size={14} />
            {fileName}
          </div>
        )}

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Descrivi il tuo usecase qui oppure carica un file…"
          disabled={status === 'loading'}
          style={{
            width: '100%',
            height: '200px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            color: 'var(--text-main)',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            fontFamily: 'inherit',
          }}
        />

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--glass-border)',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={() => fileRef.current?.click()}
            disabled={status === 'loading'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.9rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--glass-border)',
              background: 'transparent',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
          >
            <Upload size={15} />
            Carica file (txt, csv, json, yml)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,.json,.yml,.yaml"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          <button
            onClick={status === 'success' || status === 'error' ? reset : handleSubmit}
            disabled={status === 'loading' || (!text.trim() && status === 'idle')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1.2rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: status === 'error' ? '#dc2626' : '#A100FF',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: (status === 'loading' || (!text.trim() && status === 'idle')) ? 0.5 : 1,
              transition: 'opacity 0.2s, background 0.2s',
            }}
          >
            {status === 'loading' && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {status === 'success' ? 'Nuovo usecase' : status === 'error' ? 'Riprova' : 'Genera Blueprint'}
          </button>
        </div>
      </div>

      {/* Progress log */}
      {(progress.length > 0 || status === 'success' || status === 'error') && (
        <div
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            width: '100%',
            maxWidth: '680px',
            marginTop: '1rem',
          }}
        >
          {progress.map((line, i) => (
            <p key={i} style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: 'monospace', margin: '0.15rem 0' }}>
              {line}
            </p>
          ))}
          {status === 'success' && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontSize: '0.9rem' }}>
                <CheckCircle size={16} />{message}
              </div>
              {savedId && (
                <button
                  onClick={() => navigate(`/reader?id=${encodeURIComponent(savedId)}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#A100FF', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <BookOpen size={15} />Apri in Blueprint Reader
                </button>
              )}
            </div>
          )}
          {status === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              <XCircle size={16} />{message}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
