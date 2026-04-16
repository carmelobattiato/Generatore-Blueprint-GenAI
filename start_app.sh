#!/bin/bash

# Configurazione percorsi e file
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_LOG="$APP_DIR/backend.log"
FRONTEND_LOG="$APP_DIR/frontend.log"
PID_FILE="$APP_DIR/.app.pids"
BACKEND_PORT=5000
FRONTEND_PORT=5173

# Funzione per controllare lo stato dei processi
check_status() {
    local backend_up=false
    local frontend_up=false
    
    if is_port_up $BACKEND_PORT; then backend_up=true; fi
    if is_port_up $FRONTEND_PORT; then frontend_up=true; fi

    if [ "$backend_up" = true ] && [ "$frontend_up" = true ]; then
        return 0 # Running
    elif [ "$backend_up" = true ] || [ "$frontend_up" = true ]; then
        return 1 # Partially running
    else
        return 2 # Not running
    fi
}

# Funzione per verificare se un servizio è UP su una porta
is_port_up() {
    timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/$1" 2>/dev/null
}

# Pacchetti npm richiesti per backend e frontend
BACKEND_REQUIRED_PKGS=(
    "express"
    "better-sqlite3"
    "bcryptjs"
    "cookie-parser"
    "cors"
    "csv-parse"
)
FRONTEND_REQUIRED_PKGS=(
    "react"
    "react-dom"
    "react-router-dom"
    "axios"
    "vite"
    "lucide-react"
    "framer-motion"
    "html2pdf.js"
    "react-markdown"
    "jszip"
    "marked"
    "mermaid"
    "tailwindcss"
)

# Verifica che tutti i pacchetti richiesti siano installati in una directory node_modules
check_packages() {
    local dir="$1"
    shift
    local pkgs=("$@")
    local missing=()
    for pkg in "${pkgs[@]}"; do
        # Supporta nomi scoped (@scope/pkg) e nomi con slash
        local check_path="$dir/node_modules/${pkg}"
        if [ ! -d "$check_path" ]; then
            missing+=("$pkg")
        fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
        echo "   ⚠️  Pacchetti mancanti: ${missing[*]}"
        return 1
    fi
    return 0
}

install_app() {
    echo "🛠️  Verifica e installazione prerequisiti..."
    if ! command -v node &> /dev/null; then echo "❌ Errore: Node.js non trovato."; exit 1; fi
    if ! command -v npm &> /dev/null; then echo "❌ Errore: npm non trovato."; exit 1; fi
    echo "   Node.js: $(node -v)  |  npm: $(npm -v)"

    echo "📦 Installazione dipendenze Backend..."
    cd "$APP_DIR/webapp"
    npm install --silent
    echo "   Verifica pacchetti backend..."
    check_packages "$APP_DIR/webapp" "${BACKEND_REQUIRED_PKGS[@]}" || npm install --silent

    echo "📦 Installazione dipendenze Frontend..."
    cd "$APP_DIR/webapp/client"
    npm install --silent
    echo "   Verifica pacchetti frontend..."
    check_packages "$APP_DIR/webapp/client" "${FRONTEND_REQUIRED_PKGS[@]}" || npm install --silent

    cd "$APP_DIR"
    echo "✨ Installazione completata con successo!"
}

# Controlla pacchetti senza reinstallare tutto — usato all'avvio
check_and_fix_packages() {
    local needs_fix=false

    echo "🔍 Controllo pacchetti backend..."
    if ! check_packages "$APP_DIR/webapp" "${BACKEND_REQUIRED_PKGS[@]}"; then
        echo "   → Installo pacchetti backend mancanti..."
        cd "$APP_DIR/webapp" && npm install --silent
        needs_fix=true
    else
        echo "   ✅ Backend OK"
    fi

    echo "🔍 Controllo pacchetti frontend..."
    if ! check_packages "$APP_DIR/webapp/client" "${FRONTEND_REQUIRED_PKGS[@]}"; then
        echo "   → Installo pacchetti frontend mancanti..."
        cd "$APP_DIR/webapp/client" && npm install --silent
        needs_fix=true
    else
        echo "   ✅ Frontend OK"
    fi

    cd "$APP_DIR"
    return 0
}

start_app() {
    check_status
    status=$?
    if [ $status -eq 0 ]; then
        echo "✅ BlueprintAI Manager è già in esecuzione."
        return 0
    fi

    if [ ! -d "$APP_DIR/webapp/node_modules" ] || [ ! -d "$APP_DIR/webapp/client/node_modules" ]; then
        install_app
    else
        check_and_fix_packages
    fi

    echo "🚀 Avvio BlueprintAI Manager in background..."
    > "$BACKEND_LOG"
    > "$FRONTEND_LOG"

    cd "$APP_DIR/webapp"
    nohup node server.js >> "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    
    cd "$APP_DIR/webapp/client"
    nohup npx vite --port $FRONTEND_PORT --host >> "$FRONTEND_LOG" 2>&1 < /dev/null &
    FRONTEND_PID=$!
    
    cd "$APP_DIR"

    echo "$BACKEND_PID" > "$PID_FILE"
    echo "$FRONTEND_PID" >> "$PID_FILE"

    echo "⏳ Monitoraggio avvio servizi (attesa stabilità per 10s)..."
    
    local timer=0
    local stable_seconds=0
    local max_wait=90

    while [ $timer -lt $max_wait ]; do
        if is_port_up $BACKEND_PORT && is_port_up $FRONTEND_PORT; then
            ((stable_seconds++))
            printf "\r🚀 Servizi UP... verifico stabilità: %ds/10s" $stable_seconds
            if [ $stable_seconds -ge 10 ]; then
                echo -e "\n✨ Applicazione avviata e stabile correttamente!"
                echo "🔗 UI: http://localhost:$FRONTEND_PORT"
                return 0
            fi
        else
            stable_seconds=0
            printf "\r⏳ In attesa dei servizi (Porte %d, %d)... %ds" $BACKEND_PORT $FRONTEND_PORT $timer
        fi
        sleep 1
        ((timer++))
    done

    echo -e "\n⚠️  Timeout: I servizi non sono diventati stabili entro $max_wait secondi."
    echo "🔍 Controlla i log per errori: tail -n 20 backend.log frontend.log"
    exit 1
}

stop_app() {
    if [ -f "$PID_FILE" ]; then
        echo "🛑 Arresto BlueprintAI Manager..."
        while read -r pid; do
            kill "$pid" 2>/dev/null
        done < "$PID_FILE"
        rm "$PID_FILE"
        # Forza la chiusura se le porte sono ancora occupate
        fuser -k $BACKEND_PORT/tcp 2>/dev/null
        fuser -k $FRONTEND_PORT/tcp 2>/dev/null
        echo "✅ Processi terminati."
    else
        echo "⚠️ Nessun processo attivo trovato."
    fi
}

show_status() {
    check_status
    status=$?
    if [ $status -eq 0 ]; then
        echo "🟢 Stato: IN ESECUZIONE"
        echo "🖥️  Frontend: http://localhost:$FRONTEND_PORT (PID: $(tail -n 1 "$PID_FILE"))"
        echo "⚙️  Backend:  http://localhost:$BACKEND_PORT (PID: $(head -n 1 "$PID_FILE"))"
    elif [ $status -eq 1 ]; then
        echo "🟡 Stato: INSTABILE"
    else
        echo "🔴 Stato: FERMO"
    fi

    echo -e "\n📄 --- Ultime 10 righe di backend.log ---"
    if [ -f "$BACKEND_LOG" ]; then tail -n 10 "$BACKEND_LOG"; else echo "Nessun log trovato."; fi
    
    echo -e "\n📄 --- Ultime 10 righe di frontend.log ---"
    if [ -f "$FRONTEND_LOG" ]; then tail -n 10 "$FRONTEND_LOG"; else echo "Nessun log trovato."; fi
}

restart_app() {
    stop_app
    sleep 2
    start_app
}

restart_frontend() {
    echo "🔄 Riavvio solo frontend (Vite)..."
    echo "🔍 Controllo pacchetti frontend..."
    if ! check_packages "$APP_DIR/webapp/client" "${FRONTEND_REQUIRED_PKGS[@]}"; then
        echo "   → Installo pacchetti mancanti..."
        cd "$APP_DIR/webapp/client" && npm install --silent
        cd "$APP_DIR"
    else
        echo "   ✅ Pacchetti OK"
    fi
    # Termina solo il processo Vite
    fuser -k $FRONTEND_PORT/tcp 2>/dev/null
    if [ -f "$PID_FILE" ]; then
        FRONTEND_PID=$(tail -n 1 "$PID_FILE")
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    sleep 1

    # Riavvia Vite
    cd "$APP_DIR/webapp/client"
    nohup npx vite --port $FRONTEND_PORT --host >> "$FRONTEND_LOG" 2>&1 < /dev/null &
    NEW_FRONTEND_PID=$!
    cd "$APP_DIR"

    # Aggiorna PID file mantenendo il backend PID
    if [ -f "$PID_FILE" ]; then
        BACKEND_PID=$(head -n 1 "$PID_FILE")
        echo "$BACKEND_PID" > "$PID_FILE"
        echo "$NEW_FRONTEND_PID" >> "$PID_FILE"
    else
        echo "$NEW_FRONTEND_PID" > "$PID_FILE"
    fi

    echo "⏳ Attendo Vite su porta $FRONTEND_PORT..."
    local timer=0
    while [ $timer -lt 30 ]; do
        if is_port_up $FRONTEND_PORT; then
            echo "✅ Frontend riavviato! http://localhost:$FRONTEND_PORT"
            return 0
        fi
        sleep 1
        ((timer++))
    done
    echo "⚠️ Timeout: Vite non risponde. Controlla frontend.log"
}

restart_backend() {
    echo "🔄 Riavvio solo backend (Node)..."
    echo "🔍 Controllo pacchetti backend..."
    if ! check_packages "$APP_DIR/webapp" "${BACKEND_REQUIRED_PKGS[@]}"; then
        echo "   → Installo pacchetti mancanti..."
        cd "$APP_DIR/webapp" && npm install --silent
        cd "$APP_DIR"
    else
        echo "   ✅ Pacchetti OK"
    fi
    fuser -k $BACKEND_PORT/tcp 2>/dev/null
    if [ -f "$PID_FILE" ]; then
        BACKEND_PID=$(head -n 1 "$PID_FILE")
        kill "$BACKEND_PID" 2>/dev/null
    fi
    sleep 1

    cd "$APP_DIR/webapp"
    nohup node server.js >> "$BACKEND_LOG" 2>&1 &
    NEW_BACKEND_PID=$!
    cd "$APP_DIR"

    if [ -f "$PID_FILE" ]; then
        FRONTEND_PID=$(tail -n 1 "$PID_FILE")
        echo "$NEW_BACKEND_PID" > "$PID_FILE"
        echo "$FRONTEND_PID" >> "$PID_FILE"
    else
        echo "$NEW_BACKEND_PID" > "$PID_FILE"
    fi

    echo "⏳ Attendo backend su porta $BACKEND_PORT..."
    local timer=0
    while [ $timer -lt 30 ]; do
        if is_port_up $BACKEND_PORT; then
            echo "✅ Backend riavviato! http://localhost:$BACKEND_PORT"
            return 0
        fi
        sleep 1
        ((timer++))
    done
    echo "⚠️ Timeout: backend non risponde. Controlla backend.log"
}

case "$1" in
    install) install_app ;;
    start) start_app ;;
    stop) stop_app ;;
    status) show_status ;;
    restart) restart_app ;;
    restart-frontend) restart_frontend ;;
    restart-backend) restart_backend ;;
    *) echo "Utilizzo: $0 {install|start|stop|status|restart|restart-frontend|restart-backend}"; exit 1 ;;
esac
