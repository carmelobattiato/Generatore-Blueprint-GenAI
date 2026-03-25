#!/bin/bash

# Script per aggiornare il progetto scaricando i file più recenti da GitHub
# Repository: https://github.com/carmelobattiato/Generatore-Blueprint-GenAI

REPO_URL="https://github.com/carmelobattiato/Generatore-Blueprint-GenAI"
TEMP_DIR="repo_temp_update"

echo "🚀 Inizio aggiornamento del progetto da GitHub..."

# 1. Verifica se git è installato
if ! command -v git &> /dev/null; then
    echo "❌ Errore: 'git' non è installato. Impossibile procedere."
    exit 1
fi

# 2. Esecuzione del backup preventivo
if [ -f "./backup.sh" ]; then
    echo "📦 Eseguo backup preventivo dei file attuali..."
    ./backup.sh
else
    echo "⚠️ Avviso: backup.sh non trovato. Procedo senza backup automatico."
fi

# 3. Clonazione della repository in una cartella temporanea
echo "📥 Clonazione dei file più recenti..."
rm -rf "$TEMP_DIR"
git clone --depth 1 "$REPO_URL" "$TEMP_DIR" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Errore durante la clonazione della repository."
    exit 1
fi

# 4. Sincronizzazione dei file (sovrascrittura selettiva)
# Escludiamo .git e cartelle di dati generate localmente se necessario
echo "🔄 Sincronizzazione file in corso..."
rsync -av --exclude='.git' --exclude='Backup/' --exclude='Blueprint/' "$TEMP_DIR/" .

# 5. Pulizia
rm -rf "$TEMP_DIR"

# 6. Ripristino permessi esecuzione per gli script
chmod +x *.sh

echo "---------------------------------------------------------"
echo "✅ Aggiornamento completato con successo!"
echo "I file sono ora allineati alla versione presente su GitHub."
echo "Nota: Le cartelle 'Blueprint/' e 'Backup/' sono state preservate."
