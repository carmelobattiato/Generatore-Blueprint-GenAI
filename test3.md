# Oltre il Markdown: Potenza dell'HTML integrato

Il Markdown puro non supporta layout complessi, animazioni o l'inclusione nativa di riproduttori video. Tuttavia, usando l'HTML, possiamo abbattere questi limiti.

---

## 1. Disegno Vettoriale Avanzato e Animato (Puro SVG)
Il Markdown non può disegnare liberamente. Mermaid genera grafici logici, ma se vuoi creare vere e proprie **illustrazioni vettoriali con animazioni**, puoi iniettare codice `<svg>`. 

*Qui sotto un "Sole" con una sfumatura (gradient) che "pulsa" usando un'animazione nativa SVG.*

<div style="display: flex; justify-content: center; margin: 20px 0;">
  <svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <!-- Definizione della sfumatura di colore -->
    <defs>
      <linearGradient id="fuoco" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFD700; stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FF4500; stop-opacity:1" />
      </linearGradient>
      
      <!-- Ombra esterna -->
      <filter id="glow">
        <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Il cerchio animato -->
    <circle cx="100" cy="100" r="60" fill="url(#fuoco)" filter="url(#glow)">
      <!-- Animazione del raggio per l'effetto pulsante -->
      <animate attributeName="r" values="60; 75; 60" dur="2s" repeatCount="indefinite" />
    </circle>

    <!-- Testo centrato -->
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="20" font-family="Arial, sans-serif" font-weight="bold">
      PULSE
    </text>
  </svg>
</div>

---

## 2. Layout Complesso: Tabelle di Pricing in CSS (Flexbox)
Il Markdown offre solo tabelle classiche rigide. Se devi creare delle "Card" affiancate, magari per i prezzi di un software o per le schede di un prodotto, hai bisogno del CSS.

<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; text-align: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin-top: 30px;">
  
  <!-- Prima Card: Piano Base -->
  <div style="border: 1px solid #ddd; border-radius: 12px; padding: 25px; width: 220px; box-shadow: 2px 2px 15px rgba(0,0,0,0.05); background-color: #fafafa; color: #333;">
    <h3 style="margin-top: 0; color: #555;">Piano Base</h3>
    <p style="font-size: 28px; font-weight: bold; margin: 10px 0; color: #4CAF50;">Gratis</p>
    <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;">
    <p style="margin: 5px 0; font-size: 14px;">✔ 1 Utente</p>
    <p style="margin: 5px 0; font-size: 14px;">✔ 5 GB di Spazio</p>
    <p style="margin: 5px 0; font-size: 14px; color: #aaa;">✖ Supporto Prioritario</p>
    <button style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; width: 100%; margin-top: 15px; font-weight: bold;">Seleziona</button>
  </div>

  <!-- Seconda Card: Piano Pro (Evidenziata con stili avanzati) -->
  <div style="border: 2px solid #2196F3; border-radius: 12px; padding: 25px; width: 220px; box-shadow: 0px 8px 20px rgba(33, 150, 243, 0.25); background-color: #ffffff; transform: scale(1.05); color: #333;">
    <h3 style="margin-top: 0; color: #2196F3;">Piano PRO</h3>
    <p style="font-size: 28px; font-weight: bold; margin: 10px 0; color: #2196F3;">9.99€<span style="font-size: 14px; font-weight: normal; color: #666;"> /mese</span></p>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
    <p style="margin: 5px 0; font-size: 14px;">✔ 10 Utenti</p>
    <p style="margin: 5px 0; font-size: 14px;">✔ 500 GB di Spazio</p>
    <p style="margin: 5px 0; font-size: 14px;">✔ Supporto 24/7</p>
    <button style="background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; width: 100%; margin-top: 15px; font-weight: bold;">Acquista Ora</button>
  </div>

</div>

---

## 3. Embedding di File Multimediali (Audio e Video HTML5)
Mentre in Markdown puoi inserire immagini (`![alt](link)`), non c'è una sintassi standard per riprodurre video o audio integrati con controlli di riproduzione. Ecco come si fa in HTML:

### Lettore Audio nativo
Ottimo per inserire podcast o registrazioni vocali nei tuoi appunti.

<div style="background-color: #f1f3f4; padding: 15px; border-radius: 8px; max-width: 400px; display: flex; align-items: center; gap: 15px;">
  <span style="font-size: 24px;">🎧</span>
  <audio controls style="width: 100%; outline: none;">
    <source src="https://www.w3schools.com/html/horse.mp3" type="audio/mpeg">
    Il tuo browser non supporta il tag audio.
  </audio>
</div>

### Lettore Video nativo (Responsive)
Con il tag video puoi applicare bordi arrotondati, ombre e adattare il video alla larghezza dello schermo (100%), cosa impossibile in Markdown.

<video width="100%" controls style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #ddd;">
  <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
  Il tuo browser non supporta il tag video.
</video>

---

## 4. Elementi interattivi tramite scorciatoie CSS (Bottoni e tag estetici)
Spesso nei documenti tecnici servono "tag" colorati per identificare la gravità di un bug, o pulsanti di download che sembrino reali.

*Stato del server:* <span style="background-color: #d4edda; color: #155724; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid #c3e6cb;">🟢 OPERATIVO</span>
*Ultimo backup:* <span style="background-color: #fff3cd; color: #856404; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid #ffeeba;">🟡 IN CORSO...</span>

<br>
<a href="#" style="display: inline-block; background-image: linear-gradient(45deg, #ff0844 0%, #ffb199 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-weight: bold; font-family: sans-serif; box-shadow: 0 4px 15px rgba(255, 8, 68, 0.4);">
  ⬇️ Scarica il Report (PDF)
</a>
