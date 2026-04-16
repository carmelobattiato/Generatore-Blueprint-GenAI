import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- Styles ---
import 'katex/dist/katex.min.css';
import 'leaflet/dist/leaflet.css';

import { 
  LayoutDashboard, FileCode, Play, Plus, Trash2, 
  Edit, Check, X, Search, Activity, Loader2, 
  ChevronRight, Save, Database,
  CheckCircle, AlertTriangle, Command, Sparkles,
  Zap, Globe, Settings, Lock, Terminal,
  Download, History, Trash, Star, MoreVertical,
  Edit2, BookOpen, Printer, Maximize2, Minimize2,
  ChevronLeft, FileText, Info, Lightbulb, AlertOctagon, MapPin, LogOut
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Markdown Engine Imports ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkFrontmatter from 'remark-frontmatter';
import remarkWikiLink from 'remark-wiki-link';
import remarkToc from 'remark-toc';
import remarkDeflist from 'remark-deflist';
import jsYaml from 'js-yaml';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import mermaid from 'mermaid';
import html2pdf from 'html2pdf.js';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const API_BASE = '/api';

// EventSource non invia cookie HTTP-only → otteniamo un token SSE short-lived dal server
async function getSseUrl(path) {
  try {
    const { data } = await axios.get(`${API_BASE}/auth/sse-token`);
    return `${API_BASE}${path}?token=${encodeURIComponent(data.token)}`;
  } catch {
    return `${API_BASE}${path}`;
  }
}

// --- ADVANCED COMPONENTS (from Pro Reader) ---

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'math', 'annotation', 'semantics', 'mrow', 'msub', 'msup', 'mover', 'munder', 'mfrac', 'msqrt', 'mroot', 'mi', 'mn', 'mo', 'mtext', 'mspace', 'mstyle', 'merror', 'mpadded', 'mphantom', 'ms', 'msubsup', 'mtable', 'mtd', 'mtr', 'munderover', 'annotation-xml',
    'details', 'summary', 'dl', 'dt', 'dd'
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'style', 'id', 'role'],
    'annotation': ['encoding'],
    'details': ['open']
  }
};

const Mermaid = ({ chart }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
    });
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid error:', err);
        setError('Errore nel rendering del diagramma Mermaid');
      }
    };
    renderChart();
  }, [chart]);

  if (error) return <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-mono">{error}</div>;

  return (
    <div 
      className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl border border-slate-200 mermaid-diagram"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

const GeoMap = ({ data }) => {
  const parsed = useMemo(() => { try { return typeof data === 'string' ? JSON.parse(data) : data; } catch (e) { return null; } }, [data]);
  if (!parsed) return null;
  return (
    <div className="h-[300px] w-full my-6 rounded-xl overflow-hidden border border-white/10 z-0">
      <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <GeoJSON data={parsed} />
      </MapContainer>
    </div>
  );
};

// --- UI COMPONENTS ---

const Toast = ({ message, type = 'success', onClose }) => (
  <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 24, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
    <div className={cn("glass p-4 rounded-2xl flex items-center gap-4 border-l-4 shadow-2xl", type === 'success' ? "border-green-500" : "border-red-500")}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", type === 'success' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
        {type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
      </div>
      <div className="flex-1 text-left">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">System Notification</p>
        <p className="text-sm font-bold text-current text-left">{message}</p>
      </div>
      <button onClick={onClose} className="text-slate-500 hover:text-current transition-colors"><X size={16} /></button>
    </div>
  </motion.div>
);

const SidebarItem = ({ active, icon: Icon, label, onClick }) => (
  <button onClick={onClick} className={cn("w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm relative group text-left", active ? "text-white" : "text-slate-500 hover:text-slate-300")}>
    {active && <motion.div layoutId="sidebar-active" className="absolute inset-0 bg-[#A100FF] rounded-2xl shadow-lg shadow-[#A100FF]/20" />}
    <Icon className="relative z-10" size={20} />
    <span className="relative z-10">{label}</span>
    {!active && <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" size={14} />}
  </button>
);

// --- MAIN APPLICATION ---

const PATH_TO_TAB = { '/reader': 'reader', '/settings': 'settings', '/editor': 'editor', '/dashboard': 'dashboard' };
const TAB_TO_PATH = { dashboard: '/', reader: '/reader', settings: '/settings', editor: '/editor' };

export default function App({ standalone = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [csvData, setCsvData] = useState([]);
  const [agents, setAgents] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [activeTab, setActiveTab] = useState(() => PATH_TO_TAB[location.pathname] || 'dashboard');
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [activeBlueprintId, setActiveBlueprintId] = useState(null);
  const [activeBlueprintTitle, setActiveBlueprintTitle] = useState('');
  const [blueprintContent, setBlueprintContent] = useState('');
  const [selectedBlueprintIds, setSelectedBlueprintIds] = useState([]);
  const [blueprintDownloadFormat, setBlueprintDownloadFormat] = useState('md');
  
  const [editingAgentNameId, setEditingAgentNameId] = useState(null);
  const [editingAgentName, setEditingAgentName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [settingsCategory, setSettingsCategory] = useState('engine');
  const [editingRow, setEditingRow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [buildJobs, setBuildJobs] = useState([]);
  const [logViewJobId, setLogViewJobId] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [isReaderFullscreen, setIsReaderFullscreen] = useState(false);
  const [readerSidebarWidth, setReaderSidebarWidth] = useState(240);
  const [readerEditorWidth, setReaderEditorWidth] = useState(420);
  const [blueprintSearch, setBlueprintSearch] = useState('');
  const [engineSettings, setEngineSettings] = useState({ engine_type: 'gemini', gemini_model: 'gemini-2.5-flash', claude_model: 'sonnet', gemini_timeout: '90', claude_timeout: '360' });
  const [isReloadingBlueprints, setIsReloadingBlueprints] = useState(false);
  const [engineTestStatus, setEngineTestStatus] = useState(null); // null | { testing, success, message, durationMs, output }

  // Users management state
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserData, setEditingUserData] = useState({ password: '', role: 'user' });

  const previewRef = useRef(null);
  const buildJobCounter = useRef(0);
  const eventSourcesRef = useRef({});  // localId -> EventSource
  const realJobIdsRef = useRef({});    // localId -> server jobId
  const knownJobIdsRef = useRef(new Set()); // server jobId già tracciati

  // Sync activeTab from URL
  useEffect(() => {
    const tab = PATH_TO_TAB[location.pathname] || 'dashboard';
    setActiveTab(tab);
  }, [location.pathname]);

  const switchTab = (tab) => {
    navigate(TAB_TO_PATH[tab] || '/');
  };

  // Sincronizza stato fullscreen con il tasto ESC del browser
  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setIsReaderFullscreen(false); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleReaderFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      setIsReaderFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsReaderFullscreen(false);
    }
  };

  const startSidebarResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = readerSidebarWidth;
    const onMove = (ev) => setReaderSidebarWidth(Math.max(140, Math.min(480, startW + ev.clientX - startX)));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startEditorResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = readerEditorWidth;
    const onMove = (ev) => setReaderEditorWidth(Math.max(180, Math.min(900, startW + ev.clientX - startX)));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBlueprints = async ({ silent = false } = {}) => {
    if (!silent) setIsReloadingBlueprints(true);
    try {
      const { data } = await axios.get(`${API_BASE}/blueprints`);
      setBlueprints(data);
      if (!silent) showToast(`${data.length} blueprint caricate`);
    } catch (e) { showToast('Errore reload blueprints', 'error'); }
    finally { setIsReloadingBlueprints(false); }
  };

  const fetchData = async () => {
    try {
      const [csv, agentsRes, blueprintsRes, settingsRes] = await Promise.all([
        axios.get(`${API_BASE}/csv`),
        axios.get(`${API_BASE}/agents`),
        axios.get(`${API_BASE}/blueprints`),
        axios.get(`${API_BASE}/settings`)
      ]);
      setCsvData(csv.data);
      setAgents(agentsRes.data);
      setBlueprints(blueprintsRes.data);
      setEngineSettings(s => ({ ...s, ...settingsRes.data }));

      if (agentsRes.data.length > 0) {
        const def = agentsRes.data.find(a => a.is_default) || agentsRes.data[0];
        setActiveAgentId(def.id);
      }
    } catch (e) { showToast('Sync failed', 'error'); }
    finally { setTimeout(() => setIsLoading(false), 1200); }
  };

  useEffect(() => { fetchData(); }, []);

  const loadBlueprint = async (id) => {
    try {
      const { data } = await axios.get(`${API_BASE}/blueprints/${id}`);
      setActiveBlueprintId(data.id);
      setActiveBlueprintTitle(data.title || `Blueprint #${data.id}`);
      setBlueprintContent(data.markdown_data || '');
    } catch (e) { showToast('Errore caricamento blueprint', 'error'); }
  };

  // Auto-load blueprint from URL query param (e.g. /reader?id=42)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id && activeTab === 'reader') loadBlueprint(id);
  }, [activeTab, location.search]);

  // Aggancia un job esterno (es. avviato da /Usecase) al dashboard
  const connectExternalJob = useCallback((serverJob) => {
    const num = ++buildJobCounter.current;
    const startedAt = serverJob.startedAt ? new Date(serverJob.startedAt) : new Date();
    const jobId = serverJob.id;
    const items = (serverJob.ids || []).map((sid, i) => ({
      id: String(sid), title: serverJob.titles?.[i] || sid,
      status: 'running', savedFile: null, exitCode: null, durationMs: null,
      stdout: '', stderr: '', timedOut: false, spawnError: null, logsOpen: false,
    }));

    setBuildJobs(prev => [...prev, {
      localId: num, num, startedAt, jobId,
      engine: serverJob.engine || '…', status: 'running',
      total: items.length, completed: 0,
      items, errorMessage: null, elapsed: null, collapsed: false, debugLogs: [],
    }]);
    realJobIdsRef.current[num] = jobId;

    getSseUrl(`/run/stream/${jobId}`).then(sseUrl => {
      const es = new EventSource(sseUrl);
      eventSourcesRef.current[num] = es;
      const cleanupJob = () => { es.close(); delete eventSourcesRef.current[num]; delete realJobIdsRef.current[num]; };

      es.onmessage = (e) => {
        const ev = JSON.parse(e.data);
        if (ev.type === 'debug') {
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, debugLogs: [...j.debugLogs, { t: ev.t, level: ev.level, msg: ev.msg }] } : j));
        } else if (ev.type === 'start') {
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, engine: ev.engine, total: ev.total } : j));
        } else if (ev.type === 'item_start') {
          setBuildJobs(prev => prev.map(j => j.localId !== num ? j : { ...j, items: j.items.map(it => it.id === String(ev.id) ? { ...it, status: 'running' } : it) }));
        } else if (ev.type === 'item') {
          setBuildJobs(prev => prev.map(j => j.localId !== num ? j : {
            ...j, completed: ev.completed,
            items: j.items.map(it => it.id === String(ev.id) ? { ...it, status: ev.isErr ? 'error' : 'done', savedFile: ev.savedFile, exitCode: ev.exitCode, durationMs: ev.durationMs, stdout: ev.stdout, stderr: ev.stderr, timedOut: ev.timedOut, spawnError: ev.spawnError } : it),
          }));
        } else if (ev.type === 'done') {
          cleanupJob();
          const elapsed = Math.round((Date.now() - startedAt.getTime()) / 1000);
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, status: 'done', elapsed } : j));
          showToast(`Blueprint generata (da /usecase) in ${elapsed}s`);
          fetchBlueprints({ silent: true });
        } else if (ev.type === 'cancelled') {
          cleanupJob();
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, status: 'cancelled' } : j));
        } else if (ev.type === 'error') {
          cleanupJob();
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, status: 'error', errorMessage: ev.message } : j));
        }
      };
      es.onerror = () => {
        cleanupJob();
        setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, status: 'error', errorMessage: 'Connessione persa' } : j));
      };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling per rilevare job avviati da /Usecase e mostrarli nel dashboard
  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/jobs`);
        for (const sj of data) {
          if (!knownJobIdsRef.current.has(sj.id)) {
            knownJobIdsRef.current.add(sj.id);
            connectExternalJob(sj);
          }
        }
      } catch (_) {}
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [connectExternalJob]);

  const saveBlueprint = async () => {
    if (!activeBlueprintId) return;
    try {
      await axios.put(`${API_BASE}/blueprints/${activeBlueprintId}`, { markdown_data: blueprintContent });
      showToast('Blueprint salvata');
    } catch (e) { showToast('Errore salvataggio', 'error'); }
  };

  const deleteBlueprint = async (id) => {
    if (!window.confirm('Eliminare questa blueprint?')) return;
    try {
      await axios.delete(`${API_BASE}/blueprints/${id}`);
      await fetchBlueprints({ silent: true });
      if (activeBlueprintId === id) { setActiveBlueprintId(null); setActiveBlueprintTitle(''); setBlueprintContent(''); }
      setSelectedBlueprintIds(prev => prev.filter(x => x !== id));
      showToast('Blueprint eliminata');
    } catch (e) { showToast('Errore eliminazione', 'error'); }
  };

  const exportToPdf = () => {
    if (!previewRef.current) return;
    const filename = activeBlueprintTitle ? `${activeBlueprintTitle}.pdf` : 'blueprint.pdf';
    const opt = {
      margin: 15, filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    return html2pdf().set(opt).from(previewRef.current).save();
  };

  // Calcola nome zip: IDs sequenziali → "1to5", altrimenti "1-3-7"
  const zipName = (ids, format) => {
    const sorted = [...ids].sort((a, b) => a - b);
    const isSeq = sorted.length > 2 && sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
    const range = isSeq ? `${sorted[0]}to${sorted[sorted.length - 1]}` : sorted.join('-');
    return `blueprint_${range}_${format}.zip`;
  };

  const downloadSelected = async (format) => {
    if (selectedBlueprintIds.length === 0) return;
    showToast(`Preparazione ${format.toUpperCase()} zip...`);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const id of selectedBlueprintIds) {
        const { data } = await axios.get(`${API_BASE}/blueprints/${id}`);
        const safeName = (data.title || `blueprint_${id}`).replace(/[/\\?%*:|"<>]/g, '_');

        if (format === 'md') {
          zip.file(`${safeName}.md`, data.markdown_data || '');
        } else {
          // PDF: elemento posizionato in modo assoluto nel viewport corrente
          // (position:absolute è più affidabile di position:fixed con html2canvas)
          const { marked } = await import('marked');
          const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
          const el = document.createElement('div');
          el.style.cssText = [
            'position:absolute',
            `top:${scrollTop}px`,
            'left:0',
            'width:794px',
            'background:#ffffff',
            'color:#1e293b',
            'padding:48px',
            'font-family:Georgia,serif',
            'font-size:14px',
            'line-height:1.8',
            'z-index:99999',
          ].join(';');
          el.innerHTML = marked.parse(data.markdown_data || '');
          document.body.appendChild(el);
          // Attendi rendering + caricamento font
          await document.fonts.ready;
          await new Promise(r => setTimeout(r, 200));
          const pdfBuf = await html2pdf().set({
            margin: 12,
            image: { type: 'jpeg', quality: 0.97 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: 794 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] },
          }).from(el).outputPdf('arraybuffer');
          document.body.removeChild(el);
          zip.file(`${safeName}.pdf`, pdfBuf);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = zipName(selectedBlueprintIds, format);
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Download ${zipName(selectedBlueprintIds, format)} pronto`);
    } catch (e) { showToast(`Errore download: ${e.message}`, 'error'); }
  };

  // --- Reused Logics ---
  const saveCsv = async (data = csvData) => { try { await axios.post(`${API_BASE}/csv`, data); showToast('DB Sync'); } catch (e) { showToast('Save error', 'error'); } };
  const saveAgentContent = async () => {
    const agent = agents.find(a => a.id === activeAgentId);
    if (!agent) return;
    try { await axios.post(`${API_BASE}/agents/${activeAgentId}/content`, { content: agent.content }); showToast('Logic Saved'); } catch (e) { showToast('Error', 'error'); }
  };
  const updateAgentName = async (id, newName) => {
    try { await axios.post(`${API_BASE}/agents/${id}/name`, { name: newName }); const res = await axios.get(`${API_BASE}/agents`); setAgents(res.data); setEditingAgentNameId(null); } catch (e) { showToast('Error', 'error'); }
  };

  // FIX 2: funzione mancante per impostare la strategia di default
  const setDefaultStrategy = async (id) => {
    try {
      await axios.post(`${API_BASE}/agents/${id}/default`);
      const res = await axios.get(`${API_BASE}/agents`);
      setAgents(res.data);
      showToast('Engine strategy updated');
    } catch (e) { showToast('Error setting default', 'error'); }
  };

  const saveAgentName = async (id, name) => {
    if (!name.trim()) return;
    try {
      await axios.post(`${API_BASE}/agents/${id}/name`, { name: name.trim() });
      setAgents(prev => prev.map(a => a.id === id ? { ...a, name: name.trim() } : a));
      setEditingAgentNameId(null);
    } catch (e) { showToast('Errore salvataggio nome', 'error'); }
  };

  const deleteStrategy = async (id) => {
    try {
      await axios.delete(`${API_BASE}/agents/${id}`);
      const res = await axios.get(`${API_BASE}/agents`);
      setAgents(res.data);
      if (activeAgentId === id) {
        const def = res.data.find(a => a.is_default) || res.data[0];
        setActiveAgentId(def?.id || null);
      }
      showToast('Strategia eliminata');
    } catch (e) { showToast(e.response?.data?.error || 'Error deleting', 'error'); }
  };

  const testEngine = async () => {
    setEngineTestStatus({ testing: true });
    try {
      const { data } = await axios.post(`${API_BASE}/test-engine`, { apiKey });
      setEngineTestStatus({ testing: false, success: data.success, message: data.error || '', output: data.output || '', durationMs: data.durationMs });
    } catch (e) {
      setEngineTestStatus({ testing: false, success: false, message: e.message, durationMs: 0 });
    }
  };

  const saveEngineSettings = async (newSettings) => {
    try {
      await axios.post(`${API_BASE}/settings`, newSettings);
      setEngineSettings(newSettings);
      showToast('Engine settings saved');
    } catch (e) { showToast('Error saving settings', 'error'); }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/users`);
      setUsers(data);
    } catch (e) { showToast('Errore caricamento utenti', 'error'); }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password) return showToast('Username e password richiesti', 'error');
    try {
      await axios.post(`${API_BASE}/users`, newUser);
      setNewUser({ username: '', password: '', role: 'user' });
      setShowNewUserForm(false);
      fetchUsers();
      showToast('Utente creato');
    } catch (e) { showToast(e.response?.data?.error || 'Errore creazione utente', 'error'); }
  };

  const updateUser = async (id) => {
    try {
      await axios.put(`${API_BASE}/users/${id}`, editingUserData);
      setEditingUserId(null);
      setEditingUserData({ password: '', role: 'user' });
      fetchUsers();
      showToast('Utente aggiornato');
    } catch (e) { showToast(e.response?.data?.error || 'Errore aggiornamento', 'error'); }
  };

  const deleteUser = async (id, username) => {
    if (!window.confirm(`Eliminare l'utente "${username}"?`)) return;
    try {
      await axios.delete(`${API_BASE}/users/${id}`);
      fetchUsers();
      showToast('Utente eliminato');
    } catch (e) { showToast(e.response?.data?.error || 'Errore eliminazione', 'error'); }
  };

  const forceLogoutUser = async (id, username) => {
    try {
      const { data } = await axios.post(`${API_BASE}/users/${id}/logout`);
      showToast(`${username} disconnesso (${data.sessionsDeleted} sessioni chiuse)`);
    } catch (e) { showToast(e.response?.data?.error || 'Errore logout forzato', 'error'); }
  };

  const deleteSelected = () => {
    const d = csvData.filter(r => !selectedIds.includes(r.ID));
    setCsvData(d);
    setSelectedIds([]);
    saveCsv(d);
  };

  const runEngine = async () => {
    if (selectedIds.length === 0) return showToast('Seleziona use case', 'error');
    if (engineSettings.engine_type === 'gemini' && !apiKey) return showToast('API Key Gemini mancante', 'error');

    const num = ++buildJobCounter.current;
    const startedAt = new Date();
    const snapshotItems = selectedIds.map(sid => {
      const row = csvData.find(r => r.ID === sid);
      return { id: String(sid), title: row?.['Titolo Attività'] || sid, status: 'pending', savedFile: null, exitCode: null, durationMs: null, stdout: '', stderr: '', timedOut: false, spawnError: null, logsOpen: false };
    });

    setBuildJobs(prev => [...prev, {
      localId: num, num, startedAt,
      engine: engineSettings.engine_type.toUpperCase(),
      status: 'connecting',
      total: snapshotItems.length, completed: 0,
      items: snapshotItems,
      errorMessage: null, elapsed: null, collapsed: false,
      debugLogs: [],
    }]);

    try {
      const { data } = await axios.post(`${API_BASE}/run`, { ids: selectedIds, apiKey });
      const { jobId } = data;
      knownJobIdsRef.current.add(jobId); // evita che il polling lo registri di nuovo
      realJobIdsRef.current[num] = jobId;
      setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, jobId, status: 'running' } : j));

      const sseUrl = await getSseUrl(`/run/stream/${jobId}`);
      const es = new EventSource(sseUrl);
      eventSourcesRef.current[num] = es;

      const cleanupJob = () => {
        es.close();
        delete eventSourcesRef.current[num];
        delete realJobIdsRef.current[num];
      };

      es.onmessage = (e) => {
        const ev = JSON.parse(e.data);
        if (ev.type === 'debug') {
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, debugLogs: [...j.debugLogs, { t: ev.t, level: ev.level, msg: ev.msg }] } : j));
        } else if (ev.type === 'start') {
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, engine: ev.engine, total: ev.total } : j));
        } else if (ev.type === 'item_start') {
          setBuildJobs(prev => prev.map(j => {
            if (j.localId !== num) return j;
            return { ...j, items: j.items.map(it => it.id === String(ev.id) ? { ...it, status: 'running' } : it) };
          }));
        } else if (ev.type === 'item') {
          setBuildJobs(prev => prev.map(j => {
            if (j.localId !== num) return j;
            return { ...j, completed: ev.completed,
              items: j.items.map(it => it.id === String(ev.id) ? {
                ...it,
                status: ev.isErr ? 'error' : 'done',
                savedFile: ev.savedFile,
                exitCode: ev.exitCode, durationMs: ev.durationMs,
                stdout: ev.stdout, stderr: ev.stderr,
                timedOut: ev.timedOut, spawnError: ev.spawnError,
              } : it) };
          }));
        } else if (ev.type === 'done') {
          cleanupJob();
          const elapsed = Math.round((Date.now() - startedAt.getTime()) / 1000);
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, status: 'done', elapsed } : j));
          showToast(`Build #${num} completata — ${ev.total} blueprint in ${elapsed}s`);
          fetchBlueprints({ silent: true });
        } else if (ev.type === 'cancelled') {
          cleanupJob();
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, status: 'cancelled' } : j));
        } else if (ev.type === 'error') {
          cleanupJob();
          setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, status: 'error', errorMessage: ev.message } : j));
          showToast(`Build #${num} fallita`, 'error');
        }
      };
      es.onerror = () => {
        cleanupJob();
        setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, status: 'error', errorMessage: 'Connessione persa' } : j));
      };
    } catch (e) {
      setBuildJobs(prev => prev.map(j => j.localId === num ? { ...j, status: 'error', errorMessage: e.message } : j));
      showToast('Build fallita', 'error');
    }
  };

  const cancelJob = async (localId) => {
    const es = eventSourcesRef.current[localId];
    if (es) { es.close(); delete eventSourcesRef.current[localId]; }
    const jobId = realJobIdsRef.current[localId];
    if (jobId) {
      try { await axios.post(`${API_BASE}/run/${jobId}/cancel`); } catch {}
      delete realJobIdsRef.current[localId];
    }
    setBuildJobs(prev => prev.map(j => j.localId === localId ? { ...j, status: 'cancelled' } : j));
  };

  const toggleItemLog = (localId, itemId) => {
    setBuildJobs(prev => prev.map(j => j.localId !== localId ? j : {
      ...j, items: j.items.map(it => it.id === itemId ? { ...it, logsOpen: !it.logsOpen } : it)
    }));
  };

  const cancelAllJobs = () => {
    buildJobs
      .filter(j => j.status === 'running' || j.status === 'connecting')
      .forEach(j => cancelJob(j.localId));
  };

  const filteredData = useMemo(() => csvData.filter((r) => Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()))), [csvData, search]);
  const activeAgent = useMemo(() => agents.find(a => a.id === activeAgentId), [agents, activeAgentId]);

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617]">
      <Activity className="text-[#A100FF] animate-pulse mb-4" size={48} />
      <h2 className="text-white font-black tracking-widest uppercase italic text-sm">BlueprintAI Studio</h2>
    </div>
  );

  return (
    <div className={`min-h-screen flex h-screen overflow-hidden transition-colors duration-500 ${standalone ? '' : 'p-6 gap-6'}`}>
      <AnimatePresence>{toast && <Toast {...toast} onClose={() => setToast(null)} />}</AnimatePresence>

      {!standalone && <aside className="w-80 glass rounded-[2.5rem] flex flex-col p-8 shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 accent-btn rounded-2xl flex items-center justify-center"><Zap size={24} /></div>
          <div className="text-left">
            <h1 className="text-xl font-black tracking-tighter italic">BlueprintAI</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Developed by Carmelo Battiato v3.0</p>
          </div>
        </div>
        <div className="space-y-3 flex-1">
          <SidebarItem active={activeTab === 'dashboard'} icon={LayoutDashboard} label="Usecase to Blueprint" onClick={() => switchTab('dashboard')} />
          <SidebarItem active={activeTab === 'editor'} icon={FileCode} label="Engine Config" onClick={() => switchTab('editor')} />
          <SidebarItem active={activeTab === 'reader'} icon={BookOpen} label="Blueprint Reader" onClick={() => switchTab('reader')} />
          <SidebarItem active={activeTab === 'settings'} icon={Settings} label="Settings" onClick={() => switchTab('settings')} />
        </div>
        <div className="px-5 py-4 glass-dark rounded-2xl mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("w-2 h-2 rounded-full shrink-0",
              engineTestStatus?.testing ? "bg-yellow-400 animate-pulse shadow-[0_0_8px_#facc15]" :
              engineTestStatus?.success === true ? "bg-green-400 shadow-[0_0_10px_#4ade80]" :
              engineTestStatus?.success === false ? "bg-red-400 shadow-[0_0_8px_#f87171]" :
              (engineSettings.engine_type === 'claude' || apiKey) ? "bg-green-400 shadow-[0_0_10px_#4ade80]" : "bg-red-400"
            )} />
            <span className="text-[10px] font-black uppercase opacity-60 text-white">Engine Status</span>
          </div>
          <p className="text-[10px] font-black text-[#A100FF] leading-tight truncate">
            {engineSettings.engine_type === 'claude' ? engineSettings.claude_model || 'sonnet' : engineSettings.gemini_model || 'gemini-2.5-flash'}
          </p>
          <p className={cn("text-[9px] font-bold leading-tight mt-0.5 truncate",
            engineTestStatus?.success === true ? "text-green-400" :
            engineTestStatus?.success === false ? "text-red-400" : "text-slate-500"
          )}>
            {engineTestStatus?.testing ? 'Testing...' :
             engineTestStatus?.success === true ? `✓ OK · ${(engineTestStatus.durationMs / 1000).toFixed(1)}s` :
             engineTestStatus?.success === false ? `✗ ${engineTestStatus.message.slice(0, 35)}` :
             engineSettings.engine_type === 'claude' ? 'Claude · CLI locale' : apiKey ? 'Gemini · API Key ✓' : 'Gemini · API Key mancante'}
          </p>
        </div>
        {/* User info and logout */}
        {user && (
          <div className="px-5 py-3 glass-dark rounded-2xl mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-white truncate">{user.username}</p>
              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: user.role === 'admin' ? 'rgba(161,0,255,0.2)' : 'rgba(100,116,139,0.2)', color: user.role === 'admin' ? '#A100FF' : '#94a3b8' }}>
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-400 transition-colors"
            >
              <Lock size={14} />
            </button>
          </div>
        )}
        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">© 2026 Developed by Carmelo Battiato</p>
      </aside>}

      <main className={`flex-1 flex flex-col overflow-hidden text-left ${standalone ? '' : 'gap-6'}`}>
        {!standalone && <header className="glass h-24 rounded-[2.5rem] px-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {activeTab !== 'dashboard' && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => switchTab('dashboard')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 hover:text-slate-700 transition-all text-xs font-black uppercase tracking-widest"><ChevronLeft size={14} />Dashboard</motion.button>
            )}
            <Command className="text-slate-500" size={18} /><div><h2 className="text-sm font-black uppercase tracking-widest leading-none">{{ dashboard: 'Usecase to Blueprint', editor: 'Engine Config', reader: 'Blueprint Reader', settings: 'Settings' }[activeTab]}</h2><p className="text-xs text-slate-500 font-medium mt-1">Intelligence Layer v3</p></div>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={runEngine} disabled={selectedIds.length === 0} className="accent-btn h-12 px-8 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest disabled:opacity-30 cursor-pointer"><Zap size={16} fill="currentColor" />Build Blueprint{selectedIds.length > 0 && <span className="bg-white/20 text-white text-[9px] font-black rounded-full px-1.5 py-0.5">{selectedIds.length}</span>}</motion.button>
        </header>}

        <div className={`flex-1 min-h-0 ${activeTab === 'reader' ? 'overflow-hidden' : `overflow-y-auto custom-scrollbar space-y-6 ${standalone ? 'p-6' : 'pr-2'}`}`}>
          {activeTab === 'dashboard' ? (
            <div className="space-y-6 pb-10">
              <div className="grid grid-cols-3 gap-6">
                <div className="glass p-6 rounded-[2rem] h-40 flex flex-col justify-between"><Database className="text-blue-500" /><p className="text-2xl font-black">{csvData.length} Assets</p></div>
                <div className="glass p-6 rounded-[2rem] h-40 flex flex-col justify-between"><CheckCircle className="text-purple-500" /><p className="text-2xl font-black">{selectedIds.length} Selected</p></div>
                <div className="glass p-6 rounded-[2rem] h-40 flex flex-col justify-between"><BookOpen className="text-green-500" /><p className="text-2xl font-black">{blueprints.length} Blueprints</p></div>
              </div>
              {/* ── Build Queue ──────────────────────────────────────────── */}
              {buildJobs.length > 0 && (
                <div className="glass rounded-[3rem] p-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Activity size={16} className="text-[#A100FF]" />
                      <h3 className="text-sm font-black uppercase tracking-widest">Build Queue</h3>
                      {buildJobs.some(j => j.status === 'running' || j.status === 'connecting') && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#A100FF]/10 text-[#A100FF]">
                          {buildJobs.filter(j => j.status === 'running' || j.status === 'connecting').length} running
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {buildJobs.some(j => j.status === 'running' || j.status === 'connecting') && (
                        <button onClick={cancelAllJobs} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-widest transition-colors">
                          <X size={11} />Stop All
                        </button>
                      )}
                      <button onClick={() => setBuildJobs(prev => prev.filter(j => j.status === 'running' || j.status === 'connecting'))} className="text-[10px] text-slate-500 hover:text-red-400 font-bold transition-colors">Clear completed</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[...buildJobs].reverse().map(job => {
                      const isActive = job.status === 'running' || job.status === 'connecting';
                      return (
                        <div key={job.localId} className="rounded-2xl border border-white/5 overflow-hidden">
                          {/* Job header row */}
                          <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", isActive ? "bg-[#A100FF] animate-pulse shadow-[0_0_6px_#A100FF]" : job.status === 'done' ? "bg-green-400" : job.status === 'cancelled' ? "bg-slate-500" : "bg-red-400")} />
                            <span className="text-[11px] font-black text-[#A100FF] shrink-0">#{job.num}</span>
                            <span className="text-[10px] text-slate-500 shrink-0">{job.startedAt.toLocaleTimeString()}</span>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 shrink-0">{job.engine}</span>
                            <span className="text-[10px] text-slate-500 flex-1">{job.total} use case{job.total !== 1 ? 's' : ''}</span>
                            {isActive && (
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-24 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                  <div className="h-full bg-[#A100FF] rounded-full transition-all duration-500" style={{ width: job.total > 0 ? `${(job.completed / job.total) * 100}%` : '0%' }} />
                                </div>
                                <span className="text-[9px] font-black text-[#A100FF]">{job.completed}/{job.total}</span>
                              </div>
                            )}
                            {job.status === 'done' && <span className="text-[10px] font-black text-green-400 shrink-0">✓ {job.elapsed}s</span>}
                            {job.status === 'cancelled' && <span className="text-[10px] font-black text-slate-500 shrink-0">◼ Stopped</span>}
                            {job.status === 'error' && <span className="text-[10px] font-black text-red-400 shrink-0">✗ Error</span>}
                            {isActive && (
                              <button onClick={(e) => { e.stopPropagation(); cancelJob(job.localId); }} title="Ferma questa build" className="p-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0 ml-1">
                                <X size={12} />
                              </button>
                            )}
                            <button onClick={() => setBuildJobs(prev => prev.map(j => j.localId === job.localId ? { ...j, collapsed: !j.collapsed } : j))} className="p-1 shrink-0">
                              <ChevronRight size={13} className={cn("text-slate-600 transition-transform", !job.collapsed && "rotate-90")} />
                            </button>
                          </div>
                          {/* Item rows */}
                          {!job.collapsed && (
                            <div className="border-t border-white/5 divide-y divide-white/[0.03]">
                              {job.items.map((item, idx) => (
                                <div key={item.id}>
                                  <div className={cn("flex items-center gap-3 px-5 py-2 text-[11px]", idx % 2 === 0 ? "bg-white/[0.01]" : "")}>
                                    {item.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />}
                                    {item.status === 'running' && <Loader2 size={11} className="text-[#A100FF] animate-spin shrink-0" />}
                                    {item.status === 'done' && <Check size={11} className="text-green-400 shrink-0" />}
                                    {item.status === 'error' && <X size={11} className="text-red-400 shrink-0" />}
                                    <span className="font-mono text-[10px] text-slate-500 w-8 shrink-0">{item.id}</span>
                                    <span className="flex-1 truncate font-medium opacity-80">{item.title}</span>
                                    {item.durationMs != null && <span className="text-[9px] text-slate-600 shrink-0">{(item.durationMs/1000).toFixed(1)}s</span>}
                                    {item.exitCode != null && (
                                      <span className={cn("text-[9px] font-mono font-black shrink-0 px-1.5 py-0.5 rounded", item.exitCode === 0 ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10")}>
                                        exit {item.exitCode}
                                      </span>
                                    )}
                                    {item.timedOut && <span className="text-[9px] font-black text-orange-400 shrink-0">TIMEOUT</span>}
                                    {item.savedFile && <span className="text-[9px] font-mono text-slate-600 truncate max-w-[160px] shrink-0">{item.savedFile}</span>}
                                    {(item.status === 'done' || item.status === 'error') && (
                                      <button onClick={() => toggleItemLog(job.localId, item.id)} className="p-0.5 hover:bg-white/5 rounded shrink-0" title="Toggle log">
                                        <ChevronRight size={11} className={cn("text-slate-600 transition-transform", item.logsOpen && "rotate-90")} />
                                      </button>
                                    )}
                                  </div>
                                  {item.logsOpen && (
                                    <div className="px-5 pb-3 bg-slate-950/60 font-mono text-[10px] space-y-2">
                                      <div className="flex flex-wrap gap-3 pt-2 pb-1 text-[9px]">
                                        {item.spawnError && <span className="text-red-400 font-black">SPAWN ERROR: {item.spawnError}</span>}
                                        {item.timedOut && <span className="text-orange-400 font-black">TIMEOUT</span>}
                                        {item.exitCode != null && <span className={item.exitCode === 0 ? "text-green-400" : "text-red-400"}>exit code: {item.exitCode}</span>}
                                        {item.durationMs != null && <span className="text-slate-500">durata: {(item.durationMs/1000).toFixed(2)}s</span>}
                                      </div>
                                      {item.stderr && item.stderr.trim() && (
                                        <div>
                                          <p className="text-red-400 font-black text-[9px] mb-1 uppercase tracking-widest">stderr</p>
                                          <pre className="whitespace-pre-wrap text-red-300/70 bg-red-950/30 rounded p-2 max-h-40 overflow-y-auto custom-scrollbar text-[9px]">{item.stderr.trim()}</pre>
                                        </div>
                                      )}
                                      {item.stdout && item.stdout.trim() && (
                                        <div>
                                          <p className="text-slate-400 font-black text-[9px] mb-1 uppercase tracking-widest">stdout</p>
                                          <pre className="whitespace-pre-wrap text-slate-400/70 bg-slate-900/60 rounded p-2 max-h-48 overflow-y-auto custom-scrollbar text-[9px]">{item.stdout.trim()}</pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {job.errorMessage && <div className="px-5 py-2 text-[10px] text-red-400 font-mono border-t border-red-500/10 bg-red-500/5">{job.errorMessage}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* ── Usecase List ─────────────────────────────────────────── */}
              <div className="glass rounded-[3rem] p-10">
                <div className="flex items-center justify-between mb-10 text-left gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-sm font-black uppercase tracking-widest shrink-0">Usecase List</h3>
                    <input type="checkbox" title="Seleziona tutti" checked={filteredData.length > 0 && filteredData.every(r => selectedIds.includes(r.ID))} ref={el => { if (el) el.indeterminate = filteredData.some(r => selectedIds.includes(r.ID)) && !filteredData.every(r => selectedIds.includes(r.ID)); }} onChange={() => { const allSel = filteredData.every(r => selectedIds.includes(r.ID)); if (allSel) { setSelectedIds(prev => prev.filter(id => !filteredData.map(r => r.ID).includes(id))); } else { setSelectedIds(prev => [...new Set([...prev, ...filteredData.map(r => r.ID)])]); } }} className="w-5 h-5 rounded-lg border-slate-500/20 text-[#A100FF] cursor-pointer shrink-0" />
                    <div className="w-full max-w-sm relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input placeholder="Filter assets..." className="w-full pl-12 pr-4 py-3 bg-slate-500/5 border-0 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-purple-500/20 outline-none" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    {selectedIds.length > 0 && <button onClick={deleteSelected} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"><Trash2 size={12} />Delete ({selectedIds.length})</button>}
                    <button onClick={() => { const nextId = (Math.max(...csvData.map(r => parseInt(r.ID)), 0) + 1).toString().padStart(2, '0'); setCsvData([{ ID: nextId, Categoria: 'T&A', 'Titolo Attività': 'New', 'Descrizione Dettagliata': '...', 'Gruppo o Ruolo': 'Admin' }, ...csvData]); setEditingRow(nextId); }} className="accent-btn px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer">New Asset</button>
                  </div>
                </div>
                <div className="space-y-2">{filteredData.map(row => (
                  <div key={row.ID} className={cn("flex items-center p-4 rounded-2xl transition-all", selectedIds.includes(row.ID) ? "bg-white/5 border border-white/5" : "hover:bg-slate-500/5")}>
                    <input type="checkbox" checked={selectedIds.includes(row.ID)} onChange={() => setSelectedIds(prev => prev.includes(row.ID) ? prev.filter(id => id !== row.ID) : [...prev, row.ID])} className="w-5 h-5 rounded-lg border-slate-500/20 text-[#A100FF] cursor-pointer" />
                    <div className="w-16 font-mono text-[10px] font-black text-slate-500 pl-4">{row.ID}</div>
                    <div className="flex-1 px-4 text-left">
                      {editingRow === row.ID ? <div className="space-y-2"><input className="w-full bg-slate-500/5 p-2 rounded-lg text-sm font-bold text-white outline-none" value={row['Titolo Attività']} onChange={(e) => setCsvData(csvData.map(r => r.ID === row.ID ? { ...r, 'Titolo Attività': e.target.value } : r))} /><textarea className="w-full bg-slate-500/5 p-2 rounded-lg text-xs text-slate-500 outline-none" value={row['Descrizione Dettagliata']} onChange={(e) => setCsvData(csvData.map(r => r.ID === row.ID ? { ...r, 'Descrizione Dettagliata': e.target.value } : r))} /></div> : <div><h4 className="text-sm font-bold opacity-90">{row['Titolo Attività']}</h4><p className="text-[10px] text-slate-500 line-clamp-1">{row['Descrizione Dettagliata']}</p></div>}
                    </div>
                    <div className="flex gap-2">
                       {editingRow === row.ID ? <button onClick={() => { setEditingRow(null); saveCsv(); }} className="p-2 bg-green-500 rounded-lg text-white"><Check size={14} /></button> : <button onClick={() => setEditingRow(row.ID)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><Edit size={14} /></button>}
                       <button onClick={() => { const d = csvData.filter(r => r.ID !== row.ID); setCsvData(d); saveCsv(d); }} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}</div>
              </div>
            </div>
          ) : activeTab === 'editor' ? (
            <div className={cn("glass rounded-[3rem] flex overflow-hidden", standalone ? "h-screen" : "h-[calc(100vh-14rem)]")}>
               <div className="w-72 border-r border-slate-500/10 p-8 flex flex-col gap-2 shrink-0">
                  {standalone && <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 px-3 py-2 mb-4 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 hover:text-slate-700 transition-all text-xs font-black uppercase tracking-widest w-full"><ChevronLeft size={14} />Dashboard</button>}
                  <div className="flex items-center justify-between mb-6"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Strategies</p><button onClick={async () => { const res = await axios.post(`${API_BASE}/agents`, { name: `New Strategy ${agents.length + 1}` }); const n = await axios.get(`${API_BASE}/agents`); setAgents(n.data); setActiveAgentId(res.data.id); }} className="p-1.5 bg-[#A100FF]/10 text-[#A100FF] rounded-lg"><Plus size={14} /></button></div>
                  <div className="space-y-1 overflow-y-auto custom-scrollbar">{agents.map(a => (
                    <div key={a.id} className="group relative flex items-center">
                      {editingAgentNameId === a.id ? (
                        <div className="flex-1 flex items-center gap-1 px-2 py-1">
                          <input
                            autoFocus
                            className="flex-1 bg-slate-500/10 rounded-lg px-2 py-1.5 text-xs font-bold outline-none border border-[#A100FF]/30 focus:border-[#A100FF]"
                            value={editingAgentName}
                            onChange={e => setEditingAgentName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveAgentName(a.id, editingAgentName); if (e.key === 'Escape') setEditingAgentNameId(null); }}
                          />
                          <button onClick={() => saveAgentName(a.id, editingAgentName)} className="p-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded shrink-0"><Check size={12} /></button>
                          <button onClick={() => setEditingAgentNameId(null)} className="p-1 hover:bg-white/5 text-slate-500 rounded shrink-0"><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setActiveAgentId(a.id)} className={cn("flex-1 flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all pr-16", activeAgentId === a.id ? "bg-[#A100FF] text-white" : "text-slate-500 hover:bg-slate-500/5")}>
                            <span className="truncate">{a.name}</span>{a.is_default && <Star size={10} fill="currentColor" />}
                          </button>
                          <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingAgentNameId(a.id); setEditingAgentName(a.name); }} className="p-1 hover:bg-white/10 rounded text-slate-400" title="Rinomina"><Edit2 size={12} /></button>
                            {!a.is_default && <button onClick={() => deleteStrategy(a.id)} className="p-1 hover:bg-red-500/10 rounded text-red-400" title="Elimina strategia"><Trash2 size={12} /></button>}
                          </div>
                        </>
                      )}
                    </div>
                  ))}</div>
               </div>
               <div className="flex-1 p-12 flex flex-col text-left">
                  {activeAgent && <div className="h-full flex flex-col animate-in fade-in"><div className="flex items-center justify-between mb-6"><div><h3 className="text-xl font-black">{activeAgent.name}</h3><button onClick={() => setDefaultStrategy(activeAgent.id)} className="text-[8px] font-black uppercase text-slate-500">Set as Engine</button></div><button onClick={saveAgentContent} className="accent-btn px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest"><Save size={16} /> Update</button></div><textarea className="flex-1 bg-slate-950 rounded-3xl p-8 font-mono text-sm text-purple-200/60 outline-none resize-none border border-white/5" value={activeAgent.content} onChange={(e) => setAgents(agents.map(a => a.id === activeAgentId ? { ...a, content: e.target.value } : a))} /></div>}
               </div>
            </div>
          ) : activeTab === 'reader' ? (
            <div className={cn("flex flex-col overflow-hidden", standalone ? "h-full" : "glass rounded-[3rem] h-[calc(100vh-14rem)]")}>

              {/* ── Toolbar ────────────────────────────────────────────────────── */}
              <div className="h-11 border-b border-slate-500/10 px-4 flex items-center justify-between shrink-0 bg-white/5 backdrop-blur gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  {standalone && <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 hover:text-slate-700 transition-all text-[10px] font-black uppercase tracking-widest shrink-0"><ChevronLeft size={12} />Dashboard</button>}
                  <FileText size={13} className="text-slate-500 shrink-0" />
                  <span className="text-xs font-bold truncate text-slate-400">{activeBlueprintTitle || 'Nessun file selezionato'}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={exportToPdf} className="p-1.5 hover:bg-slate-500/10 rounded-lg text-slate-500 hover:text-white transition-colors" title="Esporta PDF"><Printer size={15} /></button>
                  {user?.role === 'admin' && (
                    <>
                      <button onClick={saveBlueprint} disabled={!activeBlueprintId} className="p-1.5 hover:bg-[#A100FF]/10 rounded-lg text-slate-500 hover:text-[#A100FF] transition-colors disabled:opacity-30" title="Salva"><Save size={15} /></button>
                      <button onClick={() => activeBlueprintId && deleteBlueprint(activeBlueprintId)} disabled={!activeBlueprintId} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30" title="Elimina"><Trash2 size={15} /></button>
                    </>
                  )}
                  <button onClick={toggleReaderFullscreen} className="p-1.5 hover:bg-slate-500/10 rounded-lg text-slate-500 hover:text-white transition-colors" title={isReaderFullscreen ? 'Esci fullscreen' : 'Fullscreen'}>
                    {isReaderFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                </div>
              </div>

              {/* ── 3-column body ──────────────────────────────────────────────── */}
              <div className="flex-1 flex overflow-hidden min-h-0">

                {/* Column 1 — Lista blueprint */}
                {(() => {
                  const filtered = blueprints.filter(b =>
                    (b.title || '').toLowerCase().includes(blueprintSearch.toLowerCase()) ||
                    String(b.id).includes(blueprintSearch)
                  );
                  const allSelected = filtered.length > 0 && filtered.every(b => selectedBlueprintIds.includes(b.id));
                  const someSelected = selectedBlueprintIds.length > 0;
                  return (
                    <div style={{ width: readerSidebarWidth, minWidth: 160 }} className="flex flex-col overflow-hidden shrink-0 border-r border-slate-500/10 bg-white/[0.02]">
                      {/* Header */}
                      <div className="px-3 pt-3 pb-2 shrink-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            Blueprints <span className="text-[#A100FF]">({filtered.length})</span>
                          </p>
                          <button onClick={() => fetchBlueprints()} disabled={isReloadingBlueprints} className="p-1 hover:bg-slate-500/10 rounded text-slate-500 hover:text-[#A100FF] transition-colors disabled:opacity-40">
                            <Loader2 size={12} className={isReloadingBlueprints ? 'animate-spin text-[#A100FF]' : ''} />
                          </button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={11} />
                          <input placeholder="Cerca..." className="w-full pl-7 pr-6 py-1.5 bg-slate-500/5 border-0 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-[#A100FF]/20" value={blueprintSearch} onChange={e => setBlueprintSearch(e.target.value)} />
                          {blueprintSearch && <button onClick={() => setBlueprintSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={10} /></button>}
                        </div>
                        {/* Select all + download toolbar */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => allSelected
                              ? setSelectedBlueprintIds([])
                              : setSelectedBlueprintIds(filtered.map(b => b.id))
                            }
                            className="w-3 h-3 accent-[#A100FF] cursor-pointer"
                            title="Seleziona tutti"
                          />
                          <span className="text-[9px] text-slate-500 font-bold flex-1">
                            {someSelected ? `${selectedBlueprintIds.length} sel.` : 'Seleziona tutti'}
                          </span>
                          {someSelected && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => downloadSelected('md')} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-500/10 hover:bg-[#A100FF]/20 text-[9px] font-black text-slate-400 hover:text-[#A100FF] transition-colors" title="Scarica .md zip"><Download size={10} />MD</button>
                              <button onClick={() => downloadSelected('pdf')} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-500/10 hover:bg-[#A100FF]/20 text-[9px] font-black text-slate-400 hover:text-[#A100FF] transition-colors" title="Scarica .pdf zip"><Download size={10} />PDF</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Lista */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-0.5">
                        {filtered.map(b => (
                          <div key={b.id} className="relative group/tip flex items-center gap-1.5 pr-1">
                            <input
                              type="checkbox"
                              checked={selectedBlueprintIds.includes(b.id)}
                              onChange={e => {
                                e.stopPropagation();
                                setSelectedBlueprintIds(prev =>
                                  prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id]
                                );
                              }}
                              className="w-3 h-3 accent-[#A100FF] shrink-0 cursor-pointer"
                            />
                            <button
                              onClick={() => loadBlueprint(b.id)}
                              className={cn(
                                "flex-1 flex flex-col items-start gap-0 px-2 py-1.5 rounded-lg transition-all text-left min-w-0",
                                activeBlueprintId === b.id ? "bg-[#A100FF] text-white" : "text-slate-500 hover:bg-[#A100FF]/20 hover:text-white"
                              )}
                            >
                              <span className="text-[10px] font-bold truncate w-full">{b.title || `Blueprint #${b.id}`}</span>
                              <span className={cn("text-[9px] truncate w-full", activeBlueprintId === b.id ? "text-white/60" : "text-slate-600")}>
                                #{b.id} · {b.user_creator} · {new Date(b.datetime_creation).toLocaleDateString('it-IT')}
                              </span>
                            </button>
                              </div>
                        ))}
                        {blueprints.length === 0 && <p className="text-[10px] text-slate-600 text-center py-8">Nessuna blueprint</p>}
                      </div>
                    </div>
                  );
                })()}

                {/* Drag handle 1 */}
                <div onMouseDown={startSidebarResize} className="w-1 cursor-col-resize bg-transparent hover:bg-[#A100FF]/50 active:bg-[#A100FF] transition-colors shrink-0" />

                {/* Column 2 — Editor markdown (solo admin, nascosto in fullscreen) */}
                {!isReaderFullscreen && user?.role === 'admin' && (
                  <>
                    <div style={{ width: readerEditorWidth, minWidth: 180 }} className="flex flex-col overflow-hidden shrink-0 border-r border-slate-500/10">
                      <div className="h-8 px-4 flex items-center border-b border-slate-500/10 shrink-0 bg-white/[0.02]">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Editor</p>
                      </div>
                      <textarea
                        className="flex-1 w-full p-4 font-mono text-xs outline-none resize-none overflow-y-auto custom-scrollbar"
                        style={{ background: '#ffffff', color: '#1e293b' }}
                        value={blueprintContent}
                        onChange={(e) => setBlueprintContent(e.target.value)}
                        placeholder="Markdown content..."
                      />
                    </div>
                    {/* Drag handle 2 */}
                    <div onMouseDown={startEditorResize} className="w-1 cursor-col-resize bg-transparent hover:bg-[#A100FF]/50 active:bg-[#A100FF] transition-colors shrink-0" />
                  </>
                )}

                {/* Column 3 — Preview */}
                <div className="flex-1 overflow-y-auto custom-scrollbar min-w-0 bg-white">
                  {blueprintContent ? (
                    <div ref={previewRef} className="px-10 py-8 max-w-4xl mx-auto">
                      <div className="markdown-body">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath, remarkFrontmatter, [remarkWikiLink, { pageResolver: (name) => [name] }], remarkDeflist, [remarkToc, { heading: 'indice', tight: true }]]}
                          rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeHighlight, rehypeKatex, rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]}
                          components={{
                            a({ node, children, href, ...props }) {
                              return <a href={href} className="text-[#0969da] hover:underline" {...props}>{children}</a>;
                            },
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              if (!inline && match && match[1] === 'mermaid') return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                              if (!inline && match && match[1] === 'geojson') return <GeoMap data={String(children).replace(/\n$/, '')} />;
                              return <code className={className} {...props}>{children}</code>;
                            },
                            blockquote({ children }) {
                              const firstChild = children[0];
                              if (firstChild && firstChild.props && firstChild.props.children) {
                                const text = firstChild.props.children[0];
                                if (typeof text === 'string') {
                                  const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
                                  if (match) {
                                    const type = match[1].toUpperCase();
                                    const colors = { NOTE: 'border-blue-500 bg-blue-50', TIP: 'border-green-500 bg-green-50', IMPORTANT: 'border-purple-500 bg-purple-50', WARNING: 'border-orange-500 bg-orange-50', CAUTION: 'border-red-500 bg-red-50' };
                                    return <div className={cn("border-l-4 p-4 my-4 rounded-r-lg", colors[type])}><p className="font-bold text-[10px] mb-1">{type}</p>{children}</div>;
                                  }
                                }
                              }
                              return <blockquote className="border-l-4 border-slate-300 pl-4 italic my-4">{children}</blockquote>;
                            }
                          }}
                        >{blueprintContent}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                      <BookOpen size={40} className="opacity-20" />
                      <p className="text-sm font-bold opacity-50">Seleziona una blueprint dalla lista</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className={cn("glass rounded-[3rem] flex overflow-hidden", standalone ? "h-screen" : "h-[calc(100vh-14rem)]")}>
               <div className="w-64 border-r border-slate-500/10 p-8 flex flex-col gap-2 shrink-0">
                  {standalone && <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 px-3 py-2 mb-4 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 hover:text-slate-700 transition-all text-xs font-black uppercase tracking-widest w-full"><ChevronLeft size={14} />Dashboard</button>}
                  {['engine', 'users', 'logs'].map(c => (
                    <button key={c} onClick={() => { setSettingsCategory(c); if (c === 'users') fetchUsers(); }} className={cn("w-full px-4 py-3 rounded-xl font-bold text-xs transition-all text-left uppercase tracking-widest", settingsCategory === c ? "bg-[#A100FF]/10 text-[#A100FF]" : "text-slate-500 hover:bg-slate-500/5")}>{c}</button>
                  ))}
               </div>
               <div className="flex-1 p-12 overflow-y-auto custom-scrollbar text-left">
                  {settingsCategory === 'engine' ? (
                    <div className="space-y-6">
                       <h3 className="text-xl font-black">Execution Engine</h3>
                       <p className="text-xs text-slate-500">Seleziona il motore AI per la generazione dei blueprint. L'output viene sempre salvato nella cartella <span className="font-mono text-[#A100FF]">Output/</span>.</p>
                       {/* Engine selector */}
                       <div className="grid grid-cols-2 gap-4">
                         {[{ id: 'gemini', label: 'Gemini CLI', desc: 'Google Gemini via API Key' }, { id: 'claude', label: 'Claude CLI', desc: 'Anthropic Claude via CLI locale' }].map(e => (
                           <button key={e.id} onClick={() => { setEngineSettings(s => ({ ...s, engine_type: e.id })); setEngineTestStatus(null); }} className={cn("p-5 rounded-2xl border-2 text-left transition-all", engineSettings.engine_type === e.id ? "border-[#A100FF] bg-[#A100FF]/10" : "border-white/5 glass hover:border-white/20")}>
                             <p className={cn("font-black text-sm mb-1", engineSettings.engine_type === e.id ? "text-[#A100FF]" : "")}>{e.label}</p>
                             <p className="text-[10px] text-slate-500">{e.desc}</p>
                           </button>
                         ))}
                       </div>
                       {/* Model input */}
                       <div className="p-6 glass rounded-2xl space-y-4">
                         {engineSettings.engine_type === 'gemini' ? (
                           <>
                             <div>
                               <p className="font-bold text-sm mb-2">Gemini Model</p>
                               <input className="w-full bg-slate-500/5 border-0 rounded-xl px-4 py-3 text-xs font-mono outline-none" placeholder="gemini-2.5-flash" value={engineSettings.gemini_model} onChange={e => setEngineSettings(s => ({ ...s, gemini_model: e.target.value }))} />
                               <p className="text-[10px] text-slate-500 mt-2">Passato come <span className="font-mono">GEMINI_MODEL</span> env al CLI. es: gemini-2.5-flash, gemini-2.5-pro</p>
                             </div>
                             <div className="border-t border-white/5 pt-4">
                               <p className="font-bold text-sm mb-2">Timeout (secondi)</p>
                               <input type="number" min="10" max="600" className="w-full bg-slate-500/5 border-0 rounded-xl px-4 py-3 text-xs font-mono outline-none" placeholder="90" value={engineSettings.gemini_timeout} onChange={e => setEngineSettings(s => ({ ...s, gemini_timeout: e.target.value }))} />
                               <p className="text-[10px] text-slate-500 mt-2">Tempo massimo per ogni blueprint. Default: 90s.</p>
                             </div>
                             <div className="border-t border-white/5 pt-4">
                               <div className="flex items-center gap-3 mb-2"><Lock size={14} className="text-[#A100FF]" /><p className="font-bold text-sm">Gemini API Key</p></div>
                               <input type="password" placeholder="GEMINI_API_KEY..." className="w-full bg-slate-500/5 border-0 rounded-xl px-4 py-3 text-xs font-mono outline-none" value={apiKey} onChange={(e) => { setApiKey(e.target.value); localStorage.setItem('GEMINI_API_KEY', e.target.value); }} />
                               <p className="text-[10px] text-slate-500 mt-2">Salvata in locale, usata come <span className="font-mono">GEMINI_API_KEY</span> nelle chiamate CLI.</p>
                             </div>
                           </>
                         ) : (
                           <>
                             <div>
                               <p className="font-bold text-sm mb-2">Claude Model</p>
                               <input className="w-full bg-slate-500/5 border-0 rounded-xl px-4 py-3 text-xs font-mono outline-none" placeholder="sonnet" value={engineSettings.claude_model} onChange={e => setEngineSettings(s => ({ ...s, claude_model: e.target.value }))} />
                               <p className="text-[10px] text-slate-500 mt-2">Passato come <span className="font-mono">--model</span> al CLI. es: sonnet, opus, haiku</p>
                             </div>
                             <div className="border-t border-white/5 pt-4">
                               <p className="font-bold text-sm mb-2">Timeout (secondi)</p>
                               <input type="number" min="10" max="3600" className="w-full bg-slate-500/5 border-0 rounded-xl px-4 py-3 text-xs font-mono outline-none" placeholder="360" value={engineSettings.claude_timeout} onChange={e => setEngineSettings(s => ({ ...s, claude_timeout: e.target.value }))} />
                               <p className="text-[10px] text-slate-500 mt-2">Tempo massimo per ogni blueprint. Default: 360s.</p>
                             </div>
                           </>
                         )}
                       </div>
                       <button onClick={() => saveEngineSettings(engineSettings)} className="accent-btn px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest w-full"><Save size={14} className="inline mr-2" />Save Engine Config</button>
                       <button onClick={testEngine} disabled={engineTestStatus?.testing} className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-[#A100FF]/30 text-[#A100FF] hover:bg-[#A100FF]/10 transition-all disabled:opacity-40">
                         {engineTestStatus?.testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                         {engineTestStatus?.testing ? 'Testing...' : 'Test Engine'}
                       </button>
                       {engineTestStatus && !engineTestStatus.testing && (
                         <div className={cn("p-4 rounded-xl text-xs font-mono border", engineTestStatus.success ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                           <div className="flex items-center gap-2 mb-1">
                             {engineTestStatus.success ? <Check size={13} /> : <X size={13} />}
                             <span className="font-black">{engineTestStatus.success ? `Engine OK — ${(engineTestStatus.durationMs/1000).toFixed(2)}s` : 'Engine Error'}</span>
                           </div>
                           {engineTestStatus.success && engineTestStatus.output && (
                             <p className="text-[10px] opacity-70 mt-1">Response: {engineTestStatus.output.slice(0, 120)}</p>
                           )}
                           {!engineTestStatus.success && engineTestStatus.message && (
                             <p className="text-[10px] opacity-70 mt-1 whitespace-pre-wrap break-all">{engineTestStatus.message.slice(0, 300)}</p>
                           )}
                         </div>
                       )}
                    </div>
                  ) : settingsCategory === 'users' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black">Gestione Utenti</h3>
                          <p className="text-xs text-slate-500 mt-1">Gestisci gli account con accesso all'applicazione.</p>
                        </div>
                        <button
                          onClick={() => setShowNewUserForm(f => !f)}
                          className="accent-btn px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                          <Plus size={13} />Nuovo utente
                        </button>
                      </div>

                      {/* New user form */}
                      {showNewUserForm && (
                        <div className="p-6 glass rounded-2xl space-y-4 border border-[#A100FF]/20">
                          <p className="text-xs font-black uppercase tracking-widest text-[#A100FF]">Nuovo Utente</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 mb-1.5">Username</p>
                              <input
                                className="w-full bg-slate-500/5 border-0 rounded-xl px-3 py-2.5 text-xs font-mono outline-none"
                                placeholder="username"
                                value={newUser.username}
                                onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                              />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 mb-1.5">Password</p>
                              <input
                                type="password"
                                className="w-full bg-slate-500/5 border-0 rounded-xl px-3 py-2.5 text-xs font-mono outline-none"
                                placeholder="password"
                                value={newUser.password}
                                onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                              />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 mb-1.5">Ruolo</p>
                              <select
                                className="w-full bg-slate-500/5 border-0 rounded-xl px-3 py-2.5 text-xs font-mono outline-none"
                                value={newUser.role}
                                onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                              >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={createUser} className="accent-btn px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5"><Check size={12} />Crea</button>
                            <button onClick={() => { setShowNewUserForm(false); setNewUser({ username: '', password: '', role: 'user' }); }} className="px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-500/10 transition-colors flex items-center gap-1.5"><X size={12} />Annulla</button>
                          </div>
                        </div>
                      )}

                      {/* Users list */}
                      <div className="space-y-2">
                        {users.map(u => (
                          <div key={u.id} className="p-4 glass rounded-2xl">
                            {editingUserId === u.id ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <span className="font-black text-sm">{u.username}</span>
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400">ID {u.id}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-500 mb-1.5">Nuova Password (lascia vuoto per non cambiare)</p>
                                    <input
                                      type="password"
                                      className="w-full bg-slate-500/5 border-0 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                                      placeholder="nuova password..."
                                      value={editingUserData.password}
                                      onChange={e => setEditingUserData(d => ({ ...d, password: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-500 mb-1.5">Ruolo</p>
                                    <select
                                      className="w-full bg-slate-500/5 border-0 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                                      value={editingUserData.role}
                                      onChange={e => setEditingUserData(d => ({ ...d, role: e.target.value }))}
                                    >
                                      <option value="user">user</option>
                                      <option value="admin">admin</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => updateUser(u.id)} className="accent-btn px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1"><Check size={11} />Salva</button>
                                  <button onClick={() => setEditingUserId(null)} className="px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-500/10 transition-colors flex items-center gap-1"><X size={11} />Annulla</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-xl bg-[#A100FF]/10 flex items-center justify-center text-[#A100FF] font-black text-xs shrink-0">
                                  {u.username[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm">{u.username}</span>
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: u.role === 'admin' ? 'rgba(161,0,255,0.15)' : 'rgba(100,116,139,0.15)', color: u.role === 'admin' ? '#A100FF' : '#94a3b8' }}>
                                      {u.role}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500">ID {u.id}</p>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <button
                                    onClick={() => { setEditingUserId(u.id); setEditingUserData({ password: '', role: u.role }); }}
                                    className="p-2 hover:bg-slate-500/10 rounded-lg text-slate-500 hover:text-white transition-colors"
                                    title="Modifica"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => forceLogoutUser(u.id, u.username)}
                                    className="p-2 hover:bg-orange-500/10 rounded-lg text-slate-500 hover:text-orange-400 transition-colors"
                                    title="Force logout — invalida tutte le sessioni attive"
                                  >
                                    <LogOut size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteUser(u.id, u.username)}
                                    disabled={u.username === 'admin'}
                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={u.username === 'admin' ? 'Non puoi eliminare l\'admin' : 'Elimina'}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {users.length === 0 && (
                          <p className="text-xs text-slate-500 text-center py-4">Nessun utente trovato</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const logJob = buildJobs.find(j => j.localId === logViewJobId) || [...buildJobs].reverse()[0] || null;
                      const LOG_COLORS = { info: 'text-slate-400', warn: 'text-orange-400', error: 'text-red-400', stdout: 'text-emerald-400', stderr: 'text-yellow-400', cmd: 'text-[#A100FF]' };
                      const LOG_BADGES = { info: 'bg-slate-700 text-slate-300', warn: 'bg-orange-500/20 text-orange-400', error: 'bg-red-500/20 text-red-400', stdout: 'bg-emerald-500/10 text-emerald-400', stderr: 'bg-yellow-500/10 text-yellow-400', cmd: 'bg-[#A100FF]/10 text-[#A100FF]' };
                      return (
                        <div className="h-full flex gap-4 min-h-0">
                          {/* ── Job list ── */}
                          <div className="w-48 shrink-0 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Build Jobs</p>
                            {buildJobs.length === 0 && <p className="text-[10px] text-slate-600">Nessuna build</p>}
                            {[...buildJobs].reverse().map(j => (
                              <button key={j.localId} onClick={() => setLogViewJobId(j.localId)}
                                className={cn("w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all", (logJob?.localId === j.localId) ? "bg-[#A100FF]/15 text-[#A100FF] border border-[#A100FF]/20" : "text-slate-500 hover:bg-slate-500/5")}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="font-black">#{j.num}</span>
                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", j.status === 'running' || j.status === 'connecting' ? "bg-[#A100FF] animate-pulse" : j.status === 'done' ? "bg-green-400" : j.status === 'cancelled' ? "bg-slate-500" : "bg-red-400")} />
                                </div>
                                <div className="text-[9px] opacity-60">{j.startedAt.toLocaleTimeString()}</div>
                                <div className="text-[9px] font-mono opacity-50">{j.engine} · {j.total} items</div>
                                <div className="text-[9px] mt-0.5 font-black">{j.debugLogs.length} log lines</div>
                              </button>
                            ))}
                          </div>
                          {/* ── Terminal log ── */}
                          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-950 rounded-2xl border border-white/5 overflow-hidden">
                            {logJob ? (
                              <>
                                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 shrink-0">
                                  <Terminal size={12} className="text-[#A100FF]" />
                                  <span className="text-[10px] font-black text-slate-300">Build #{logJob.num} — {logJob.engine}</span>
                                  <span className="text-[9px] text-slate-600">{logJob.startedAt.toLocaleTimeString()}</span>
                                  <span className="text-[9px] text-slate-600 ml-auto">{logJob.debugLogs.length} entries</span>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 font-mono text-[10px] space-y-0.5"
                                  ref={el => { if (el && logJob.status !== 'done') el.scrollTop = el.scrollHeight; }}>
                                  {logJob.debugLogs.length === 0 && <p className="text-slate-600 italic">In attesa di log...</p>}
                                  {logJob.debugLogs.map((entry, i) => {
                                    const d = new Date(entry.t);
                                    const ts = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(d.getMilliseconds()).padStart(3,'0')}`;
                                    const isMultiline = entry.msg.includes('\n');
                                    return (
                                      <div key={i} className={cn("flex gap-2 leading-relaxed", isMultiline ? "flex-col" : "")}>
                                        <div className="flex gap-2 shrink-0">
                                          <span className="text-slate-600 shrink-0 select-none">{ts}</span>
                                          <span className={cn("shrink-0 px-1 rounded text-[8px] font-black uppercase self-start", LOG_BADGES[entry.level] || LOG_BADGES.info)}>{entry.level}</span>
                                          {!isMultiline && <span className={cn("break-all", LOG_COLORS[entry.level] || LOG_COLORS.info)}>{entry.msg}</span>}
                                        </div>
                                        {isMultiline && (
                                          <pre className={cn("whitespace-pre-wrap break-all ml-0 pl-2 border-l border-white/5 text-[9px]", LOG_COLORS[entry.level] || LOG_COLORS.info)}>{entry.msg}</pre>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Seleziona un job dalla lista</div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
