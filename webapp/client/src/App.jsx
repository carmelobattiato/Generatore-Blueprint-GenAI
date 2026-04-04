import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// --- Styles ---
import 'katex/dist/katex.min.css';
import 'leaflet/dist/leaflet.css';

import { 
  LayoutDashboard, FileCode, Play, Plus, Trash2, 
  Edit, Check, X, Search, Activity, Loader2, 
  ChevronRight, Save, Database, ShieldCheck,
  CheckCircle, AlertTriangle, Command, Sparkles,
  Zap, Globe, Settings, Moon, Sun, Lock, Terminal,
  Download, History, Trash, Star, MoreVertical,
  Edit2, BookOpen, Printer, Maximize2, Minimize2,
  ChevronLeft, FileText, Info, Lightbulb, AlertOctagon, MapPin
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

const API_BASE = 'http://localhost:5000/api';

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

export default function App() {
  const [csvData, setCsvData] = useState([]);
  const [agents, setAgents] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'editor', 'reader', 'settings'
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [activeBlueprintName, setActiveBlueprintName] = useState(null);
  const [blueprintContent, setBlueprintContent] = useState('');
  
  const [editingAgentNameId, setEditingAgentNameId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [settingsCategory, setSettingsCategory] = useState('general');
  const [editingRow, setEditingRow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [log, setLog] = useState('');
  const [logHistory, setLogHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('THEME') !== 'light');
  const [isReaderFullscreen, setIsReaderFullscreen] = useState(false);

  const previewRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle('light-theme', !darkMode);
    localStorage.setItem('THEME', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    try {
      const [csv, agentsRes, blueprintsRes] = await Promise.all([
        axios.get(`${API_BASE}/csv`),
        axios.get(`${API_BASE}/agents`),
        axios.get(`${API_BASE}/blueprints`)
      ]);
      setCsvData(csv.data);
      setAgents(agentsRes.data);
      setBlueprints(blueprintsRes.data);
      if (agentsRes.data.length > 0) {
        const def = agentsRes.data.find(a => a.is_default) || agentsRes.data[0];
        setActiveAgentId(def.id);
      }
    } catch (e) { showToast('Sync failed', 'error'); }
    finally { setTimeout(() => setIsLoading(false), 1200); }
  };

  useEffect(() => { fetchData(); }, []);

  const loadBlueprint = async (name) => {
    try {
      const res = await axios.get(`${API_BASE}/blueprints/${name}`);
      setActiveBlueprintName(name);
      setBlueprintContent(res.content || res.data.content);
    } catch (e) { showToast('Error loading file', 'error'); }
  };

  const saveBlueprint = async () => {
    if (!activeBlueprintName) return;
    try {
      await axios.post(`${API_BASE}/blueprints/${activeBlueprintName}`, { content: blueprintContent });
      showToast('Blueprint salvato');
    } catch (e) { showToast('Error saving', 'error'); }
  };

  const deleteBlueprint = async (name) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await axios.delete(`${API_BASE}/blueprints/${name}`);
      const res = await axios.get(`${API_BASE}/blueprints`);
      setBlueprints(res.data);
      if (activeBlueprintName === name) { setActiveBlueprintName(null); setBlueprintContent(''); }
      showToast('File eliminato');
    } catch (e) { showToast('Error deleting', 'error'); }
  };

  const exportToPdf = () => {
    if (!previewRef.current) return;
    
    const element = previewRef.current;
    const filename = activeBlueprintName ? activeBlueprintName.replace('.md', '.pdf') : 'documento.pdf';
    
    const opt = {
      margin: 15,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
        scrollY: 0,
        scrollX: 0,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    return html2pdf().set(opt).from(element).save();
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

  const runEngine = async () => {
    if (selectedIds.length === 0) return showToast('Seleziona use case', 'error');
    if (!apiKey) return showToast('API Key missing', 'error');
    setIsRunning(true);
    const msg = `>>> [${new Date().toLocaleTimeString()}] Build Started...`;
    setLog(msg);
    try {
      const res = await axios.post(`${API_BASE}/run`, { ids: selectedIds, apiKey });
      setLog(res.data.output);
      showToast('Build completata');
      const blRes = await axios.get(`${API_BASE}/blueprints`); setBlueprints(blRes.data);
    } catch (e) { setLog('ERROR: ' + e.message); }
    finally { setIsRunning(false); }
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
    <div className="min-h-screen flex p-6 gap-6 h-screen overflow-hidden transition-colors duration-500">
      <AnimatePresence>{toast && <Toast {...toast} onClose={() => setToast(null)} />}</AnimatePresence>

      <aside className="w-80 glass rounded-[2.5rem] flex flex-col p-8 shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 accent-btn rounded-2xl flex items-center justify-center"><Zap size={24} /></div>
          <div className="text-left">
            <h1 className="text-xl font-black tracking-tighter italic">BlueprintAI</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Developed by Carmelo Battiato v3.0</p>
          </div>
        </div>
        <div className="space-y-3 flex-1">
          <SidebarItem active={activeTab === 'dashboard'} icon={LayoutDashboard} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
          <SidebarItem active={activeTab === 'editor'} icon={FileCode} label="Engine Config" onClick={() => setActiveTab('editor')} />
          <SidebarItem active={activeTab === 'reader'} icon={BookOpen} label="Blueprint Reader" onClick={() => setActiveTab('reader')} />
          <SidebarItem active={activeTab === 'settings'} icon={Settings} label="Settings" onClick={() => setActiveTab('settings')} />
        </div>
        <div className="px-5 py-4 glass-dark rounded-2xl mb-4">
          <div className="flex items-center gap-3 mb-2"><div className={cn("w-2 h-2 rounded-full", apiKey ? "bg-green-400 shadow-[0_0_10px_#4ade80]" : "bg-red-400")} /><span className="text-[10px] font-black uppercase opacity-60 text-white">Engine Status</span></div>
          <p className="text-[9px] font-bold text-slate-500 leading-tight">Gemini CLI is ready.</p>
        </div>
        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">© 2026 Developed by Carmelo Battiato</p>
      </aside>

      <main className="flex-1 flex flex-col gap-6 overflow-hidden text-left">
        <header className="glass h-24 rounded-[2.5rem] px-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4"><Command className="text-slate-500" size={18} /><div><h2 className="text-sm font-black uppercase tracking-widest leading-none">{activeTab}</h2><p className="text-xs text-slate-500 font-medium mt-1">Intelligence Layer v3</p></div></div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={runEngine} disabled={isRunning || selectedIds.length === 0} className="accent-btn h-12 px-8 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest disabled:opacity-30 cursor-pointer">{isRunning ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}Build Blueprint</motion.button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
          {activeTab === 'dashboard' ? (
            <div className="space-y-6 pb-10">
              <div className="grid grid-cols-4 gap-6">
                <div className="glass p-6 rounded-[2rem] h-40 flex flex-col justify-between"><Database className="text-blue-500" /><p className="text-2xl font-black">{csvData.length} Assets</p></div>
                <div className="glass p-6 rounded-[2rem] h-40 flex flex-col justify-between"><CheckCircle className="text-purple-500" /><p className="text-2xl font-black">{selectedIds.length} Selected</p></div>
                <div className="glass p-6 rounded-[2rem] h-40 flex flex-col justify-between"><BookOpen className="text-green-500" /><p className="text-2xl font-black">{blueprints.length} Files</p></div>
                <div className="glass p-6 rounded-[2rem] h-40 flex flex-col justify-between"><ShieldCheck className="text-orange-500" /><p className="text-2xl font-black">100% Secure</p></div>
              </div>
              <div className="glass rounded-[3rem] p-10">
                <div className="flex items-center justify-between mb-10 text-left"><div className="w-full max-w-sm relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input placeholder="Filter assets..." className="w-full pl-12 pr-4 py-3 bg-slate-500/5 border-0 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-purple-500/20 outline-none" value={search} onChange={(e) => setSearch(e.target.value)} /></div><button onClick={() => { const nextId = (Math.max(...csvData.map(r => parseInt(r.ID)), 0) + 1).toString().padStart(2, '0'); setCsvData([{ ID: nextId, Categoria: 'T&A', 'Titolo Attività': 'New', 'Descrizione Dettagliata': '...', 'Gruppo o Ruolo': 'Admin' }, ...csvData]); setEditingRow(nextId); }} className="accent-btn px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer">New Asset</button></div>
                <div className="space-y-3">{filteredData.map(row => (
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
            <div className="glass rounded-[3rem] h-[calc(100vh-14rem)] flex overflow-hidden">
               <div className="w-72 border-r border-slate-500/10 p-8 flex flex-col gap-2 shrink-0">
                  <div className="flex items-center justify-between mb-6"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Strategies</p><button onClick={async () => { const res = await axios.post(`${API_BASE}/agents`, { name: `New Strategy ${agents.length + 1}` }); const n = await axios.get(`${API_BASE}/agents`); setAgents(n.data); setActiveAgentId(res.data.id); }} className="p-1.5 bg-[#A100FF]/10 text-[#A100FF] rounded-lg"><Plus size={14} /></button></div>
                  <div className="space-y-1 overflow-y-auto custom-scrollbar">{agents.map(a => (
                    <button key={a.id} onClick={() => setActiveAgentId(a.id)} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all", activeAgentId === a.id ? "bg-[#A100FF] text-white" : "text-slate-500 hover:bg-slate-500/5")}>
                      <span className="truncate">{a.name}</span>{a.is_default && <Star size={10} fill="currentColor" />}
                    </button>
                  ))}</div>
               </div>
               <div className="flex-1 p-12 flex flex-col text-left">
                  {activeAgent && <div className="h-full flex flex-col animate-in fade-in"><div className="flex items-center justify-between mb-6"><div><h3 className="text-xl font-black">{activeAgent.name}</h3><button onClick={() => setDefaultStrategy(activeAgent.id)} className="text-[8px] font-black uppercase text-slate-500">Set as Engine</button></div><button onClick={saveAgentContent} className="accent-btn px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest"><Save size={16} /> Update</button></div><textarea className="flex-1 bg-slate-950 rounded-3xl p-8 font-mono text-sm text-purple-200/60 outline-none resize-none border border-white/5" value={activeAgent.content} onChange={(e) => setAgents(agents.map(a => a.id === activeAgentId ? { ...a, content: e.target.value } : a))} /></div>}
               </div>
            </div>
          ) : activeTab === 'reader' ? (
            <div className="glass rounded-[3rem] h-[calc(100vh-14rem)] flex overflow-hidden">
               <div className="w-72 border-r border-slate-500/10 p-8 flex flex-col gap-2 shrink-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Built Blueprints</p>
                  <div className="space-y-1 overflow-y-auto custom-scrollbar">{blueprints.map(b => (
                    <button key={b.id} onClick={() => loadBlueprint(b.name)} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all", activeBlueprintName === b.name ? "bg-[#A100FF] text-white" : "text-slate-500 hover:bg-slate-500/5")}>
                       <div className="flex items-center gap-3 truncate"><FileText size={14} className="shrink-0" /><span className="truncate">{b.name}</span></div>
                    </button>
                  ))}</div>
               </div>
               <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="h-16 border-b border-slate-500/10 px-8 flex items-center justify-between bg-white/50 dark:bg-slate-950/50 backdrop-blur shrink-0">
                     <div className="flex items-center gap-4">
                        <button onClick={() => setIsReaderFullscreen(!isReaderFullscreen)} className="p-2 hover:bg-slate-500/5 rounded-lg text-slate-500">{isReaderFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                        <span className="text-xs font-bold truncate opacity-50">{activeBlueprintName || 'Nessun file selezionato'}</span>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={exportToPdf} className="p-2 hover:bg-slate-500/5 rounded-lg text-slate-500" title="PDF"><Printer size={16} /></button>
                        <button onClick={saveBlueprint} className="p-2 hover:bg-slate-500/5 rounded-lg text-[#A100FF]" title="Save"><Save size={16} /></button>
                        <button onClick={() => deleteBlueprint(activeBlueprintName)} className="p-2 hover:bg-red-500/5 rounded-lg text-red-500" title="Delete"><Trash2 size={16} /></button>
                     </div>
                  </div>
                  <div className={cn("flex-1 overflow-hidden", isReaderFullscreen ? "grid grid-cols-1" : "grid grid-cols-2 divide-x divide-slate-500/10")}>
                     {!isReaderFullscreen && (
                       <textarea className="h-full w-full p-8 font-mono text-sm bg-slate-500/5 dark:bg-slate-950/20 text-slate-700 dark:text-slate-400 outline-none resize-none overflow-y-auto custom-scrollbar" value={blueprintContent} onChange={(e) => setBlueprintContent(e.target.value)} placeholder="Markdown content..." />
                     )}
                     <div className="h-full overflow-y-auto p-10 bg-white dark:bg-[#020617] text-slate-900 dark:text-slate-200 custom-scrollbar">
                        <div ref={previewRef} className="p-8 min-h-full bg-white">
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
                                     return <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-4 italic my-4">{children}</blockquote>;
                                   }
                                 }}
                              >{blueprintContent}</ReactMarkdown>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="glass rounded-[3rem] h-[calc(100vh-14rem)] flex overflow-hidden">
               <div className="w-64 border-r border-slate-500/10 p-8 flex flex-col gap-2 shrink-0">
                  {['general', 'security', 'logs'].map(c => <button key={c} onClick={() => setSettingsCategory(c)} className={cn("w-full px-4 py-3 rounded-xl font-bold text-xs transition-all text-left uppercase tracking-widest", settingsCategory === c ? "bg-[#A100FF]/10 text-[#A100FF]" : "text-slate-500 hover:bg-slate-500/5")}>{c}</button>)}
               </div>
               <div className="flex-1 p-12 overflow-y-auto custom-scrollbar text-left">
                  {settingsCategory === 'general' ? (
                    <div className="space-y-6">
                       <h3 className="text-xl font-black">Preferences</h3>
                       <div className="p-6 glass rounded-2xl flex items-center justify-between"><div><p className="font-bold">Dark Mode</p><p className="text-xs text-slate-500">Inizializza interfaccia scura.</p></div><button onClick={() => setDarkMode(!darkMode)} className={cn("w-12 h-6 rounded-full p-1 flex items-center", darkMode ? "bg-[#A100FF] justify-end" : "bg-slate-300 justify-start")}><div className="w-4 h-4 bg-white rounded-full" /></button></div>
                    </div>
                  ) : settingsCategory === 'security' ? (
                    <div className="space-y-6">
                       <h3 className="text-xl font-black">Security</h3>
                       <div className="p-8 glass rounded-3xl"><div className="flex items-center gap-4 mb-6"><Lock className="text-[#A100FF]" /><p className="font-bold">API Authentication</p></div><input type="password" placeholder="GEMINI_API_KEY..." className="w-full bg-slate-500/5 border-0 rounded-2xl px-6 py-4 text-xs font-mono outline-none" value={apiKey} onChange={(e) => { setApiKey(e.target.value); localStorage.setItem('GEMINI_API_KEY', e.target.value); }} /></div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                       <h3 className="text-xl font-black mb-6">Engine Logs</h3>
                       <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar">{logHistory.map((h, i) => <div key={i} className="p-6 glass rounded-2xl font-mono text-[10px] text-slate-500 whitespace-pre-wrap">{h}</div>)}</div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
