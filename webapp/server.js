const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const { parse } = require('csv-parse/sync');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

// --- Job store (in-memory, TTL 10min) ---
const jobs = new Map();
function createJob() {
    const id = randomUUID();
    const job = { status: 'running', events: [], clients: new Set(), engine: '', children: new Set(), ids: [], titles: [], startedAt: Date.now() };
    jobs.set(id, job);
    setTimeout(() => jobs.delete(id), 10 * 60 * 1000);
    return { id, job };
}
function pushEvent(job, data) {
    job.events.push(data);
    for (const client of job.clients) {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    if (data.type === 'done' || data.type === 'error' || data.type === 'cancelled') {
        for (const client of job.clients) client.end();
        job.clients.clear();
    }
}
// level: 'info' | 'warn' | 'error' | 'stdout' | 'stderr' | 'cmd'
function pushLog(job, level, msg) {
    const entry = { type: 'debug', level, msg, t: Date.now() };
    job.events.push(entry);
    for (const client of job.clients) {
        client.write(`data: ${JSON.stringify(entry)}\n\n`);
    }
}

const app = express();
const port = 5000;

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const DB_PATH = path.join(__dirname, '..', 'database.db');
const db = new Database(DB_PATH);

// --- Inizializzazione Database ---
db.exec(`
  CREATE TABLE IF NOT EXISTS use_cases (
    id TEXT PRIMARY KEY,
    category TEXT,
    title TEXT,
    description TEXT,
    role TEXT
  );
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    content TEXT,
    is_default INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS blueprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_creator TEXT NOT NULL DEFAULT 'system',
    datetime_creation TEXT NOT NULL,
    markdown_data TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT 'Blueprint'
  );
`);

// Migrazione: aggiunta colonna is_default se non esiste (per DB vecchi)
try {
    db.prepare("SELECT is_default FROM agents LIMIT 1").get();
} catch (e) {
    if (e.message.includes("no such column")) {
        console.log("📦 Migrazione: aggiunta colonna is_default a tabella agents...");
        db.prepare("ALTER TABLE agents ADD COLUMN is_default INTEGER DEFAULT 0").run();
    }
}

// --- Logica di Migrazione e Inizializzazione ---
const initDb = () => {
    const ucCount = db.prepare('SELECT count(*) as count FROM use_cases').get().count;
    if (ucCount === 0) {
        const CSV_FILE = path.join(__dirname, '..', 'blueprint_use_cases.csv');
        if (fs.existsSync(CSV_FILE)) {
            const records = parse(fs.readFileSync(CSV_FILE, 'utf-8'), { columns: true, delimiter: ';', skip_empty_lines: true });
            const insert = db.prepare('INSERT INTO use_cases (id, category, title, description, role) VALUES (?, ?, ?, ?, ?)');
            db.transaction((recs) => { for (const r of recs) insert.run(r.ID, r.Categoria, r['Titolo Attività'], r['Descrizione Dettagliata'], r['Gruppo o Ruolo']); })(records);
        }
    }

    const agentCount = db.prepare('SELECT count(*) as count FROM agents').get().count;
    if (agentCount === 0) {
        const AGENT_FILE = path.join(__dirname, '..', 'agent_generatore_blueprint.md');
        const content = fs.existsSync(AGENT_FILE) ? fs.readFileSync(AGENT_FILE, 'utf-8') : '# Default Strategy\n\nConfigure your system prompt here.';
        db.prepare('INSERT INTO agents (name, content, is_default) VALUES (?, ?, ?)').run('Base Strategy', content, 1);
    }

    // Defaults settings (INSERT OR IGNORE = non sovrascrive valori già salvati)
    const defaults = [
        ['engine_type',    'gemini'],
        ['gemini_model',   'gemini-2.5-flash'],
        ['claude_model',   'sonnet'],
        ['gemini_timeout', '90'],
        ['claude_timeout', '360'],
    ];
    const upsertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of defaults) upsertSetting.run(k, v);

    // Crea utente admin di default se non esistono utenti
    const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
    if (userCount === 0) {
        const hash = bcrypt.hashSync('admin', 12);
        db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
        console.log('Utente admin creato con password di default "admin"');
    }

    // Migrazione one-shot: importa file .md da Output/ e Blueprint/ nel DB blueprints
    const bpCount = db.prepare('SELECT count(*) as c FROM blueprints').get().c;
    if (bpCount === 0) {
        const LEGACY_DIRS = [
            path.join(__dirname, '..', 'Output'),
            path.join(__dirname, '..', 'Blueprint'),
        ];
        const insertBp = db.prepare('INSERT INTO blueprints (user_creator, datetime_creation, markdown_data, title) VALUES (?, ?, ?, ?)');
        let imported = 0;
        for (const dir of LEGACY_DIRS) {
            if (!fs.existsSync(dir)) continue;
            for (const f of fs.readdirSync(dir)) {
                if (!f.endsWith('.md') || f.startsWith('.')) continue;
                try {
                    const content = fs.readFileSync(path.join(dir, f), 'utf-8');
                    const stat = fs.statSync(path.join(dir, f));
                    insertBp.run('system', stat.mtime.toISOString(), content, f.replace(/\.md$/, ''));
                    imported++;
                } catch {}
            }
        }
        if (imported > 0) console.log(`✅ Migrazione: ${imported} blueprint importate da file system nel DB`);
    }
};
initDb();

// --- Pulizia sessioni scadute ogni 5 minuti ---
setInterval(() => {
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}, 5 * 60 * 1000);

// --- Auth Middleware ---
const SESSION_TTL = 30 * 60 * 1000; // 30 minuti

// SSE token store in-memory (short-lived, 2 min) — usato perché EventSource non invia cookie HTTP-only
const sseTokens = new Map(); // token -> { user, expiresAt }
setInterval(() => {
    const now = Date.now();
    for (const [t, d] of sseTokens) { if (d.expiresAt < now) sseTokens.delete(t); }
}, 60_000);

function requireAuth(req, res, next) {
    // 1. Prova cookie di sessione (richieste normali)
    const cookieToken = req.cookies.session_token;
    if (cookieToken) {
        const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(cookieToken);
        if (session && session.expires_at >= Date.now()) {
            db.prepare('UPDATE sessions SET expires_at = ? WHERE token = ?').run(Date.now() + SESSION_TTL, cookieToken);
            const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(session.user_id);
            if (user) { req.user = user; return next(); }
        }
        if (session) db.prepare('DELETE FROM sessions WHERE token = ?').run(cookieToken);
    }

    // 2. Prova SSE token (query param ?token=) — solo per EventSource
    const sseToken = req.query.token;
    if (sseToken) {
        const entry = sseTokens.get(sseToken);
        if (entry && entry.expiresAt >= Date.now()) {
            req.user = entry.user;
            return next();
        }
    }

    return res.status(401).json({ error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        next();
    });
}

// Endpoint per ottenere un token SSE short-lived (2 min) — usato dal client per autenticare EventSource
app.get('/api/auth/sse-token', requireAuth, (req, res) => {
    const token = randomUUID();
    sseTokens.set(token, { user: req.user, expiresAt: Date.now() + 2 * 60 * 1000 });
    res.json({ token });
});

// --- AUTH ENDPOINTS (no auth required) ---

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username e password richiesti' });

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) return res.status(401).json({ error: 'Credenziali non valide' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Credenziali non valide' });

        const token = randomUUID();
        db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, Date.now() + SESSION_TTL);

        res.cookie('session_token', token, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: SESSION_TTL,
        });

        res.json({ user: { id: user.id, username: user.username, role: user.role } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/logout', (req, res) => {
    const token = req.cookies.session_token;
    if (token) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        res.clearCookie('session_token');
    }
    res.json({ ok: true });
});

// GET /api/auth/logout — force-logout via redirect (usabile anche da browser direttamente)
app.get('/api/auth/logout', (req, res) => {
    const token = req.cookies.session_token;
    if (token) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        res.clearCookie('session_token');
    }
    res.redirect('/login');
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// --- USER MANAGEMENT ENDPOINTS (admin only) ---

app.get('/api/users', requireAdmin, (req, res) => {
    try {
        const users = db.prepare('SELECT id, username, role FROM users ORDER BY id ASC').all();
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', requireAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) return res.status(400).json({ error: 'username, password e role richiesti' });
        if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Role non valido' });

        const hash = await bcrypt.hash(password, 12);
        const info = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
        res.json({ id: Number(info.lastInsertRowid), username, role });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username già esistente' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { password, role } = req.body;

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'Utente non trovato' });

        if (password) {
            const hash = await bcrypt.hash(password, 12);
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
        }
        if (role) {
            if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Role non valido' });
            db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
        }

        const updated = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id);
        res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Force-logout: invalida tutte le sessioni attive di un utente senza eliminarlo
app.post('/api/users/:id/logout', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'Utente non trovato' });
        const result = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
        res.json({ ok: true, sessionsDeleted: result.changes });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'Utente non trovato' });
        if (user.username === 'admin') return res.status(403).json({ error: 'Impossibile eliminare l\'utente admin' });

        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS USE CASES ---
app.get('/api/csv', requireAdmin, (req, res) => {
    try {
        const rows = db.prepare('SELECT id as ID, category as Categoria, title as "Titolo Attività", description as "Descrizione Dettagliata", role as "Gruppo o Ruolo" FROM use_cases ORDER BY id ASC').all();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/csv', requireAdmin, (req, res) => {
    try {
        const sync = db.transaction((data) => {
            db.prepare('DELETE FROM use_cases').run();
            const insert = db.prepare('INSERT INTO use_cases (id, category, title, description, role) VALUES (?, ?, ?, ?, ?)');
            for (const r of data) insert.run(r.ID, r.Categoria, r['Titolo Attività'], r['Descrizione Dettagliata'], r['Gruppo o Ruolo']);
        });
        sync(req.body);
        res.json({ message: 'OK' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CREA SINGOLO USECASE ---
app.post('/api/usecases', requireAuth, (req, res) => {
    try {
        const { description, title, category } = req.body;
        if (!description) return res.status(400).json({ error: 'description required' });

        // Genera ID sequenziale (max ID puramente numerico esistente + 1)
        const rows = db.prepare('SELECT id FROM use_cases').all();
        const maxNumericId = rows.reduce((max, r) => {
            if (!/^\d+$/.test(r.id)) return max; // ignora UUID o ID non numerici
            const n = parseInt(r.id, 10);
            return n > max ? n : max;
        }, 0);
        const id = String(maxNumericId + 1);

        const derivedTitle = title || description.split('\n')[0].slice(0, 100) || 'Nuovo Usecase';
        const derivedCategory = category || 'Custom';
        db.prepare('INSERT INTO use_cases (id, category, title, description, role) VALUES (?, ?, ?, ?, ?)')
          .run(id, derivedCategory, derivedTitle, description, '');
        res.json({ id, title: derivedTitle, category: derivedCategory });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS SETTINGS ---
app.get('/api/settings', requireAdmin, (req, res) => {
    try {
        const rows = db.prepare('SELECT key, value FROM settings').all();
        res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', requireAdmin, (req, res) => {
    const allowed = ['engine_type', 'gemini_model', 'claude_model', 'gemini_timeout', 'claude_timeout'];
    try {
        const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(req.body)) {
            if (allowed.includes(key)) upsert.run(key, String(value));
        }
        res.json({ message: 'OK' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- TEST ENGINE ---
app.post('/api/test-engine', requireAdmin, (req, res) => {
    const { apiKey } = req.body || {};
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const cfg = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
    const engineType  = cfg.engine_type  || 'gemini';
    const geminiModel = cfg.gemini_model || 'gemini-2.5-flash';
    const claudeModel = cfg.claude_model || 'sonnet';
    const TIMEOUT_MS  = 30_000;
    const testPrompt  = 'Respond with exactly one word: OK';

    const t0 = Date.now();
    let stdout = '', stderr = '', timedOut = false;
    let child;

    try {
        if (engineType === 'claude') {
            child = spawn('claude', [
                '--print', '--output-format', 'text',
                '--model', claudeModel,
                '--no-session-persistence',
                testPrompt
            ], { env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] });
        } else {
            child = spawn('gemini', [
                '-p', testPrompt, '--yolo', '--output-format', 'text'
            ], {
                env: { ...process.env, GEMINI_API_KEY: apiKey || process.env.GEMINI_API_KEY, GEMINI_MODEL: geminiModel },
                stdio: ['pipe', 'pipe', 'pipe']
            });
            if (child.stdin) { child.stdin.write(testPrompt); child.stdin.end(); }
        }
    } catch (err) {
        return res.json({ success: false, error: `Spawn failed: ${err.message}`, durationMs: Date.now() - t0 });
    }

    const timer = setTimeout(() => {
        timedOut = true;
        try { child.kill('SIGTERM'); } catch {}
    }, TIMEOUT_MS);

    if (child.stdout) child.stdout.on('data', d => { stdout += d.toString(); });
    if (child.stderr) child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('error', (err) => {
        clearTimeout(timer);
        res.json({ success: false, error: `Process error: ${err.message}`, durationMs: Date.now() - t0 });
    });

    child.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - t0;
        if (timedOut) return res.json({ success: false, error: `Timeout dopo ${TIMEOUT_MS/1000}s`, durationMs });
        if (code === 0 && stdout.trim()) return res.json({ success: true, output: stdout.trim().slice(0, 300), durationMs });
        const errMsg = stderr.trim().slice(0, 300) || `Exit code ${code}`;
        res.json({ success: false, error: errMsg, durationMs });
    });
});

// --- ENDPOINTS AGENTS (STRATEGIES) ---
app.get('/api/agents', requireAdmin, (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM agents ORDER BY id DESC').all();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents', requireAdmin, (req, res) => {
    try {
        const { name } = req.body;
        console.log(`Creazione nuova strategia: ${name}`);
        const info = db.prepare('INSERT INTO agents (name, content, is_default) VALUES (?, ?, ?)').run(name, '# ' + name + '\n\nNew strategy prompt...', 0);
        res.json({ id: Number(info.lastInsertRowid) });
    } catch (e) {
        console.error('Errore creazione strategia:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/agents/:id/default', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        db.transaction(() => {
            db.prepare('UPDATE agents SET is_default = 0').run();
            db.prepare('UPDATE agents SET is_default = 1 WHERE id = ?').run(id);
        })();
        res.json({ message: 'Default strategy updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents/:id/name', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        db.prepare('UPDATE agents SET name = ? WHERE id = ?').run(name, id);
        res.json({ message: 'Name updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents/:id/content', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        db.prepare('UPDATE agents SET content = ? WHERE id = ?').run(content, id);
        res.json({ message: 'Saved' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/agents/:id', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const agent = db.prepare('SELECT is_default FROM agents WHERE id = ?').get(id);
        if (agent?.is_default) return res.status(400).json({ error: 'Cannot delete default strategy' });
        db.prepare('DELETE FROM agents WHERE id = ?').run(id);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- EXECUTION ENGINE ---

// Helper concorrenza con callback per item — chiama onItem non appena ogni task finisce
async function runWithConcurrency(items, limit, fn, onItem) {
    let idx = 0;
    async function worker() {
        while (idx < items.length) {
            const i = idx++;
            const result = await fn(items[i]);
            await onItem(result);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// Risolve il path di output con deduplicazione: se esiste aggiunge _2, _3, ecc.
function resolveOutputPath(id, title) {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const safeTitle = String(title || 'blueprint')
        .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
    const base = `${String(id).padStart(2, '0')}_blueprint_${safeTitle}`;
    let name = `${base}.md`;
    let counter = 2;
    while (fs.existsSync(path.join(OUTPUT_DIR, name))) {
        name = `${base}_${counter++}.md`;
    }
    return path.join(OUTPUT_DIR, name);
}

// Avvia il job in background e restituisce subito il jobId
// Accetta: { ids: [...] } per use_cases esistenti, oppure { text: "..." } per descrizione diretta
app.post('/api/run', requireAuth, (req, res) => {
    const { ids, apiKey, text } = req.body;
    if (!text && (!ids || ids.length === 0)) return res.status(400).json({ error: 'Nessun ID selezionato o testo fornito' });

    const { id: jobId, job } = createJob();
    job.ids = text ? [] : ids;
    job.creatorUsername = req.user.username;
    res.json({ jobId });

    // ── Esecuzione asincrona ──────────────────────────────────────────────────
    (async () => {
        const settingsRows = db.prepare('SELECT key, value FROM settings').all();
        const cfg = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
        const engineType    = cfg.engine_type    || 'gemini';
        const geminiModel   = cfg.gemini_model   || 'gemini-2.5-flash';
        const claudeModel   = cfg.claude_model   || 'sonnet';
        const geminiTimeout = Math.max(10, parseInt(cfg.gemini_timeout) || 90) * 1000;
        const claudeTimeout = Math.max(10, parseInt(cfg.claude_timeout) || 360) * 1000;
        job.engine = engineType.toUpperCase();

        const agentPath = path.join(__dirname, '.tmp_agent_' + jobId.slice(0, 8) + '.md');
        // Copia debug persistente — non viene cancellata, usata per riprodurre il comando da terminale
        const debugAgentPath = path.join(__dirname, '..', 'Output', `.debug_agent_${jobId.slice(0, 8)}.md`);
        const FILE_OVERRIDE = '\n\n---\nOVERRIDE MODALITÀ SCRIPT: Non usare tool e non creare file. ' +
            'Genera il blueprint completo come testo puro nella risposta. ' +
            'Il salvataggio su file è gestito dal sistema chiamante.';

        try {
            const agent = db.prepare('SELECT content FROM agents WHERE is_default = 1').get();
            if (!agent) { pushEvent(job, { type: 'error', message: 'Nessuna strategia di default trovata' }); return; }

            const fullSystemPrompt = agent.content + FILE_OVERRIDE;
            fs.writeFileSync(agentPath, fullSystemPrompt);
            if (!fs.existsSync(path.join(__dirname, '..', 'Output'))) fs.mkdirSync(path.join(__dirname, '..', 'Output'), { recursive: true });
            fs.writeFileSync(debugAgentPath, fullSystemPrompt);

            // Risolvi le righe: da DB se ids[], oppure riga virtuale se text
            let rows;
            if (text) {
                const derivedTitle = text.split('\n')[0].slice(0, 100) || 'Nuovo Usecase';
                rows = [{ id: 'custom', category: 'Custom', title: derivedTitle, description: text, role: '' }];
            } else {
                const placeholders = ids.map(() => '?').join(',');
                rows = db.prepare(`SELECT * FROM use_cases WHERE id IN (${placeholders})`).all(...ids);
            }
            job.titles = rows.map(r => r.title); // salva titles per il dashboard

            pushLog(job, 'info', `JOB START — engine: ${engineType.toUpperCase()}, items: ${rows.length}, agentFile: ${path.basename(agentPath)}`);
            pushEvent(job, { type: 'start', total: rows.length, engine: job.engine });

            // ── Helper per spawn con logging pieno ────────────────────────────
            const makeRunner = (cmd, getArgs, spawnOpts, timeoutMs, getPrompt) => (row) => new Promise((resolve) => {
                if (job.status === 'cancelled') return resolve({ id: row.id, title: row.title, stdout: '', stderr: '', exitCode: null, timedOut: false, spawnError: 'CANCELLED', durationMs: 0 });

                const prompt = getPrompt(row);
                const args = getArgs(row, prompt);
                pushEvent(job, { type: 'item_start', id: row.id, title: row.title });

                // Riga di comando compatta per leggibilità
                const displayArgs = args.map(a => {
                    if (a.length <= 80) return a;
                    return `[${a.length}b]`;
                });
                pushLog(job, 'cmd', `[${row.id}] $ ${cmd} ${displayArgs.join(' ')}`);
                pushLog(job, 'info', `[${row.id}] timeout: ${timeoutMs/1000}s`);
                // Comando bash completo e copiabile — system-prompt via file, prompt inline
                const shellPrompt = prompt.replace(/'/g, "'\\''");
                pushLog(job, 'cmd', `[${row.id}] COPY & RUN:\n${cmd} --print --output-format text --system-prompt "$(cat '${debugAgentPath}')" --model ${spawnOpts.env?.GEMINI_MODEL || 'sonnet'} --tools '' --no-session-persistence --strict-mcp-config '${shellPrompt}'`);
                pushLog(job, 'info', `[${row.id}] PROMPT (${prompt.length} chars):\n${prompt}`);

                const t0 = Date.now();
                let stdout = '', stderr = '', timedOut = false, firstChunkAt = null, lastChunkAt = null;
                let child;
                try {
                    child = spawn(cmd, args, spawnOpts);
                } catch (err) {
                    pushLog(job, 'error', `[${row.id}] spawn FAILED: ${err.message}`);
                    return resolve({ id: row.id, title: row.title, stdout: '', stderr: err.message, exitCode: -1, timedOut: false, spawnError: err.message, durationMs: 0 });
                }
                pushLog(job, 'info', `[${row.id}] spawned PID ${child.pid}`);
                job.children.add(child);

                const timer = setTimeout(() => {
                    timedOut = true;
                    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
                    pushLog(job, 'warn', `[${row.id}] TIMEOUT after ${elapsed}s — sending SIGTERM | stdout so far: ${stdout.length}b | last chunk: ${lastChunkAt ? ((Date.now()-lastChunkAt)/1000).toFixed(1)+'s ago' : 'never'}`);
                    try { child.kill('SIGTERM'); } catch {}
                }, timeoutMs);

                child.on('error', (err) => {
                    clearTimeout(timer);
                    job.children.delete(child);
                    pushLog(job, 'error', `[${row.id}] process error: ${err.message}`);
                    resolve({ id: row.id, title: row.title, stdout, stderr: err.message, exitCode: -1, timedOut: false, spawnError: err.message, durationMs: Date.now() - t0 });
                });

                if (child.stdout) child.stdout.on('data', d => {
                    const s = d.toString();
                    stdout += s;
                    const now = Date.now();
                    if (!firstChunkAt) {
                        firstChunkAt = now;
                        pushLog(job, 'stdout', `[${row.id}] first stdout at +${((now-t0)/1000).toFixed(2)}s (${s.length}b): ${s.slice(0, 120).replace(/\n/g, '↵')}`);
                    }
                    lastChunkAt = now;
                    // Log ogni 5KB aggiuntivi
                    if (stdout.length % 5000 < s.length) pushLog(job, 'stdout', `[${row.id}] stdout progress: ${stdout.length}b total`);
                });

                if (child.stderr) child.stderr.on('data', d => {
                    const s = d.toString();
                    stderr += s;
                    pushLog(job, 'stderr', `[${row.id}] stderr: ${s.trim().slice(0, 500)}`);
                });

                child.on('close', (code) => {
                    clearTimeout(timer);
                    job.children.delete(child);
                    const dur = ((Date.now() - t0) / 1000).toFixed(2);
                    if (timedOut) {
                        pushLog(job, 'error', `[${row.id}] exit TIMEOUT — ${dur}s | stdout: ${stdout.length}b | stderr: ${stderr.length}b | first chunk: ${firstChunkAt ? '+'+((firstChunkAt-t0)/1000).toFixed(2)+'s' : 'NEVER'}`);
                    } else {
                        const lvl = code === 0 ? 'info' : 'error';
                        pushLog(job, lvl, `[${row.id}] exit ${code} — ${dur}s | stdout: ${stdout.length}b | stderr: ${stderr.length}b`);
                    }
                    resolve({ id: row.id, title: row.title, stdout, stderr, exitCode: timedOut ? null : code, timedOut, spawnError: null, durationMs: Date.now() - t0 });
                });

                // Se il runner usa stdin (Gemini), scrivilo ora
                if (spawnOpts._stdinData && child.stdin) {
                    child.stdin.write(spawnOpts._stdinData);
                    child.stdin.end();
                }
            });

            // ── GEMINI engine ─────────────────────────────────────────────────
            // Gemini legge da stdin — patch: inietta il prompt come _stdinData nelle opts
            const runGeminiFull = (row) => {
                const prompt = `- ID: ${row.id} - Categoria: ${row.category} - Titolo: ${row.title} - Descrizione: ${row.description} - Ruolo: ${row.role}`;
                const opts = { env: { ...process.env, GEMINI_API_KEY: apiKey || process.env.GEMINI_API_KEY, GEMINI_MODEL: geminiModel, GEMINI_SYSTEM_MD: agentPath }, _stdinData: prompt };
                return makeRunner('gemini', () => ['-p', 'Genera la blueprint basandoti sui dati in input.', '--yolo', '--output-format', 'text'], opts, geminiTimeout, () => prompt)(row);
            };

            // ── CLAUDE engine ─────────────────────────────────────────────────
            const systemPrompt = agent.content + FILE_OVERRIDE;
            pushLog(job, 'info', `system prompt: ${systemPrompt.length} chars — debug file: ${debugAgentPath}`);
            const runClaude = makeRunner(
                'claude',
                (row, prompt) => ['--print', '--output-format', 'text', '--system-prompt', systemPrompt, '--model', claudeModel, '--tools', '', '--no-session-persistence', '--strict-mcp-config', prompt],
                { env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] },
                claudeTimeout,
                (row) => `Genera la blueprint basandoti sui dati in input.\n\n- ID: ${row.id} - Categoria: ${row.category} - Titolo: ${row.title} - Descrizione: ${row.description} - Ruolo: ${row.role}`
            );

            const runFn = engineType === 'claude' ? runClaude : runGeminiFull;
            let completed = 0;

            await runWithConcurrency(rows, 3, runFn, (r) => {
                if (job.status === 'cancelled') return;
                completed++;
                const isErr = r.timedOut || r.spawnError || (r.exitCode !== 0 && r.exitCode !== null);
                let savedFile = null; // ora contiene l'ID numerico nel DB (come stringa)
                if (!isErr && r.stdout && r.stdout.trim().length > 0) {
                    const title = String(r.title || r.id).slice(0, 200);
                    const result = db.prepare(
                        'INSERT INTO blueprints (user_creator, datetime_creation, markdown_data, title) VALUES (?, ?, ?, ?)'
                    ).run(job.creatorUsername || 'system', new Date().toISOString(), r.stdout, title);
                    savedFile = String(result.lastInsertRowid);
                    pushLog(job, 'info', `[${r.id}] saved → DB id=${savedFile} (${r.stdout.length}b)`);
                } else if (isErr) {
                    pushLog(job, 'warn', `[${r.id}] NOT saved — isErr=true (timedOut=${r.timedOut}, exitCode=${r.exitCode}, spawnError=${r.spawnError})`);
                }
                pushEvent(job, {
                    type: 'item', id: r.id, title: r.title, engine: job.engine,
                    savedFile, isErr,
                    stdout: r.stdout, stderr: r.stderr,
                    exitCode: r.exitCode, timedOut: r.timedOut, spawnError: r.spawnError,
                    durationMs: r.durationMs,
                    completed, total: rows.length
                });
            });

            if (job.status !== 'cancelled') {
                pushLog(job, 'info', `JOB DONE — ${completed}/${rows.length} items processed`);
                pushEvent(job, { type: 'done', total: rows.length, engine: job.engine });
            }
        } catch (error) {
            pushLog(job, 'error', `JOB EXCEPTION: ${error.stack || error.message}`);
            pushEvent(job, { type: 'error', message: error.message });
        } finally {
            if (fs.existsSync(agentPath)) fs.unlinkSync(agentPath);
        }
    })();
});

// Lista job attivi (per il dashboard admin)
app.get('/api/jobs', requireAuth, (req, res) => {
    const result = [];
    for (const [id, job] of jobs.entries()) {
        result.push({ id, status: job.status, engine: job.engine, ids: job.ids, titles: job.titles, startedAt: job.startedAt });
    }
    res.json(result);
});

// SSE stream per seguire il progresso di un job
// Nota: EventSource non supporta cookies, quindi accettiamo ?token= come alternativa
app.get('/api/run/stream/:jobId', requireAuth, (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job non trovato' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Invia tutti gli eventi già accumulati (utile se il client si connette in ritardo)
    for (const event of job.events) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    if (job.status !== 'running') { res.end(); return; }

    job.clients.add(res);
    req.on('close', () => job.clients.delete(res));
});

// Cancella un job in esecuzione: termina tutti i child process
app.post('/api/run/:jobId/cancel', requireAuth, (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job non trovato' });
    if (job.status !== 'running') return res.json({ message: 'Job non in esecuzione' });
    job.status = 'cancelled';
    for (const child of job.children) {
        try { child.kill('SIGTERM'); } catch {}
    }
    job.children.clear();
    pushEvent(job, { type: 'cancelled' });
    res.json({ message: 'Job cancellato' });
});

// --- ENDPOINTS BLUEPRINTS (DB) ---

// Lista tutte le blueprint (senza markdown_data per leggerezza)
app.get('/api/blueprints', requireAuth, (req, res) => {
    try {
        const rows = db.prepare('SELECT id, title, user_creator, datetime_creation FROM blueprints ORDER BY id DESC').all();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dettaglio singola blueprint (con markdown_data)
app.get('/api/blueprints/:id', requireAuth, (req, res) => {
    try {
        const row = db.prepare('SELECT * FROM blueprints WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Blueprint non trovata' });
        res.json(row);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Aggiorna markdown_data di una blueprint (admin)
app.put('/api/blueprints/:id', requireAdmin, (req, res) => {
    try {
        const { markdown_data, title } = req.body;
        const row = db.prepare('SELECT id FROM blueprints WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Blueprint non trovata' });
        if (markdown_data !== undefined) db.prepare('UPDATE blueprints SET markdown_data = ? WHERE id = ?').run(markdown_data, req.params.id);
        if (title !== undefined) db.prepare('UPDATE blueprints SET title = ? WHERE id = ?').run(title, req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Elimina una blueprint (admin)
app.delete('/api/blueprints/:id', requireAdmin, (req, res) => {
    try {
        const row = db.prepare('SELECT id FROM blueprints WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Blueprint non trovata' });
        db.prepare('DELETE FROM blueprints WHERE id = ?').run(req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, () => console.log(`Backend Active: http://localhost:${port}`));
