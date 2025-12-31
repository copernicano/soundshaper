# Soundshaper

**Emotional Music Visualizer** - Trasforma la musica in forme visive emozionali tramite un sistema di particelle Three.js reattivo.

## Caratteristiche

- **8 Stati Emotivi**: Malinconia, Serenità, Gioia, Tensione, Nostalgia, Mistero, Potenza, Trascendenza
- **Analisi Audio Real-time**: 4 parametri (Energia, Profondità, Velocità, Varianza)
- **Sistema Particelle Avanzato**: Glow, connessioni, movimenti specifici per emozione
- **Transizioni Fluide**: Interpolazione smooth tra stati emotivi (~2-3 secondi)
- **Doppia Sorgente Audio**: File MP3 o Microfono
- **Playlist Multi-file**: Supporto fino a 20 tracce con auto-advance
- **Ottimizzazione Mobile**: Scale factors automatici per schermi < 600px
- **Settings Personalizzabili**: Size, Glow, Spread, Particles, Lines
- **PWA Completa**: Funziona offline, installabile su mobile/desktop

## Architettura

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Audio Source│────▶│ audio-analyzer.js│────▶│ 4 Parametri      │
│ (file/mic)  │     │ (Web Audio API)  │     │ (0-1 ciascuno)   │
└─────────────┘     └──────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Three.js    │◀────│ visual-engine.js │◀────│ transitions.js   │
│ Render      │     │ (particelle)     │     │ (interpolazione) │
└─────────────┘     └──────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │ emotions.js      │
                                             │ (8 definizioni)  │
                                             └──────────────────┘
```

## File Structure

```
Symbolizer/
├── index.html          # Entry point, canvas, UI overlay
├── style.css           # Stili fullscreen, UI, settings panel
├── app.js              # Coordinamento, event handling, playlist
├── audio-analyzer.js   # Web Audio API, estrazione parametri
├── visual-engine.js    # Three.js, sistema particelle, shaders
├── emotions.js         # 8 emozioni con condizioni e visual
├── transitions.js      # Interpolazione fluida tra stati
├── sw.js               # Service Worker per cache offline
├── manifest.json       # PWA manifest per installazione
├── icon-192.png        # Icona PWA 192x192
├── icon-512.png        # Icona PWA 512x512
└── README.md           # Questa documentazione
```

## Emozioni e Condizioni

| Emozione     | Energia | Profondità | Velocità | Varianza | Colore          |
|--------------|---------|------------|----------|----------|-----------------|
| Malinconia   | Bassa   | Alta       | Lenta    | Bassa    | Blu petrolio    |
| Serenità     | Media   | Media      | Calma    | Stabile  | Azzurro cielo   |
| Gioia        | Alta    | Bassa      | Vivace   | Dinamica | Giallo sole     |
| Tensione     | Alta    | Media      | Variabile| Molto alta| Rosso scuro    |
| Nostalgia    | Media   | Media      | Lenta    | Moderata | Seppia/ambra    |
| Mistero      | Bassa   | Media      | Lenta    | Moderata | Viola profondo  |
| Potenza      | Alta    | Alta       | Ritmica  | Dinamica | Arancione fuoco |
| Trascendenza | Variabile| Bassa     | Fluida   | Costante | Arcobaleno      |

## Movimenti Particelle

- **wave**: Onde sinusoidali morbide (Serenità)
- **fall**: Caduta con gravità (Malinconia)
- **explode**: Esplosione dal centro (Gioia)
- **shatter**: Movimenti bruschi caotici (Tensione)
- **spiral-down**: Spirale discendente (Nostalgia)
- **drift**: Deriva lenta casuale (Mistero)
- **pulse**: Onde d'urto radiali (Potenza)
- **vortex-up**: Vortice ascendente (Trascendenza)

## Settings Utente

Accessibili tramite icona ⚙️:

| Parametro  | Range     | Default | Descrizione                    |
|------------|-----------|---------|--------------------------------|
| Size       | 0.3 - 2.0 | 1.0     | Dimensione particelle          |
| Glow       | 0.0 - 1.5 | 1.0     | Intensità bloom (0=off)        |
| Spread     | 0.5 - 2.0 | 1.0     | Dispersione particelle         |
| Particles  | 0.3 - 1.5 | 1.0     | Numero particelle              |
| Lines      | 0.0 - 1.0 | 1.0     | Linee connessione (0=off)      |

I settings sono salvati in `localStorage` e persistono tra sessioni.

## Ottimizzazione Mobile

Su schermi < 600px vengono applicati automaticamente:

| Parametro    | Desktop | Mobile |
|--------------|---------|--------|
| Particelle   | 100%    | 50%    |
| Dimensione   | 100%    | 60%    |
| Bloom        | 100%    | 30%    |
| Spread       | 100%    | 150%   |
| Connessioni  | 100%    | 40%    |

## Controlli UI

```
[📁 File]  [⏮ Prev]  [⏸ Play/Pause]  [⏭ Next]  [🎤 Mic]  [⚙️ Settings]
```

- **File**: Carica uno o più file audio (max 20)
- **Prev/Next**: Navigazione playlist (visibili solo con 2+ tracce)
- **Play/Pause**: Toggle riproduzione/pausa
- **Mic**: Toggle microfono (disattiva audio file)
- **Settings**: Apre pannello personalizzazione

## Keyboard Shortcuts

- `D`: Toggle debug overlay (mostra parametri audio)

## PWA Features

Il manifest include:
- `display: fullscreen` con fallback a standalone
- `file_handlers`: Apri file audio direttamente
- `share_target`: Ricevi audio da condivisione
- `shortcuts`: Accesso rapido a File e Mic
- `screenshots`: Per store listing

### PWABuilder

Per generare pacchetti nativi:
1. Pubblica su HTTPS (es. GitHub Pages)
2. Vai su [pwabuilder.com](https://www.pwabuilder.com)
3. Inserisci URL
4. Genera pacchetti per Windows, Android, iOS

**Nota**: Servono gli screenshot:
- `screenshot-wide.png` (1280x720) per desktop
- `screenshot-mobile.png` (390x844) per mobile

## Requisiti Browser

- Chrome 80+ / Edge 80+ / Firefox 75+ / Safari 14+
- Web Audio API
- WebGL 2.0
- getUserMedia (per microfono)

## Performance

- Target: 30 FPS stabili
- Max particelle: 800 (400 su mobile)
- Smoothing transizioni: 0.08-0.12 factor
- FFT size: 2048

## Licenza

Progetto personale - Tutti i diritti riservati.

---

*Creato con Three.js e Web Audio API*
