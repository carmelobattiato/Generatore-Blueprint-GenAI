#!/bin/bash

# Script per caricare automaticamente le modifiche e le blueprint su GitHub.
# Usa "git config credential.helper store" per salvare il token la prima volta, evitando di chiederlo ai successivi lanci.

REPO_URL="https://github.com/carmelobattiato/Generatore-Blueprint-GenAI.git"

echo "📦 Verifica e allineamento repository Git..."

# 1. Inizializzazione se non esiste la repo
if [ ! -d ".git" ]; then
    echo "⚠️ Repository non inizializzato localmente. Procedo con 'git init'..."
    git init
    git remote add origin "$REPO_URL"
    git fetch origin
    git checkout -b main
    git reset --mixed origin/main
fi

# 2. Configura Git per "ricordare" le credenziali permanentemente
git config credential.helper store

# 3. Richiesta Messaggio di Commit
read -p "📝 Inserisci il messaggio del commit (premi INVIO per 'Aggiornamento'): " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Aggiornamento file e Blueprint GenAI"
fi

# 4. Git Add e Commit
echo "⏳ Sto aggiungendo le modifiche all'indice..."
git add .

# Tenta il commit. Se non ci sono modifiche locali (es. commit pendenti passati), prosegue senza interrompersi.
git commit -m "$COMMIT_MSG" > /dev/null 2>&1 || echo "ℹ️ Nessun nuovo file da committare. Procedo con il controllo dei push pendenti..."

# 5. Git Pull preventivo (con rebase) e Push
echo "🚀 Sincronizzazione con GitHub in corso..."
git pull origin main --rebase

echo "Inviando le modifiche al remoto..."
git push origin main

if [ $? -eq 0 ]; then
    echo "---------------------------------------------------------"
    echo "✅ Push completato con successo! Tutto allineato su GitHub."
else
    echo "---------------------------------------------------------"
    echo "❌ Errore durante il push. Se è la prima volta, ti verrà chiesto il Token PAT (Personal Access Token)."
    echo "Assicurati di inserire un token valido con permessi 'repo'. Il token inserito verrà salvato e non più richiesto."
    exit 1
fi
