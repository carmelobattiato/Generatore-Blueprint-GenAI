import puppeteer from 'puppeteer';

(async () => {
  console.log('[TEST] Avvio browser headless...');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  let hasOklchError = false;

  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('oklch')) {
      console.error('[ERRORE CATTURATO IN CONSOLE]:', msg.text());
      hasOklchError = true;
    } else if (msg.type() === 'error') {
      console.error('[ERRORE BROWSER]:', msg.text());
    } else {
      console.log('[LOG BROWSER]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    if (err.message.includes('oklch')) {
      console.error('[ERRORE FATALE CATTURATO]:', err.message);
      hasOklchError = true;
    }
  });

  try {
    console.log('[TEST] Navigazione verso http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    console.log('[TEST] Selezione del tab Reader...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const readerBtn = buttons.find(b => b.textContent.includes('Blueprint Reader'));
      if (readerBtn) readerBtn.click();
    });

const wait = (ms) => new Promise(res => setTimeout(res, ms));

    await wait(1000);

    console.log('[TEST] Clic sul pulsante PDF...');
    await page.evaluate(() => {
      const pdfBtn = document.querySelector('button[title="PDF"]');
      if (pdfBtn) pdfBtn.click();
    });

    console.log('[TEST] Attesa completamento PDF (5 secondi)...');
    await wait(5000);

    if (hasOklchError) {
      console.log('\n❌ TEST FALLITO: L\'errore oklch si è verificato!');
      process.exit(1);
    } else {
      console.log('\n✅ TEST PASSATO: Nessun errore oklch rilevato, il PDF è stato elaborato.');
      process.exit(0);
    }
  } catch (e) {
    console.error('[TEST] Errore di esecuzione:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
