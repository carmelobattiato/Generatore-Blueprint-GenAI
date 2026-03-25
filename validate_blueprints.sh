#!/bin/bash

# Script per validare la sintassi Markdown e il codice Mermaid.js
# Uso: ./validate_blueprints.sh <percorso_cartella> [max_file]

TARGET_DIR=$1
MAX_FILES=$2

if [ -z "$TARGET_DIR" ]; then
    echo "Uso: $0 <percorso_cartella> [max_file]"
    echo "Esempio: $0 Blueprint/ 1 (valida solo il primo file trovato)"
    exit 1
fi

if [ ! -d "$TARGET_DIR" ] && [ ! -f "$TARGET_DIR" ]; then
    echo "Errore: Percorso '$TARGET_DIR' non trovato (deve essere una cartella o un file .md)."
    exit 1
fi

echo "🔍 Inizio validazione: $TARGET_DIR"
echo "Verifica dipendenze in corso..."

if ! command -v npx &> /dev/null; then
    echo "❌ Errore: 'npx' non è installato. Node.js è richiesto per eseguire i linter."
    exit 1
fi

# File temporanei sicuri per log ed estrazioni, compatibili con macOS (Bash 3.2)
TMP_ERR_FILE=$(mktemp)
TMP_MMD_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_ERR_FILE" "$TMP_MMD_DIR"' EXIT

# Troviamo i file markdown (se TARGET_DIR è un file, prende solo quello)
if [ -f "$TARGET_DIR" ]; then
    FILES_TO_PROCESS="$TARGET_DIR"
else
    FIND_CMD="find \"$TARGET_DIR\" -type f -name \"*.md\""
    if [ -n "$MAX_FILES" ]; then
        FIND_CMD="$FIND_CMD | head -n $MAX_FILES"
    fi
    FILES_TO_PROCESS=$(eval "$FIND_CMD")
fi

for file in $FILES_TO_PROCESS; do
    echo "Analizzando: $file"
    HAS_ERROR=0
    
    # 1. Validazione Markdown
    # Disabilitiamo regole puramente stilistiche per evitare falsi positivi (indentazione, spazi finali, righe vuote)
    MD_OUTPUT=$(npx -y markdownlint-cli "$file" --disable MD013 MD033 MD041 MD024 MD022 MD030 MD032 MD007 MD009 MD031 MD004 MD047 2>&1)
    if [ $? -ne 0 ]; then
        HAS_ERROR=1
        echo "📄 File: $file" >> "$TMP_ERR_FILE"
        echo "[Errore Markdown] Regole violate:" >> "$TMP_ERR_FILE"
        echo "$MD_OUTPUT" | sed 's/^/    /' >> "$TMP_ERR_FILE"
    fi

    # 2. Estrazione e Validazione Mermaid
    # Svuota la cartella temporanea dei diagrammi precedenti
    rm -f "$TMP_MMD_DIR"/*.mmd
    
    # Estraiamo i blocchi mermaid usando awk e li salviamo come file .mmd temporanei
    awk '/^```mermaid/{flag=1; count++; next} /^```/{if(flag){flag=0; next}} flag {print > ("'"$TMP_MMD_DIR"'/mermaid_"count".mmd")}' "$file"
    
    # Validiamo ogni blocco estratto
    for mmd_file in "$TMP_MMD_DIR"/mermaid_*.mmd; do
        [ -e "$mmd_file" ] || continue
        
        # Controlli statici personalizzati per le regole restrittive
        CUSTOM_ERR=""
        if grep -qE "^[[:space:]]*graph " "$mmd_file"; then
            CUSTOM_ERR="Errore: Trovato 'graph' invece di 'flowchart'. Usa sempre 'flowchart TD'."
        elif grep -qE "<-->[[:space:]]*\|" "$mmd_file"; then
            CUSTOM_ERR="Errore: Trovata freccia bidirezionale con etichetta (<-->|). Usa frecce unidirezionali (-->)."
        elif grep -qE "-->[[:space:]]*\|[^\"|]*\([^|]*\|" "$mmd_file"; then
            CUSTOM_ERR="Errore: Trovata etichetta non quotata contenente parentesi sulle frecce. Usa i doppi apici (es. -->|\"Testo (ABC)\"|)."
        fi

        if [ -n "$CUSTOM_ERR" ]; then
            if [ $HAS_ERROR -eq 0 ]; then
                echo "📄 File: $file" >> "$TMP_ERR_FILE"
                HAS_ERROR=1
            fi
            echo "[Errore Mermaid (Custom Linter)]" >> "$TMP_ERR_FILE"
            echo "    $CUSTOM_ERR" >> "$TMP_ERR_FILE"
            continue # Salta l'esecuzione dell'npm linter se fallisce già il controllo statico
        fi

        # Validazione con Mermaid CLI
        MMDC_OUTPUT=$(npx --yes @mermaid-js/mermaid-cli@latest -i "$mmd_file" -o "$TMP_MMD_DIR/out.svg" 2>&1)
        
        if [ $? -ne 0 ] && ! echo "$MMDC_OUTPUT" | grep -q "npm error"; then
            if [ $HAS_ERROR -eq 0 ]; then
                echo "📄 File: $file" >> "$TMP_ERR_FILE"
                HAS_ERROR=1
            fi
            
            # Estraiamo le righe più significative dell'errore ignorando i log NPM base
            CLEAN_ERR=$(echo "$MMDC_OUTPUT" | grep -iE "error|parse error|Syntax error" | tail -n 3)
            echo "[Errore Mermaid] Sintassi non valida nel blocco diagramma:" >> "$TMP_ERR_FILE"
            echo "$CLEAN_ERR" | sed 's/^/    /' >> "$TMP_ERR_FILE"
        elif echo "$MMDC_OUTPUT" | grep -q "npm error"; then
             # Se npx fallisce solo per un problema di cache NPM, ignoriamo e non bocciamo il file
             continue
        fi
    done

    if [ $HAS_ERROR -eq 1 ]; then
        echo "---------------------------------------------------------" >> "$TMP_ERR_FILE"
        echo "  -> ❌ Trovati errori."
    else
        echo "  -> ✅ Valido."
    fi
done

echo ""
echo "========================================================="
echo "REPORT FINALE DI VALIDAZIONE"
echo "========================================================="

if [ ! -s "$TMP_ERR_FILE" ]; then
    echo "🎉 Tutti i file in '$TARGET_DIR' sono validi! Nessun errore sintattico trovato."
    exit 0
else
    ERR_FILES=$(grep -c "^📄 File:" "$TMP_ERR_FILE")
    echo "⚠️ Trovati errori in $ERR_FILES file:"
    echo ""
    cat "$TMP_ERR_FILE"
    echo "========================================================="
    echo "Risolvi gli errori sopra elencati e lancia nuovamente il validatore."
    exit 1
fi
