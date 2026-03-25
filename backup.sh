#!/bin/bash

# Script per creare un backup dell'intera directory di lavoro
# I file verranno salvati nella cartella "Backup" con un nome basato su data e ora.

# 1. Creazione della cartella Backup se non esiste
mkdir -p Backup

# 2. Generazione del timestamp nel formato YYYYMMDD_HHMMSS
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 3. Nome del file di backup
BACKUP_FILE="Backup/backup_${TIMESTAMP}.tar.gz"

echo "Inizio creazione del backup: $BACKUP_FILE"

# 4. Compressione di tutti i file e cartelle, escludendo esplicitamente la cartella Backup stessa
# Viene utilizzato tar -czf invece di zip per creare un archivio compresso tar.gz
tar -czf "$BACKUP_FILE" --exclude='./Backup' --exclude='.*/' --exclude='.*' . > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Backup completato con successo: $BACKUP_FILE"
else
    echo "❌ Errore durante la creazione del backup."
    exit 1
fi
