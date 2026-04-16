# BlueprintAI - Enterprise GenAI Blueprinting Platform

## Descrizione

**BlueprintAI** è una piattaforma full-stack di orchestrazione GenAI progettata per la generazione massiva di Blueprint architetturali e operativi per infrastrutture IT Enterprise. Supporta **Gemini CLI** e **Claude CLI** come motori di generazione, trasformando use case complessi in documentazione tecnica ad alta fedeltà in formato Markdown.

Il sistema è una **WebApp Full-stack** che permette di:
- **Gestire Use Case:** Database SQLite integrato per catalogare centinaia di asset infrastrutturali, importabili via CSV.
- **Configurare Agenti AI:** Editor dedicato per la gestione dinamica dei System Prompt (Strategie) per diverse modalità di generazione.
- **Generare Blueprint in Parallelo:** Job engine asincrono con streaming real-time (SSE) e concorrenza controllata (max 3 worker).
- **Leggere Blueprint:** Visualizzatore Markdown avanzato con supporto nativo per Mermaid.js, KaTeX, GeoJSON e syntax highlighting.
- **Esportare in PDF:** Export professionale via html2pdf.js con gestione automatica dei layout.

---

## Architettura del Sistema

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 19 + Tailwind v4)"]
        A[Dashboard Use Case]
        B[Agent Editor]
        C[Blueprint Reader]
        D[Settings & Engine Config]
    end

    subgraph Server ["Backend (Node.js + Express - Port 5000)"]
        E[REST API Layer]
        F[(SQLite Database)]
        G[Job Manager - SSE Streaming]
    end

    subgraph AI_Engine ["Intelligence Layer"]
        H{Gemini CLI}
        I{Claude CLI}
    end

    subgraph Output ["Deliverables"]
        J[(Output/ - Blueprints .md)]
        K[Export PDF]
    end

    Client <--> E
    E <--> F
    E --> G
    G --> H
    G --> I
    H --> J
    I --> J
    C --> K
```

---

## Stack Tecnologico

| Layer | Tecnologie |
| :--- | :--- |
| **Frontend** | React 19.2, Vite 8, Tailwind CSS v4, Framer Motion, Lucide-react, Axios |
| **Backend** | Node.js, Express.js, better-sqlite3, csv-parse/csv-stringify |
| **Markdown** | react-markdown, remark (GFM, Math, Frontmatter, ToC, Wikilink), rehype (KaTeX, Highlight, Sanitize) |
| **Diagrammi** | Mermaid.js, KaTeX, Leaflet/react-leaflet (GeoJSON) |
| **AI Engines** | Gemini CLI (stdin/stdout), Claude CLI (--system-prompt) |
| **Export** | html2pdf.js |

---

## Installazione e Avvio Rapido

Il progetto è gestito da un unico orchestratore `start_app.sh`.

### 1. Prerequisiti

- **Node.js** (v20+) e **npm**
- **Gemini CLI** e/o **Claude CLI** installati e configurabili nel PATH
- **Chiave API:** `export GEMINI_API_KEY="tua_chiave"` impostata nell'ambiente

### 2. Setup Iniziale

```bash
# Rendi eseguibili gli script
chmod +x *.sh

# Installa tutte le dipendenze (Backend + Frontend)
./start_app.sh install
```

### 3. Comandi di Gestione

| Comando | Descrizione |
| :--- | :--- |
| `./start_app.sh start` | Avvia Backend (Porta 5000) e Frontend (Porta 5173) in background. PID salvati in `.app.pids`. |
| `./start_app.sh status` | Controlla lo stato dei servizi e mostra le ultime righe dei log. |
| `./start_app.sh stop` | Arresta in modo pulito tutti i processi attivi. |
| `./start_app.sh restart` | Esegue un ciclo stop/start completo. |

---

## Pagine Frontend (URL)

Ogni pagina ha una URL dedicata e un contesto di accesso indipendente, progettato per la futura gestione di ruoli e permessi.

### Pagine Utente (standalone — senza navigazione admin)

| URL | Descrizione | Accesso previsto |
| :--- | :--- | :--- |
| `http://localhost:5173/Usecase` | Creazione guidata di un nuovo use case con generazione blueprint automatica e log in tempo reale | Utente finale |
| `http://localhost:5173/reader` | Blueprint Reader standalone — lista e visualizzazione dei file `.md` generati | Utente finale |
| `http://localhost:5173/reader?file=<filename>` | Blueprint Reader con file pre-caricato (es. `82_blueprint_test.md`) | Utente finale |
| `http://localhost:5173/settings` | Pagina impostazioni standalone — engine, modello AI, timeout, test connessione | Utente finale / Admin |
| `http://localhost:5173/editor` | Engine Config standalone — gestione System Prompt (Strategie) | Admin |

### Pagine Admin (con sidebar di navigazione completa)

| URL | Descrizione | Accesso previsto |
| :--- | :--- | :--- |
| `http://localhost:5173/` | Dashboard principale — gestione use case, selezione bulk, monitoraggio pipeline | Admin |
| `http://localhost:5173/dashboard` | Alias della dashboard principale | Admin |

> **Nota architetturale:** Le pagine standalone (`/reader`, `/settings`, `/editor`) non mostrano la barra laterale di navigazione e non permettono di raggiungere altre sezioni. Questo design facilita l'implementazione futura di un sistema di autenticazione e visibilità basato su ruoli (RBAC), dove ogni URL può essere protetto indipendentemente.

---

## API Reference

Tutte le API sono esposte dal backend su `http://localhost:5000`.

### Use Cases

| Metodo | Endpoint | Body / Params | Descrizione |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/csv` | — | Recupera tutti gli use case dal database |
| `POST` | `/api/csv` | `Array<{ID, Categoria, "Titolo Attività", "Descrizione Dettagliata", "Gruppo o Ruolo"}>` | Sincronizza il database (bulk import, sovrascrive tutto) |
| `POST` | `/api/usecases` | `{description, title?, category?}` | Crea un singolo use case con ID sequenziale autogenerato. Ritorna `{id, title, category}` |

### Agenti (System Prompts / Strategie)

| Metodo | Endpoint | Body | Descrizione |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/agents` | — | Lista tutte le strategie salvate |
| `POST` | `/api/agents` | `{name}` | Crea una nuova strategia vuota |
| `POST` | `/api/agents/:id/default` | — | Imposta la strategia come predefinita per la generazione |
| `POST` | `/api/agents/:id/name` | `{name}` | Rinomina una strategia |
| `POST` | `/api/agents/:id/content` | `{content}` | Aggiorna il system prompt di una strategia |
| `DELETE` | `/api/agents/:id` | — | Elimina una strategia (vietato se è quella di default) |

### Impostazioni

| Metodo | Endpoint | Body | Descrizione |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings` | — | Recupera tutte le configurazioni |
| `POST` | `/api/settings` | `{engine_type?, gemini_model?, claude_model?, gemini_timeout?, claude_timeout?}` | Salva una o più configurazioni |
| `POST` | `/api/test-engine` | `{apiKey?}` | Esegue un test di connessione al motore AI configurato. Ritorna `{success, output?, error?, durationMs}` |

### Esecuzione Blueprint (Job Engine)

| Metodo | Endpoint | Body / Params | Descrizione |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/run` | `{ids: string[], apiKey?}` | Avvia un job di generazione per gli ID selezionati. Ritorna `{jobId}` |
| `GET` | `/api/run/stream/:jobId` | — | **SSE** — stream eventi real-time del job (`start`, `item_start`, `item`, `done`, `error`, `cancelled`, `debug`) |
| `POST` | `/api/run/:jobId/cancel` | — | Cancella un job in esecuzione (invia SIGTERM ai processi figli) |
| `GET` | `/api/jobs` | — | Lista tutti i job attivi in memoria con metadata `{id, status, engine, ids[], titles[], startedAt}`. Usato dal dashboard per il monitoraggio automatico dei job avviati da `/Usecase` |

#### Formato eventi SSE (`/api/run/stream/:jobId`)

```jsonc
// Inizio job
{ "type": "start", "total": 3, "engine": "GEMINI" }

// Inizio elaborazione singolo item
{ "type": "item_start", "id": "78", "title": "Nome use case" }

// Risultato elaborazione singolo item
{ "type": "item", "id": "78", "title": "...", "savedFile": "78_blueprint_name.md",
  "isErr": false, "exitCode": 0, "durationMs": 45000, "stdout": "...", "stderr": "...",
  "timedOut": false, "spawnError": null, "completed": 1, "total": 3 }

// Job completato
{ "type": "done", "total": 3, "engine": "GEMINI" }

// Errore job
{ "type": "error", "message": "Descrizione errore" }

// Job cancellato
{ "type": "cancelled" }

// Log di debug (non bloccante)
{ "type": "debug", "level": "info|warn|error|stdout|stderr|cmd", "msg": "...", "t": 1234567890 }
```

### Output (Blueprint Files)

| Metodo | Endpoint | Body | Descrizione |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/blueprints` | — | Lista tutti i file `.md` in `Output/` e `Blueprint/` (legacy) |
| `GET` | `/api/blueprints/:filename` | — | Legge il contenuto di un blueprint. Ritorna `{content}` |
| `POST` | `/api/blueprints/:filename` | `{content}` | Salva o modifica un blueprint esistente |
| `DELETE` | `/api/blueprints/:filename` | — | Elimina un blueprint (con path-traversal guard) |

---

## Database Schema

```sql
-- Use Case da generare
CREATE TABLE use_cases (
  id          TEXT PRIMARY KEY,
  category    TEXT,
  title       TEXT,
  description TEXT,
  role        TEXT
);

-- Strategie di generazione (System Prompts)
CREATE TABLE agents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  content    TEXT,
  is_default INTEGER DEFAULT 0
);

-- Configurazioni applicazione
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

**Valori di default delle impostazioni:**

| Chiave | Valore Default |
| :--- | :--- |
| `engine_type` | `gemini` |
| `gemini_model` | `gemini-2.5-flash` |
| `claude_model` | `sonnet` |
| `gemini_timeout` | `90` (secondi) |
| `claude_timeout` | `360` (secondi) |

---

## Funzionalità del Frontend

### Dashboard (Tab principale)
- Tabella con tutti gli use case e filtro di ricerca in tempo reale
- Selezione multipla (checkboxes) per avviare generazioni bulk
- Editing inline dei campi direttamente nella tabella
- Import CSV e Export CSV

### Agent Editor
- Gestione completa del ciclo di vita delle strategie (create, rename, edit, delete, set-default)
- Editor testuale per la modifica del system prompt
- Protezione contro l'eliminazione della strategia di default

### Blueprint Reader
- Sidebar con lista dei file generati, ridimensionabile via drag
- Rendering Markdown completo: tabelle GFM, diagrammi Mermaid, formule KaTeX, mappe GeoJSON, syntax highlighting, frontmatter, table of contents, WikiLinks
- Export PDF via html2pdf.js
- Toggle Dark Mode con persistenza su localStorage
- Modalità fullscreen

### Settings
- Selezione engine (Gemini / Claude) con dropdown modelli
- Configurazione timeout via slider (10-600 secondi)
- Bottone "Test Engine" con misurazione del tempo di risposta

---

## Flusso Operativo

```
1. SETUP
   ├── ./start_app.sh install     → installa le dipendenze
   └── ./start_app.sh start        → avvia backend (5000) + frontend (5173)

2. CONFIGURAZIONE
   ├── Dashboard: carica use case via CSV → salvati in SQLite
   ├── Agent Editor: crea/modifica il system prompt di generazione
   └── Settings: seleziona engine (Gemini/Claude), modello e timeout

3. GENERAZIONE BLUEPRINT
   ├── Dashboard: seleziona uno o più use case
   ├── Click "RUN": il backend avvia un job asincrono
   ├── Backend: spawn di Gemini/Claude in parallelo (max 3 worker)
   ├── Streaming: il client riceve aggiornamenti real-time via SSE
   └── Output: file .md salvati in Output/ con nome auto-generato

4. FRUIZIONE
   ├── Blueprint Reader: apre il file e lo renderizza
   └── Export PDF: scarica il documento formattato

5. MANUTENZIONE
   ├── ./backup.sh               → backup compresso DB + Output
   ├── ./github_push.sh          → push codice su GitHub
   └── ./update_from_github.sh   → pull aggiornamenti remoti
```

---

## Caratteristiche Avanzate

### Real-time Streaming (SSE)
Il job engine usa Server-Sent Events per trasmettere il progresso al client. Gli eventi accumulati vengono reinviati automaticamente in caso di riconnessione, garantendo che nessun log venga perso.

### Concorrenza Controllata
Il backend gestisce una coda asincrona con un massimo di 3 processi AI in esecuzione contemporaneamente, con timeout configurabili per engine e gestione graceful della cancellazione.

### Dual Engine Support
- **Gemini CLI:** input del prompt via `stdin`, system prompt via variabile `GEMINI_SYSTEM_MD`
- **Claude CLI:** system prompt passato inline via `--system-prompt`

### Logging Dettagliato
Per ogni item generato viene salvato un file di debug in `Output/.debug_agent_*` con il comando esatto eseguito, stdout/stderr completi e timing al millisecondo.

### Path Security
Validazione anti path-traversal su tutti gli endpoint che gestiscono file di output. Deduplicazione automatica dei nomi file (`_2`, `_3`, ...) in caso di conflitto.

### Governance e Privacy
- Le cartelle `Output/`, `Blueprint/` e `Backup/` sono inserite nel `.gitignore`
- Ogni documento generato è progettato per essere validato da un Cloud Architect prima della consegna finale

---

## Script di Manutenzione

| Script | Funzione |
| :--- | :--- |
| `backup.sh` | Crea un archivio compresso con timestamp del database e dei file generati in `Backup/` |
| `github_push.sh` | Sincronizza il codice della piattaforma su GitHub (esclude dati sensibili) |
| `update_from_github.sh` | Aggiorna la logica degli agenti e degli script all'ultima versione remota |

---

## Variabili di Ambiente

```bash
export GEMINI_API_KEY="your-api-key"   # Obbligatorio per Gemini engine
```

Le impostazioni di modello e timeout sono configurabili dall'interfaccia grafica e persistite nel database.

---

## Author

**Developed by Carmelo Battiato**
*Enterprise AI Infrastructure Architect*
© 2026 - Tutti i diritti riservati.
