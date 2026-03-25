#!/bin/bash

# Script per generare massivamente le blueprint tramite Gemini CLI
# Uso 1 (Range): ./generate_blueprints.sh [-v] <inizio> <fine> (es. ./generate_blueprints.sh -v 1 5)
# Uso 2 (Lista): ./generate_blueprints.sh [-v] "<id1>;<id2>;..." (es. ./generate_blueprints.sh -v "9;13;24")

VERBOSE=0
if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
    VERBOSE=1
    shift
fi

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
    echo "Uso 1 (Range): $0 [-v] <inizio> <fine>"
    echo "   Esempio: $0 -v 1 5"
    echo "Uso 2 (Lista): $0 [-v] \"<id1>;<id2>;...\" (nota: usa le virgolette!)"
    echo "   Esempio: $0 -v \"9;13;24\""
    exit 1
fi

CSV_FILE="blueprint_use_cases.csv"
AGENT_FILE="agent_generatore_blueprint.md"

if [ ! -f "$CSV_FILE" ]; then
    echo "Errore: File CSV '$CSV_FILE' non trovato."
    exit 1
fi

if [ ! -f "$AGENT_FILE" ]; then
    echo "Errore: File Agent '$AGENT_FILE' non trovato."
    exit 1
fi

# Creazione della cartella Blueprint se non esiste
mkdir -p Blueprint

MODE=""
if [ "$#" -eq 2 ]; then
    MODE="range"
    START_LINE=$1
    END_LINE=$2
    echo "Inizio elaborazione range: da $START_LINE a $END_LINE..."
else
    MODE="list"
    # Accettiamo sia virgola che punto e virgola come separatori
    LIST_IDS=$(echo "$1" | tr ',' ';')
    echo "Inizio elaborazione lista ID: $LIST_IDS..."
fi

# Estrazione delle righe dal file CSV tramite awk e ciclo while.
awk -v mode="$MODE" -v start="$START_LINE" -v end="$END_LINE" -v list="$LIST_IDS" -F';' '
BEGIN {
    # Se modalità lista, creiamo un array associativo degli ID desiderati
    if (mode == "list") {
        split(list, arr, ";")
        for (i in arr) {
            if (arr[i] != "") {
                id = arr[i] + 0 # Forza la conversione a numero intero (es. "09" -> 9)
                valid_ids[id] = 1
            }
        }
    }
}
NR>1 && length($1) > 0 {
    # Rimuovi eventuali carriage return per file salvati su Windows
    gsub(/\r$/, "", $5)
    
    current_id = $1 + 0
    if (current_id == 0) next # Salta righe malformate o vuote
    
    process = 0
    if (mode == "range") {
        if (current_id >= start && current_id <= end) process = 1
    } else {
        if (current_id in valid_ids) process = 1
    }
    
    if (process == 1) {
        # Stampa i campi separati da un pipe sicuro per il read
        printf "%02d|%s|%s|%s|%s\n", current_id, $2, $3, $4, $5
    }
}' "$CSV_FILE" | while IFS='|' read -r ID CATEGORIA TITOLO DESCRIZIONE RUOLO; do
    
    # Salta se ID è vuoto (caso estremo di riga vuota passata)
    if [ -z "$ID" ]; then
        continue
    fi
    
    echo "---------------------------------------------------------"
    echo "Elaborazione riga CSV [$ID] - Attività: $TITOLO"
    
    # Costruzione del prompt basato sui requisiti attesi dall'agente, tenendolo su una singola riga per evitare problemi con la CLI
    USER_PROMPT="- ID Riga CSV: $ID - Categoria: $CATEGORIA - Titolo Attività: $TITOLO - Descrizione: $DESCRIZIONE - Ruolo: $RUOLO"

    # Esecuzione della Gemini CLI tramite pipe.
    echo "Attendere, generazione in corso per l'attività '$TITOLO'..."
    if [ "$VERBOSE" -eq 1 ]; then
        echo "=== DEBUG: Prompt inviato a Gemini ==="
        echo "$USER_PROMPT"
        echo "=== DEBUG: Esecuzione Gemini CLI in corso (log dettagliato su stdout) ==="
        echo "$USER_PROMPT" | GEMINI_SYSTEM_MD="$AGENT_FILE" gemini -p "Genera la blueprint basandoti sui dati in input." --yolo --output-format text 2>&1 | tee gemini_last_run.log
        echo "=== DEBUG: Fine esecuzione Gemini ==="
    else
        echo "$USER_PROMPT" | GEMINI_SYSTEM_MD="$AGENT_FILE" gemini -p "Genera la blueprint basandoti sui dati in input." --yolo --output-format text > /dev/null 2>&1
    fi
    
    # Cerchiamo il file appena generato e stampiamo solo i titoli delle fasi
    # Modificato per catturare tutti i file con il prefisso dell'ID e il suffisso .md per evitare problemi con i nomi spaziati
    GENERATED_FILE=$(find Blueprint/ -maxdepth 1 -name "${ID}_blueprint_*.md" -print -quit)
    
    if [ -n "$GENERATED_FILE" ] && [ -f "$GENERATED_FILE" ]; then
        echo "✅ Completato ID [$ID]. File salvato in: $GENERATED_FILE"
        echo "Fasi identificate:"
        grep "^### Fase" "$GENERATED_FILE" | sed 's/^/  /'
    else
        echo "⚠️ Attenzione: Elaborazione terminata ma file per ID [$ID] non trovato con il nome atteso."
        if [ "$VERBOSE" -eq 0 ]; then
            echo "💡 Suggerimento: Rilancia lo script aggiungendo l'opzione -v all'inizio per analizzare i log d'errore dell'Agente (es. ./generate_blueprints.sh -v \"$ID\")."
        fi
    fi
done

echo "---------------------------------------------------------"
echo "Tutte le elaborazioni richieste sono terminate. Controlla la cartella Blueprint/."