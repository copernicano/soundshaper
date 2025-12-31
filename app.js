/**
 * Soundshaper - App principale
 * Gestisce UI e coordinamento moduli
 */

// Elementi UI
const btnFile = document.getElementById('btn-file');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnMic = document.getElementById('btn-mic');
const btnSettings = document.getElementById('btn-settings');
const fileInput = document.getElementById('file-input');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const micIndicator = document.getElementById('mic-indicator');
const sourceIndicator = document.getElementById('source-indicator');
const trackName = document.getElementById('track-name');
const debugOverlay = document.getElementById('debug-overlay');

// Elementi Settings
const settingsPanel = document.getElementById('settings-panel');
const closeSettings = document.getElementById('close-settings');
const resetSettings = document.getElementById('reset-settings');
const sliderSize = document.getElementById('s-size');
const sliderGlow = document.getElementById('s-glow');
const sliderSpread = document.getElementById('s-spread');
const sliderParticles = document.getElementById('s-particles');
const sliderLines = document.getElementById('s-lines');

// LocalStorage key per settings
const SETTINGS_KEY = 'soundshaper-visual-settings';

// Defaults per settings
const DEFAULT_SETTINGS = {
    sizeScale: 1.0,
    bloomScale: 1.0,
    spreadScale: 1.0,
    particleScale: 1.0,
    connectionScale: 1.0
};

// Stato UI
let trackNameTimeout = null;

// Stato Playlist
let playlist = [];           // Array di {file, name}
let currentTrackIndex = 0;
const MAX_PLAYLIST_SIZE = 20;

/**
 * Inizializza l'applicazione
 */
function init() {
    // Inizializza visual engine
    initVisualEngine();

    // Carica settings salvati
    loadSettings();

    // Setup event listeners
    setupEventListeners();

    // Registra Service Worker
    registerServiceWorker();

    // Mostra debug overlay in development
    // debugOverlay.classList.add('visible');

    console.log('Soundshaper inizializzato');
}

/**
 * Registra Service Worker per PWA
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('SW registrato:', registration.scope);
            })
            .catch((error) => {
                console.log('SW registrazione fallita:', error);
            });
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Click su bottone file
    btnFile.addEventListener('click', () => {
        fileInput.click();
    });

    // File selezionati (supporta selezione multipla)
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Limita il numero di file
        if (files.length > MAX_PLAYLIST_SIZE) {
            showToast(`Max ${MAX_PLAYLIST_SIZE} file`);
            files.length = MAX_PLAYLIST_SIZE;
        }

        // Sostituisce la playlist esistente
        playlist = files.map(file => ({
            file: file,
            name: file.name.replace(/\.[^/.]+$/, '') // Rimuovi estensione
        }));
        currentTrackIndex = 0;

        // Avvia la prima traccia
        await playTrack(0);

        // Reset input per permettere ri-selezione
        fileInput.value = '';
    });

    // Click su bottone play/pause
    btnPlay.addEventListener('click', () => {
        const state = getAudioState();

        if (state.source === 'file') {
            if (state.isPlaying) {
                pauseAudio();
                updateUIState('file_loaded');
            } else {
                playAudio();
                updateUIState('file_playing');
            }
        } else if (state.source === 'mic') {
            stopMicrophone();
            updateUIState('idle');
        }
    });

    // Click su bottone microfono
    btnMic.addEventListener('click', async () => {
        const state = getAudioState();

        if (state.source === 'mic') {
            // Già attivo, disattiva
            stopMicrophone();
            updateUIState('idle');
        } else {
            // Attiva microfono
            const result = await startMicrophone();

            if (result === true) {
                updateUIState('mic_active');
            } else if (result === 'denied') {
                showToast('Permesso microfono negato');
            } else {
                showToast('Errore accesso microfono');
            }
        }
    });

    // Click su bottone precedente
    btnPrev.addEventListener('click', () => {
        if (playlist.length > 1) {
            skipTrack(-1);
        }
    });

    // Click su bottone successivo
    btnNext.addEventListener('click', () => {
        if (playlist.length > 1) {
            skipTrack(1);
        }
    });

    // Gestione fine riproduzione
    onPlaybackEnded = () => {
        // Auto-avanza alla traccia successiva
        if (playlist.length > 1 && currentTrackIndex < playlist.length - 1) {
            playTrack(currentTrackIndex + 1);
        } else if (playlist.length > 1) {
            // Fine playlist, torna all'inizio ma non avvia
            currentTrackIndex = 0;
            showToast('Playlist terminata');
            updateUIState('file_loaded');
        } else {
            updateUIState('file_loaded');
        }
    };

    // Resume audio context su interazione (iOS)
    document.addEventListener('click', () => {
        resumeAudioContext();
    }, { once: true });

    // Keyboard shortcuts (debug)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'd') {
            debugOverlay.classList.toggle('visible');
        }
    });

    // === SETTINGS EVENT LISTENERS ===

    // Apri/chiudi settings panel
    btnSettings.addEventListener('click', () => {
        toggleSettingsPanel();
    });

    closeSettings.addEventListener('click', () => {
        toggleSettingsPanel(false);
    });

    // Reset settings
    resetSettings.addEventListener('click', () => {
        resetToDefaults();
    });

    // Slider handlers con live update
    sliderSize.addEventListener('input', (e) => {
        updateSliderValue(e.target);
        applySettings();
    });

    sliderGlow.addEventListener('input', (e) => {
        updateSliderValue(e.target);
        applySettings();
    });

    sliderSpread.addEventListener('input', (e) => {
        updateSliderValue(e.target);
        applySettings();
    });

    sliderParticles.addEventListener('input', (e) => {
        updateSliderValue(e.target);
        applySettings();
    });

    sliderLines.addEventListener('input', (e) => {
        updateSliderValue(e.target);
        applySettings();
    });

    // Salva settings quando si chiude il panel (evento change)
    [sliderSize, sliderGlow, sliderSpread, sliderParticles, sliderLines].forEach(slider => {
        slider.addEventListener('change', () => {
            saveSettings();
        });
    });
}

/**
 * Aggiorna stato UI
 */
function updateUIState(state) {
    // Reset
    btnPlay.classList.add('hidden');
    btnPrev.classList.add('hidden');
    btnNext.classList.add('hidden');
    micIndicator.classList.add('hidden');
    btnMic.classList.remove('active');
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');

    // Mostra prev/next se playlist ha più di una traccia
    const hasPlaylist = playlist.length > 1;

    switch (state) {
        case 'idle':
            sourceIndicator.classList.remove('visible');
            break;

        case 'file_loaded':
            btnPlay.classList.remove('hidden');
            if (hasPlaylist) {
                btnPrev.classList.remove('hidden');
                btnNext.classList.remove('hidden');
            }
            iconPlay.classList.remove('hidden');
            iconPause.classList.add('hidden');
            sourceIndicator.textContent = hasPlaylist ? `📁 ${currentTrackIndex + 1}/${playlist.length}` : '📁 File';
            sourceIndicator.classList.add('visible');
            break;

        case 'file_playing':
            btnPlay.classList.remove('hidden');
            if (hasPlaylist) {
                btnPrev.classList.remove('hidden');
                btnNext.classList.remove('hidden');
            }
            iconPlay.classList.add('hidden');
            iconPause.classList.remove('hidden');
            sourceIndicator.textContent = hasPlaylist ? `▶️ ${currentTrackIndex + 1}/${playlist.length}` : '▶️ Playing';
            sourceIndicator.classList.add('visible');
            break;

        case 'mic_active':
            btnPlay.classList.remove('hidden');
            iconPlay.classList.add('hidden');
            iconPause.classList.remove('hidden');
            micIndicator.classList.remove('hidden');
            btnMic.classList.add('active');
            sourceIndicator.textContent = '🎤 Microfono';
            sourceIndicator.classList.add('visible');
            // Resetta playlist quando si usa il mic
            playlist = [];
            break;
    }
}

/**
 * Mostra nome traccia
 */
function showTrackName(name) {
    // Rimuovi estensione
    const displayName = name.replace(/\.[^/.]+$/, '');
    trackName.textContent = displayName;
    trackName.classList.add('visible');

    // Nascondi dopo 4 secondi
    if (trackNameTimeout) {
        clearTimeout(trackNameTimeout);
    }
    trackNameTimeout = setTimeout(() => {
        trackName.classList.remove('visible');
    }, 4000);
}

/**
 * Mostra toast message
 */
function showToast(message) {
    // Usa track name element come toast temporaneo
    trackName.textContent = message;
    trackName.classList.add('visible');

    if (trackNameTimeout) {
        clearTimeout(trackNameTimeout);
    }
    trackNameTimeout = setTimeout(() => {
        trackName.classList.remove('visible');
    }, 3000);
}

/**
 * Riproduce una traccia specifica dalla playlist
 */
async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    currentTrackIndex = index;
    const track = playlist[index];

    const success = await loadAudioFile(track.file);
    if (success) {
        // Mostra nome traccia con numero se playlist > 1
        if (playlist.length > 1) {
            showTrackName(`${index + 1}/${playlist.length} - ${track.name}`);
        } else {
            showTrackName(track.name);
        }

        playAudio();
        updateUIState('file_playing');
    } else {
        showToast('Errore caricamento traccia');
        // Prova la prossima
        if (index < playlist.length - 1) {
            playTrack(index + 1);
        }
    }
}

/**
 * Salta alla traccia precedente o successiva
 */
function skipTrack(direction) {
    let newIndex = currentTrackIndex + direction;

    // Wrap around
    if (newIndex < 0) {
        newIndex = playlist.length - 1;
    } else if (newIndex >= playlist.length) {
        newIndex = 0;
    }

    playTrack(newIndex);
}

// =============================================
// SETTINGS FUNCTIONS
// =============================================

/**
 * Toggle pannello settings
 */
function toggleSettingsPanel(forceState) {
    const isVisible = settingsPanel.classList.contains('visible');
    const shouldShow = forceState !== undefined ? forceState : !isVisible;

    if (shouldShow) {
        settingsPanel.classList.remove('hidden');
        // Trigger reflow per animazione
        settingsPanel.offsetHeight;
        settingsPanel.classList.add('visible');
    } else {
        settingsPanel.classList.remove('visible');
        // Salva quando si chiude
        saveSettings();
    }
}

/**
 * Aggiorna valore visualizzato dello slider
 */
function updateSliderValue(slider) {
    const val = slider.parentElement.querySelector('.val');
    if (val) {
        val.textContent = parseFloat(slider.value).toFixed(1);
    }
}

/**
 * Applica settings al visual engine
 */
function applySettings() {
    const settings = {
        sizeScale: parseFloat(sliderSize.value),
        bloomScale: parseFloat(sliderGlow.value),
        spreadScale: parseFloat(sliderSpread.value),
        particleScale: parseFloat(sliderParticles.value),
        connectionScale: parseFloat(sliderLines.value)
    };

    // Chiama la funzione nel visual engine
    if (typeof updateVisualSettings === 'function') {
        updateVisualSettings(settings);
    }
}

/**
 * Carica settings da localStorage
 */
function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            const settings = JSON.parse(saved);

            // Applica ai sliders
            if (settings.sizeScale !== undefined) {
                sliderSize.value = settings.sizeScale;
                updateSliderValue(sliderSize);
            }
            if (settings.bloomScale !== undefined) {
                sliderGlow.value = settings.bloomScale;
                updateSliderValue(sliderGlow);
            }
            if (settings.spreadScale !== undefined) {
                sliderSpread.value = settings.spreadScale;
                updateSliderValue(sliderSpread);
            }
            if (settings.particleScale !== undefined) {
                sliderParticles.value = settings.particleScale;
                updateSliderValue(sliderParticles);
            }
            if (settings.connectionScale !== undefined) {
                sliderLines.value = settings.connectionScale;
                updateSliderValue(sliderLines);
            }

            // Applica al visual engine
            applySettings();
            console.log('Settings caricati:', settings);
        }
    } catch (e) {
        console.warn('Errore caricamento settings:', e);
    }
}

/**
 * Salva settings su localStorage
 */
function saveSettings() {
    try {
        const settings = {
            sizeScale: parseFloat(sliderSize.value),
            bloomScale: parseFloat(sliderGlow.value),
            spreadScale: parseFloat(sliderSpread.value),
            particleScale: parseFloat(sliderParticles.value),
            connectionScale: parseFloat(sliderLines.value)
        };

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        console.log('Settings salvati:', settings);
    } catch (e) {
        console.warn('Errore salvataggio settings:', e);
    }
}

/**
 * Reset settings ai valori default
 */
function resetToDefaults() {
    // Resetta sliders
    sliderSize.value = DEFAULT_SETTINGS.sizeScale;
    sliderGlow.value = DEFAULT_SETTINGS.bloomScale;
    sliderSpread.value = DEFAULT_SETTINGS.spreadScale;
    sliderParticles.value = DEFAULT_SETTINGS.particleScale;
    sliderLines.value = DEFAULT_SETTINGS.connectionScale;

    // Aggiorna valori visualizzati
    [sliderSize, sliderGlow, sliderSpread, sliderParticles, sliderLines].forEach(updateSliderValue);

    // Applica e salva
    applySettings();
    saveSettings();

    showToast('Settings resettati');
}

// Avvia app quando DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
