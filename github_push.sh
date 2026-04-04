#!/bin/bash

# Script per caricare automaticamente le modifiche e le blueprint su GitHub.

REPO_URL="https://github.com/carmelobattiato/Generatore-Blueprint-GenAI.git"
GITHUB_USER="carmelobattiato"

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

# 2. Richiesta Messaggio di Commit
read -p "📝 Inserisci il messaggio del commit (premi INVIO per 'Aggiornamento'): " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Aggiornamento file e Blueprint GenAI"
fi

# 3. Git Add e Commit
echo "⏳ Sto aggiungendo le modifiche all'indice..."
git add .
git commit -m "$COMMIT_MSG" > /dev/null 2>&1 || echo "ℹ️ Nessun nuovo file da committare. Procedo con il controllo dei push pendenti..."

# 4. Sincronizzazione
echo "🚀 Sincronizzazione con GitHub in corso..."

# Tentativo di Pull
git pull origin main --rebase > /dev/null 2>&1

echo "Inviando le modifiche al remoto..."

# Rimuovi il prompt interattivo di git per forzare il fallimento se manca l'autenticazione
env GIT_TERMINAL_PROMPT=0 git push origin main

if [ $? -ne 0 ]; then
    echo "---------------------------------------------------------"
    echo "⚠️ Autenticazione richiesta o token scaduto/mancante."
    echo "GitHub richiede un Personal Access Token (PAT) invece della password."
    echo "Puoi generarlo su: https://github.com/settings/tokens (Permesso richiesto: 'repo')"
    
    read -s -p "🔑 Incolla il tuo Token PAT: " GITHUB_TOKEN
    echo ""
    
    if [ -n "$GITHUB_TOKEN" ]; then
        echo "🔄 Aggiorno l'URL del remote con il nuovo token..."
        # Riscrive l'URL del remote includendo il token per l'autenticazione automatica
        AUTH_REPO_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/Generatore-Blueprint-GenAI.git"
        git remote set-url origin "$AUTH_REPO_URL"
        
        echo "🚀 Riprovo il push..."
        git push origin main
        
        if [ $? -eq 0 ]; then
            echo "✅ Push completato con successo! Token salvato nel remote origin."
        else
            echo "❌ Errore durante il push. Verifica che il Token sia valido e abbia i permessi 'repo'."
            exit 1
        fi
    else
        echo "❌ Nessun token inserito. Push annullato."
        exit 1
    fi
else
    echo "---------------------------------------------------------"
    echo "✅ Push completato con successo! Tutto allineato su GitHub."
fi
