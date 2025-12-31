/**
 * Soundshaper - Analizzatore Audio
 * Gestisce Web Audio API e estrazione parametri emotivi
 */

// Stato audio
let audioContext = null;
let analyser = null;
let gainNode = null;
let sourceNode = null;
let audioBuffer = null;
let isPlaying = false;
let startTime = 0;
let pauseTime = 0;

// Sorgente corrente
let currentSource = null; // 'file' | 'mic' | null
let micStream = null;

// Buffer per analisi
let frequencyData = null;
let timeDomainData = null;

// Storia per calcolo varianza
const energyHistory = [];
const HISTORY_SIZE = 60; // ~2 secondi a 30fps

// Parametri emotivi correnti
let currentParams = {
    energia: 0,
    profondita: 0,
    velocita: 0,
    varianza: 0
};

// Valore precedente per onset detection
let previousEnergy = 0;

/**
 * Inizializza l'audio context
 */
function initAudio() {
    if (audioContext) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        // GainNode per controllo volume e routing pulito
        gainNode = audioContext.createGain();
        gainNode.gain.value = 1;

        // Connessione fissa: analyser → gain → destination
        analyser.connect(gainNode);
        gainNode.connect(audioContext.destination);

        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        timeDomainData = new Uint8Array(analyser.fftSize);

        console.log('Audio inizializzato');
    } catch (err) {
        console.error('Errore inizializzazione audio:', err);
    }
}

/**
 * Riprende AudioContext se suspended (necessario su iOS)
 */
async function resumeAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }
}

/**
 * Carica un file audio
 */
async function loadAudioFile(file) {
    initAudio();
    await resumeAudioContext();

    // Ferma sorgente corrente
    stopCurrentSource();

    try {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        currentSource = 'file';
        return true;
    } catch (err) {
        console.error('Errore decodifica audio:', err);
        return false;
    }
}

/**
 * Avvia riproduzione file
 */
function playAudio() {
    if (!audioBuffer || currentSource !== 'file') return false;
    if (isPlaying) return true;

    try {
        // Crea nuovo source node (necessario ogni volta)
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;

        // Connetti solo al analyser (che è già connesso a destination)
        sourceNode.connect(analyser);

        sourceNode.onended = () => {
            if (isPlaying) {
                isPlaying = false;
                pauseTime = 0;
                if (typeof onPlaybackEnded === 'function') {
                    onPlaybackEnded();
                }
            }
        };

        const offset = pauseTime;
        sourceNode.start(0, offset);
        startTime = audioContext.currentTime - offset;
        isPlaying = true;

        console.log('Riproduzione avviata');
        return true;
    } catch (err) {
        console.error('Errore avvio riproduzione:', err);
        return false;
    }
}

/**
 * Pausa riproduzione
 */
function pauseAudio() {
    if (!isPlaying || currentSource !== 'file') return;

    try {
        pauseTime = audioContext.currentTime - startTime;
        if (sourceNode) {
            sourceNode.stop();
            sourceNode.disconnect();
            sourceNode = null;
        }
        isPlaying = false;
        console.log('Riproduzione in pausa');
    } catch (err) {
        console.error('Errore pausa:', err);
        isPlaying = false;
    }
}

/**
 * Ferma riproduzione
 */
function stopAudio() {
    try {
        if (sourceNode && isPlaying) {
            sourceNode.stop();
            sourceNode.disconnect();
        }
        sourceNode = null;
        isPlaying = false;
        pauseTime = 0;
    } catch (err) {
        console.error('Errore stop:', err);
        sourceNode = null;
        isPlaying = false;
        pauseTime = 0;
    }
}

/**
 * Attiva microfono
 */
async function startMicrophone() {
    initAudio();
    await resumeAudioContext();

    // Ferma sorgente corrente
    stopCurrentSource();

    try {
        console.log('Richiedo accesso microfono...');
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Accesso microfono ottenuto, creo source node...');
        sourceNode = audioContext.createMediaStreamSource(micStream);
        console.log('Source node creato, connetto ad analyser...');

        // Disconnetti TUTTO per evitare feedback e problemi di routing
        try { analyser.disconnect(); } catch(e) {}
        try { gainNode.disconnect(); } catch(e) {}

        // Per mic: solo source → analyser (nessun output)
        sourceNode.connect(analyser);
        console.log('Connesso: mic → analyser (no output)');

        currentSource = 'mic';
        console.log('Microfono attivato, currentSource:', currentSource);
        return true;
    } catch (err) {
        console.error('Errore accesso microfono:', err);
        // Ripristina connessioni in caso di errore
        try { gainNode.connect(audioContext.destination); } catch(e) {}
        if (err.name === 'NotAllowedError') {
            return 'denied';
        }
        return false;
    }
}

/**
 * Ferma microfono
 */
function stopMicrophone() {
    console.log('Stopping microphone...');
    try {
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            micStream = null;
        }

        if (sourceNode) {
            try { sourceNode.disconnect(); } catch(e) {}
            sourceNode = null;
        }

        // Riconnetti la catena audio per file: analyser → gainNode → destination
        try {
            analyser.connect(gainNode);
            gainNode.connect(audioContext.destination);
            console.log('Catena audio ripristinata: analyser → gain → dest');
        } catch(e) {
            console.error('Errore ripristino catena:', e);
        }

        // IMPORTANTE: resetta currentSource
        currentSource = null;
        console.log('Microfono disattivato, currentSource:', currentSource);
    } catch (err) {
        console.error('Errore stop microfono:', err);
        currentSource = null;
    }
}

/**
 * Ferma qualsiasi sorgente corrente
 */
function stopCurrentSource() {
    console.log('stopCurrentSource, current:', currentSource);

    if (currentSource === 'file') {
        stopAudio();
    } else if (currentSource === 'mic') {
        // stopMicrophone già setta currentSource = null
        stopMicrophone();
        return; // stopMicrophone ha già gestito tutto
    }

    currentSource = null;
}

/**
 * Callback quando la riproduzione termina
 */
function onPlaybackEnded() {
    // Verrà sovrascritta da app.js
}

/**
 * Analizza audio ed estrae parametri emotivi
 */
function analyzeAudio() {
    if (!analyser || !currentSource) {
        return currentParams;
    }

    // Ottieni dati frequenza e tempo
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeDomainData);

    // 1. ENERGIA (RMS normalizzata) - RIDOTTA sensibilità
    let sum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        sum += frequencyData[i];
    }
    const avg = sum / frequencyData.length / 255;
    currentParams.energia = Math.min(1, Math.pow(avg, 0.7) * 1.5); // Curva più morbida

    // 2. PROFONDITÀ (rapporto basse frequenze)
    // Bin 0 = DC offset (skip), bins 1-20 = bass (~20-430Hz), bins 21-80 = mid, 81+ = high
    const bassStart = 1;   // Skip DC
    const bassEnd = 20;    // ~430Hz
    const midEnd = 80;     // ~1720Hz
    let bassSum = 0;
    let midHighSum = 0;

    for (let i = bassStart; i < frequencyData.length; i++) {
        const value = frequencyData[i];
        if (i <= bassEnd) {
            bassSum += value;
        } else {
            midHighSum += value;
        }
    }

    // Rapporto bass vs mid+high (non vs totale)
    const totalMeaningful = bassSum + midHighSum;
    if (totalMeaningful > 100 && currentParams.energia > 0.02) {
        // Solo se c'è abbastanza segnale (soglie basse per mic)
        currentParams.profondita = bassSum / totalMeaningful;
        currentParams.profondita = Math.min(1, currentParams.profondita * 2.5);
    } else {
        // Segnale troppo basso, usa valore neutro
        currentParams.profondita = 0.25;
    }

    // 3. VELOCITÀ - basata su variazione frame-to-frame
    const energyDiff = Math.abs(currentParams.energia - previousEnergy);
    // Smooth con media mobile
    const velocityRaw = energyDiff * 15;
    currentParams.velocita = currentParams.velocita * 0.7 + Math.min(1, velocityRaw) * 0.3;
    previousEnergy = currentParams.energia;

    // 4. VARIANZA - CORRETTA: usa storia dell'energia RAW (non smoothed)
    const rawEnergy = avg; // Valore non processato
    energyHistory.push(rawEnergy);
    if (energyHistory.length > HISTORY_SIZE) {
        energyHistory.shift();
    }

    if (energyHistory.length >= 20) {
        const mean = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
        let varianceSum = 0;
        for (let i = 0; i < energyHistory.length; i++) {
            varianceSum += Math.pow(energyHistory[i] - mean, 2);
        }
        const stdDev = Math.sqrt(varianceSum / energyHistory.length);
        currentParams.varianza = Math.min(1, stdDev * 8);
    } else {
        currentParams.varianza = 0.2; // Default durante warmup
    }

    return currentParams;
}

/**
 * Ottieni stato corrente
 */
function getAudioState() {
    return {
        source: currentSource,
        isPlaying: isPlaying,
        hasAudio: audioBuffer !== null || currentSource === 'mic'
    };
}

/**
 * Ottieni parametri emotivi correnti
 */
function getEmotionalParams() {
    return currentParams;
}

/**
 * Ottieni dati frequenza grezzi
 */
function getFrequencyData() {
    return frequencyData;
}
