---
title: "Cheatsheet del Markdown Avanzato"
author: "Assistente AI"
date: 2026-03-25
tags: [tutorial, tech, markdown, avanzato]
status: "completato"
---

<!-- Il blocco qui sopra (tra i tre trattini) è il FRONTMATTER (Punto 6). Non viene mostrato nel testo, ma salva i metadati del file. -->

# Guida alle funzioni avanzate di Markdown

Di seguito troverai un indice generato automaticamente e un esempio pratico per ogni funzione avanzata.

<!-- Punto 7: Generazione dell'indice -->
[TOC]

---

## 1. Formule Matematiche (KaTeX/MathJax)
Possiamo scrivere formule in linea, come l'equazione di Einstein $E = mc^2$, oppure in blocco:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

## 2. Blocchi di avviso (Admonitions)
I callout sono ottimi per evidenziare messaggi importanti nella documentazione:

> [!NOTE]
> Questa è una nota generale che dà un'informazione in più al lettore.

>[!WARNING]
> Attenzione: non tutti i processori Markdown supportano i callout in modo nativo!

## 3. Elementi Interattivi (Menu a tendina HTML)
Se hai un blocco di testo molto lungo, puoi nasconderlo in un menu espandibile:

<details>
  <summary>👉 Clicca qui per scoprire un segreto!</summary>
  
  Sorpresa! Il Markdown supporta pienamente l'HTML. Puoi usare questo trucco per nascondere lunghe porzioni di codice o spoiler.
</details>

## 4. Task List (Liste interattive)
Ecco la lista della spesa o delle cose da fare. Su piattaforme come GitHub, puoi spuntare le caselle direttamente cliccandoci sopra!

- [x] Fare la struttura del documento
- [x] Inserire le formule matematiche
- [ ] Comprare il latte
- [ ] Conquistare il mondo

## 5. Note a piè di pagina (Footnotes)
Il Markdown è un linguaggio di markup meraviglioso[^1]. È usato da milioni di sviluppatori ogni giorno[^2].

## 8. Renderizzazioni visive specifiche (Dati GeoJSON)
Se carichi questo file su GitHub, il seguente blocco di codice non verrà mostrato come testo, ma come **una mappa interattiva** che punta su Roma:

```geojson
{
  "type": "Point",
  "coordinates": [12.4924, 41.8902]
}
```

## 9. Tabelle Avanzate e Liste di Definizioni

**Lista di definizioni:**
Markdown
: Un linguaggio di marcatura leggero con sintassi di formattazione del testo in chiaro.

HTML
: Il linguaggio di markup standard per la creazione di pagine web.

**Tabella formattata (con allineamenti):**
| Prodotto (Sinistra) | Prezzo (Centro) | Quantità (Destra) |
| :--- | :---: | ---: |
| Tastiera | 45.00 € | 2 |
| Mouse | 25.50 € | 15 |
| Monitor HD | 150.00 € | 1 |

## 10. Collegamenti bidirezionali (Wikilinks)
Se hai un archivio di appunti collegati (come in Obsidian), puoi creare una rete di link interni. Ad esempio:
Oggi ho imparato ad usare bene il [[Markdown Avanzato]] e lo userò nel mio progetto sul [[Personal Knowledge Management]].

---

<!-- Qui sotto vengono renderizzate le note a piè di pagina (Punto 5) -->
[^1]: Creato originariamente nel 2004 da John Gruber e Aaron Swartz.
[^2]: Soprattutto per scrivere file README o documentazioni tecniche.
