#!/bin/bash

# Script per creare un backup dell'intera directory di lavoro
# I file verranno salvati nella cartella "Backup" con un nome basato su data e ora.

# 1. Creazione della cartella Backup se non esiste (un livello sopra)
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../Backup"
mkdir -p "$BACKUP_DIR"

# 2. Generazione del timestamp nel formato YYYYMMDD_HHMMSS
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 3. Nomi file: quello normale e quello di errore
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz"
BACKUP_FILE_ERR="$BACKUP_DIR/backup_${TIMESTAMP}_ERR.tar.gz"
TAR_LOG=$(mktemp)

echo "Inizio creazione del backup: $BACKUP_FILE"

# Funzione conversione dimensioni leggibili
human_size() {
    local bytes=$1
    if   [ "$bytes" -ge $((1024*1024*1024)) ]; then
        printf "%.2f GB" "$(echo "scale=2; $bytes/1073741824" | bc)"
    elif [ "$bytes" -ge $((1024*1024)) ]; then
        printf "%.2f MB" "$(echo "scale=2; $bytes/1048576" | bc)"
    elif [ "$bytes" -ge 1024 ]; then
        printf "%.2f KB" "$(echo "scale=2; $bytes/1024" | bc)"
    else
        printf "%d B" "$bytes"
    fi
}

# Elenco esclusioni condiviso (file applicativi volatili e cartelle non utili)
TAR_EXCLUDES=(
  --exclude='../Backup'
  --exclude='./.git'
  --exclude='./.claude'
  --exclude='*/node_modules'
  --exclude='./.app.pids'
  --exclude='./database.db'
  --exclude='./backend.log'
  --exclude='./frontend.log'
  --exclude='./*.log'
  --exclude='./Output'
  --exclude='./*.tmp'
  --exclude='./**/.tmp_*'
)

# 4. Calcolo dimensione originale
ORIGINAL_SIZE=$(tar -cf - "${TAR_EXCLUDES[@]}" . 2>/dev/null | wc -c)

# 5. Compressione — stderr su file di log temporaneo
tar -czf "$BACKUP_FILE" "${TAR_EXCLUDES[@]}" . 2>"$TAR_LOG"

TAR_EXIT=$?

# Exit code 1 = warning "file changed as we read it" (app in esecuzione) — non è un errore fatale
# Exit code 2 = errore fatale
if [ $TAR_EXIT -le 1 ]; then
    COMPRESSED_SIZE=$(stat -c%s "$BACKUP_FILE")
    LIST=$(tar -tf "$BACKUP_FILE")
    FILE_COUNT=$(echo "$LIST" | grep -v "/$" | wc -l)
    DIR_COUNT=$(echo "$LIST" | grep "/$" | grep -v "^\./$" | wc -l)
    RATIO=$(echo "scale=1; (($ORIGINAL_SIZE - $COMPRESSED_SIZE) * 100) / $ORIGINAL_SIZE" | bc)

    echo ""
    echo "📦 File compressi    : $FILE_COUNT file in $DIR_COUNT cartelle"
    echo "📂 Dimensione orig   : $(human_size "$ORIGINAL_SIZE")"
    echo "🗜  Dimensione gz     : $(human_size "$COMPRESSED_SIZE")"
    echo "📉 Compressione      : ${RATIO}%"

    # Mantiene solo gli ultimi 20 backup OK (non conta gli _ERR)
    BACKUPS_TO_KEEP=20
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | grep -v '_ERR' | wc -l)
    DELETED_COUNT=0
    if [ "$BACKUP_COUNT" -gt "$BACKUPS_TO_KEEP" ]; then
        DELETED_COUNT=$((BACKUP_COUNT - BACKUPS_TO_KEEP))
        ls -1t "$BACKUP_DIR"/backup_*.tar.gz | grep -v '_ERR' | tail -n "$DELETED_COUNT" | xargs rm -f
    fi

    echo "🗑️  Vecchi backup eliminati: $DELETED_COUNT"
    echo ""
    if [ $TAR_EXIT -eq 1 ]; then
        echo "⚠️  Alcuni file sono cambiati durante il backup (app in esecuzione) — ignorato."
    fi
    echo "✅ Backup completato con successo: $BACKUP_FILE"
    rm -f "$TAR_LOG"
else
    echo ""
    echo "❌ Errore durante la creazione del backup (exit code: $TAR_EXIT)"
    echo ""

    # Mostra gli errori di tar
    if [ -s "$TAR_LOG" ]; then
        echo "📋 Dettaglio errori tar:"
        cat "$TAR_LOG" | sed 's/^/   /'
    fi

    # Rinomina il file parziale con _ERR se esiste
    if [ -f "$BACKUP_FILE" ]; then
        PARTIAL_SIZE=$(stat -c%s "$BACKUP_FILE")
        mv "$BACKUP_FILE" "$BACKUP_FILE_ERR"
        echo ""
        echo "⚠️  File parziale salvato come: $BACKUP_FILE_ERR"
        echo "   Dimensione parziale: $(human_size "$PARTIAL_SIZE")"
    else
        echo "⚠️  Nessun file parziale generato."
    fi

    # Info di sistema utili al debug
    echo ""
    echo "🔍 Info debug:"
    echo "   Spazio disco disponibile: $(df -h . | awk 'NR==2{print $4}') liberi su $(df -h . | awk 'NR==2{print $2}')"
    echo "   Directory corrente: $(pwd)"
    echo "   Permessi Backup/: $(ls -ld "$BACKUP_DIR")"

    rm -f "$TAR_LOG"
    exit 1
fi
