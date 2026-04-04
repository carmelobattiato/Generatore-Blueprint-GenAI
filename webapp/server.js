const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { parse } = require('csv-parse/sync');
const { spawn } = require('child_process');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

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
};
initDb();

// --- ENDPOINTS USE CASES ---
app.get('/api/csv', (req, res) => {
    try {
        const rows = db.prepare('SELECT id as ID, category as Categoria, title as "Titolo Attività", description as "Descrizione Dettagliata", role as "Gruppo o Ruolo" FROM use_cases ORDER BY id ASC').all();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/csv', (req, res) => {
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

// --- ENDPOINTS AGENTS (STRATEGIES) ---
app.get('/api/agents', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM agents ORDER BY id DESC').all();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents', (req, res) => {
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

app.post('/api/agents/:id/default', (req, res) => {
    try {
        const { id } = req.params;
        db.transaction(() => {
            db.prepare('UPDATE agents SET is_default = 0').run();
            db.prepare('UPDATE agents SET is_default = 1 WHERE id = ?').run(id);
        })();
        res.json({ message: 'Default strategy updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents/:id/name', (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        db.prepare('UPDATE agents SET name = ? WHERE id = ?').run(name, id);
        res.json({ message: 'Name updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents/:id/content', (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        db.prepare('UPDATE agents SET content = ? WHERE id = ?').run(content, id);
        res.json({ message: 'Saved' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/agents/:id', (req, res) => {
    try {
        const { id } = req.params;
        const agent = db.prepare('SELECT is_default FROM agents WHERE id = ?').get(id);
        if (agent?.is_default) return res.status(400).json({ error: 'Cannot delete default strategy' });
        db.prepare('DELETE FROM agents WHERE id = ?').run(id);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- EXECUTION ENGINE ---
app.post('/api/run', async (req, res) => {
    const { ids, apiKey } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ error: 'Nessun ID selezionato' });

    try {
        // Carica l'agente di default
        const agent = db.prepare('SELECT content FROM agents WHERE is_default = 1').get();
        if (!agent) return res.status(500).json({ error: 'Nessuna strategia di default trovata' });

        const agentPath = path.join(__dirname, '.tmp_agent.md');
        fs.writeFileSync(agentPath, agent.content);

        const placeholders = ids.map(() => '?').join(',');
        const rows = db.prepare(`SELECT * FROM use_cases WHERE id IN (${placeholders})`).all(...ids);

        let finalOutput = '';
        const blueprintDir = path.join(__dirname, '..', 'Blueprint');
        if (!fs.existsSync(blueprintDir)) fs.mkdirSync(blueprintDir);

        for (const row of rows) {
            finalOutput += `---------------------------------------------------------\n`;
            finalOutput += `Building Blueprint for [${row.id}] - ${row.title}...\n`;
            
            const prompt = `- ID: ${row.id} - Categoria: ${row.category} - Titolo: ${row.title} - Descrizione: ${row.description} - Ruolo: ${row.role}`;
            
            const result = await new Promise((resolve) => {
                const child = spawn('gemini', ['-p', 'Genera la blueprint basandoti sui dati in input.', '--yolo', '--output-format', 'text'], {
                    env: { ...process.env, GEMINI_API_KEY: apiKey || process.env.GEMINI_API_KEY, GEMINI_SYSTEM_MD: agentPath }
                });
                child.stdin.write(prompt);
                child.stdin.end();
                let out = '';
                child.stdout.on('data', (d) => out += d.toString());
                child.stderr.on('data', (d) => out += d.toString());
                child.on('close', (code) => resolve(out));
            });
            finalOutput += result + '\n';
        }

        fs.unlinkSync(agentPath);
        res.json({ message: 'Success', output: finalOutput });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ENDPOINTS BLUEPRINTS (FILE SYSTEM) ---
const BLUEPRINT_DIR = path.join(__dirname, '..', 'Blueprint');

app.get('/api/blueprints', (req, res) => {
    try {
        if (!fs.existsSync(BLUEPRINT_DIR)) fs.mkdirSync(BLUEPRINT_DIR);
        const files = fs.readdirSync(BLUEPRINT_DIR)
            .filter(f => f.endsWith('.md'))
            .map(f => ({ name: f, id: f }));
        res.json(files);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/blueprints/:filename', (req, res) => {
    try {
        const filePath = path.join(BLUEPRINT_DIR, req.params.filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ content });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/blueprints/:filename', (req, res) => {
    try {
        const filePath = path.join(BLUEPRINT_DIR, req.params.filename);
        fs.writeFileSync(filePath, req.body.content);
        res.json({ message: 'Saved' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/blueprints/:filename', (req, res) => {
    try {
        const filePath = path.join(BLUEPRINT_DIR, req.params.filename);
        fs.unlinkSync(filePath);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, () => console.log(`Backend Active: http://localhost:${port}`));
