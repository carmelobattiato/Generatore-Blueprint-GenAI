async function testBlueprintData() {
  const API_BASE = 'http://localhost:5000/api';
  console.log('--- 🔍 Test Integrità Dati Blueprint ---');

  try {
    // 1. Prendi la lista
    const listRes = await fetch(`${API_BASE}/blueprints`);
    const files = await listRes.json();
    console.log(`✅ Connessione OK. Trovati ${files.length} blueprint.`);

    if (files.length === 0) return console.log('❌ Nessun file trovato.');

    // 2. Prendi un file a caso
    const randomFile = files[Math.floor(Math.random() * files.length)].name;
    console.log(`📡 Tentativo di lettura file: ${randomFile}...`);

    const fileRes = await fetch(`${API_BASE}/blueprints/${randomFile}`);
    const data = await fileRes.json();
    const content = data.content || data;

    console.log(`✅ Dati Ricevuti! Lunghezza contenuto: ${content.length} caratteri.`);
    
    if (content.includes('```mermaid')) {
      console.log('📊 Il file contiene grafici Mermaid (possibile causa di freeze se html2canvas fallisce il rendering vettoriale).');
    }

    console.log('--- ✨ Test completato con successo ---');
  } catch (err) {
    console.error('❌ ERRORE NELLA CHIAMATA DATI:', err.message);
  }
}

testBlueprintData();
