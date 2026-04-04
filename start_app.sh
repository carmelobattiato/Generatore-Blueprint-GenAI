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

install_app() {
    echo "🛠️  Verifica e installazione prerequisiti..."
    if ! command -v node &> /dev/null; then echo "❌ Errore: Node.js non trovato."; exit 1; fi
    if ! command -v npm &> /dev/null; then echo "❌ Errore: npm non trovato."; exit 1; fi
    
    echo "📦 Pulizia e Installazione dipendenze Backend..."
    cd "$APP_DIR/webapp"
    rm -rf node_modules package-lock.json
    npm install --silent
    
    echo "📦 Pulizia e Installazione dipendenze Frontend..."
    cd "$APP_DIR/webapp/client"
    rm -rf node_modules package-lock.json
    npm install --silent
    
    cd "$APP_DIR"
    echo "✨ Installazione completata con successo!"
}

start_app() {
    check_status
    status=$?
    if [ $status -eq 0 ]; then
        echo "✅ BlueprintAI Manager è già in esecuzione."
        return 0
    fi

    if [ ! -d "webapp/node_modules" ] || [ ! -d "webapp/client/node_modules" ]; then
        install_app
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

case "$1" in
    install) install_app ;;
    start) start_app ;;
    stop) stop_app ;;
    status) show_status ;;
    restart) restart_app ;;
    *) echo "Utilizzo: $0 {install|start|stop|status|restart}"; exit 1 ;;
esac
