# Libreria dei Grafici Avanzati in Markdown (Mermaid)

Di seguito trovi esempi di come il Markdown può generare grafici complessi, planimetrie di progetto e mappe mentali digitando solo semplice testo.

---

## 1. Grafico a Torta (Data Visualization)
Un grafico a torta vettoriale semplice per visualizzare percentuali o dati.

```mermaid
pie title Distribuzione delle tecnologie per la documentazione
    "Markdown" : 65
    "HTML / CSS" : 15
    "LaTeX" : 10
    "Word / PDF" : 10
```

---

## 2. Diagramma di Gantt (Project Management)
Perfetto per mostrare le tempistiche di un progetto, le dipendenze tra i task e lo stato di avanzamento.

```mermaid
gantt
    title Sviluppo di una nuova App
    dateFormat  YYYY-MM-DD
    section Fase di Design
    Wireframe           :done,    des1, 2026-04-01,2026-04-05
    Approvazione UI     :active,  des2, 2026-04-06, 3d
    section Sviluppo
    Database setup      :         dev1, after des1, 5d
    Sviluppo API        :         dev2, after dev1, 7d
    Front-end           :         dev3, after des2, 10d
    section Testing
    Test di Sicurezza   :         test1, after dev2, 5d
```

---

## 3. Diagramma di Flusso Avanzato (con stili, colori e sottogruppi)
I flowchart possono diventare molto complessi, gestendo raggruppamenti (subgraph) e stili CSS personalizzati (colori, bordi tratteggiati, forme diverse).

```mermaid
graph TD
    subgraph Frontend
        A([Utente]) -->|Inserisce credenziali| B{Login valido?}
    end
    
    subgraph Backend
        B -- Sì --> C[(Database<br>Utenti)]
        B -- No -.-> D[Mostra Errore]
        C --> E[Carica Dashboard]
    end

    %% Stili personalizzati
    style A fill:#f9f,stroke:#333,stroke-width:4px
    style C fill:#f96,stroke:#f00,stroke-width:2px,stroke-dasharray: 5 5
    style B fill:#bbf,stroke:#00f
```

---

## 4. Diagramma di Sequenza (Architettura Software)
Ideale per mostrare come diversi sistemi "parlano" tra loro nel tempo. Utilissimo per documentare le API o i processi di rete.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant Server
    participant Banca

    Cliente->>Server: Richiesta di acquisto (Carrello)
    activate Server
    Server->>Banca: Verifica disponibilità carta
    activate Banca
    Banca-->>Server: Transazione autorizzata
    deactivate Banca
    Server-->>Cliente: Ricevuta di acquisto
    deactivate Server
```

---

## 5. Mappa Mentale (Mindmap)
Ideale per il brainstorming e prendere appunti. Si basa sull'indentazione del testo per creare automaticamente i rami vettoriali.

```mermaid
mindmap
  root((Markdown))
    Vantaggi
      (Leggero)
      [Portabile]
      {{Versatile}}
    Sintassi
      Titoli
      Elenchi
      **Grassetto**
    Estensioni
      Mermaid
      KaTeX per la Matematica
      Admonitions
```

---

## 6. Diagramma delle Ramificazioni Git (GitGraph)
Se lavori nello sviluppo software, questo grafico ti permette di disegnare la storia dei commit e dei branch del codice senza dover fare screenshot al terminale.

```mermaid
gitGraph
    commit id: "Inizio progetto"
    branch sviluppo
    checkout sviluppo
    commit id: "Aggiunta login"
    commit id: "Bug fix UI"
    checkout main
    merge sviluppo
    branch hotfix
    checkout hotfix
    commit id: "Risolto crash server"
    checkout main
    merge hotfix
```

---

## 7. Timeline (Cronologia)
Perfetto per mostrare eventi storici, la cronologia di un'azienda o le tappe di una roadmap.

```mermaid
timeline
    title Storia del Markdown
    2004 : Nasce il Markdown
         : Creato da John Gruber e Aaron Swartz
    2014 : Arriva CommonMark
         : Standardizzazione della sintassi
    2015 : Nasce Mermaid.js
         : Grafici testuali integrati
    2020+ : Boom del Personal Knowledge
          : Obsidian, Roam Research, Notion
```

---

## 8. Diagramma a Quadranti (Business / Analisi)
Ottimo per l'analisi strategica, come le matrici SWOT o la priorità dei compiti (es. Matrice di Eisenhower).

```mermaid
quadrantChart
    title Priorità delle attività di oggi
    x-axis "Basso Sforzo" --> "Alto Sforzo"
    y-axis "Bassa Importanza" --> "Alta Importanza"
    quadrant-1 "Fallo subito"
    quadrant-2 "Pianificalo"
    quadrant-3 "Ignoralo"
    quadrant-4 "Delegane la gestione"
    "Rispondere alle email":[0.2, 0.4]
    "Sviluppare nuova feature": [0.8, 0.9]
    "Riunione di 3 ore": [0.9, 0.3]
    "Fixare bug critico": [0.3, 0.9]
```
