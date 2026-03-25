#!/bin/bash

# Configura le tue credenziali locali se necessario (se è il primo utilizzo di Git su questo terminale)
git config --global user.name "Carmelo Battiato"
git config --global user.email "carmelo.battiato84@gmail.com"

# 1. Inizializzazione Repository se assente
if [ ! -d ".git" ]; then
    echo "📦 Inizializzazione del repository Git locale in corso..."
    git init
    git branch -M main
    git remote add origin https://github.com/carmelobattiato/Generatore-Blueprint-GenAI.git
fi

# 2. Richiesta Messaggio di Commit
echo ""
read -p "📝 Inserisci il messaggio del commit (premi INVIO per usare 'Aggiornamento'): " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Aggiornamento repository GenAI Blueprint"
fi

# 3. Aggiunta File e Commit
echo "⏳ Sto aggiungendo i file e creando il commit..."
git add .
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    echo "ℹ️ Nessun cambiamento da committare."
    exit 0
fi

# 4. Richiesta Password / Personal Access Token
echo ""
echo "⚠️ ATTENZIONE: GitHub non accetta più le password del profilo da linea di comando."
echo "⚠️ Incolla qui il tuo Personal Access Token (PAT) per autorizzare l'operazione."
read -s -p "🔑 Token GitHub (il testo sarà invisibile mentre digiti): " GITHUB_TOKEN
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Errore: Nessun token inserito. Operazione annullata."
    exit 1
fi

# 5. Push verso il server remoto utilizzando il token inserito
echo "🚀 Invio dei file su GitHub in corso..."
# Nota: Questa sintassi inserisce il token direttamente nell'URL per bypassare l'autenticazione interattiva
git push https://carmelobattiato:${GITHUB_TOKEN}@github.com/carmelobattiato/Generatore-Blueprint-GenAI.git main

if [ $? -eq 0 ]; then
    echo "✅ Push completato con successo! Il tuo codice è online."
else
    echo "❌ Errore durante il push. Verifica che il tuo Token sia corretto e abbia il permesso 'repo'."
fi
