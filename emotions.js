/**
 * Soundshaper - Definizione delle 8 emozioni
 * Ogni emozione ha condizioni di attivazione e parametri visivi
 */

const EMOTIONS = {
    malinconia: {
        name: 'malinconia',
        conditions: {
            energia: [0, 0.35],      // Bassa energia
            profondita: [0.45, 1],   // Bassi FORTI (distingue da trascendenza)
            velocita: [0, 0.2],      // Molto lento
            varianza: [0, 0.25]      // Molto costante
        },
        visual: {
            particleCount: 350,
            color: { h: 220, s: 0.7, l: 0.35 }, // Blu petrolio
            movement: 'fall',
            speed: 0.3,
            gravity: 0.4,
            particleSize: [3, 7],
            connections: false,
            trail: 0.5,
            spread: 0.4
        }
    },

    serenita: {
        name: 'serenita',
        conditions: {
            energia: [0.2, 0.5],     // Media-bassa
            profondita: [0.15, 0.5], // Bilanciato
            velocita: [0, 0.3],      // Calmo
            varianza: [0, 0.35]      // Stabile
        },
        visual: {
            particleCount: 400,
            color: { h: 190, s: 0.65, l: 0.55 }, // Azzurro cielo
            movement: 'wave',
            speed: 0.4,
            gravity: 0,
            particleSize: [4, 9],
            connections: true,
            connectionOpacity: 0.4,
            trail: 0.3,
            spread: 0.6
        }
    },

    gioia: {
        name: 'gioia',
        conditions: {
            energia: [0.35, 1],      // Alta energia (range più ampio)
            profondita: [0, 0.55],   // Non troppi bassi
            velocita: [0.18, 1],     // Movimento vivace
            varianza: [0.12, 1]      // Dinamico
        },
        visual: {
            particleCount: 600,
            color: { h: 45, s: 0.95, l: 0.6 }, // Giallo sole
            movement: 'explode',
            speed: 2.0,
            gravity: -0.25,
            particleSize: [4, 12],
            connections: false,
            trail: 0.15,
            spread: 1.0,
            colorShift: true
        }
    },

    tensione: {
        name: 'tensione',
        conditions: {
            energia: [0.35, 1],      // Media-alta
            profondita: [0.25, 0.8], // Bassi moderati
            velocita: [0.2, 0.8],    // Variabile
            varianza: [0.35, 1]      // MOLTO variabile
        },
        visual: {
            particleCount: 450,
            color: { h: 0, s: 0.85, l: 0.35 }, // Rosso scuro
            movement: 'shatter',
            speed: 2.2,
            gravity: 0,
            particleSize: [2, 6],
            connections: true,
            connectionStyle: 'jagged',
            trail: 0.08,
            spread: 0.75,
            cameraShake: 0.4
        }
    },

    nostalgia: {
        name: 'nostalgia',
        conditions: {
            energia: [0.25, 0.55],   // Media
            profondita: [0.2, 0.6],  // Bassi medi
            velocita: [0.05, 0.35],  // Lento
            varianza: [0.1, 0.45]    // Qualche variazione
        },
        visual: {
            particleCount: 280,
            color: { h: 35, s: 0.55, l: 0.5 }, // Seppia/ambra
            movement: 'spiral-down',
            speed: 0.35,
            gravity: 0.2,
            particleSize: [5, 12],
            connections: false,
            trail: 0.6,
            spread: 0.45,
            vignette: 0.5
        }
    },

    mistero: {
        name: 'mistero',
        conditions: {
            energia: [0.1, 0.45],    // Bassa-media
            profondita: [0.25, 0.75], // Bassi moderati (più cupo)
            velocita: [0, 0.18],     // Molto lento
            varianza: [0.2, 0.55]    // Variazione moderata (unpredictable)
        },
        visual: {
            particleCount: 200,
            color: { h: 270, s: 0.65, l: 0.3 }, // Viola profondo
            movement: 'drift',
            speed: 0.2,
            gravity: 0,
            particleSize: [4, 14],
            connections: false,
            trail: 0.55,
            spread: 0.85,
            fog: 0.6,
            fadeInOut: true
        }
    },

    potenza: {
        name: 'potenza',
        conditions: {
            energia: [0.6, 1],       // ALTA
            profondita: [0.5, 1],    // Bassi forti
            velocita: [0.2, 0.7],    // Ritmico
            varianza: [0.2, 0.7]     // Dinamico
        },
        visual: {
            particleCount: 500,
            color: { h: 15, s: 0.95, l: 0.45 }, // Arancione fuoco
            movement: 'pulse',
            speed: 2.0,
            gravity: 0,
            particleSize: [4, 16],
            connections: true,
            connectionStyle: 'bold',
            connectionOpacity: 0.5,
            trail: 0.18,
            spread: 0.65,
            cameraShake: 0.6,
            bloom: 0.5
        }
    },

    trascendenza: {
        name: 'trascendenza',
        conditions: {
            energia: [0.1, 0.7],     // Anche bassa (musica eterea quieta)
            profondita: [0, 0.4],    // Pochi bassi (voci, archi, ambient)
            velocita: [0, 0.22],     // Molto lento/fluido
            varianza: [0, 0.3]       // Costante, sostenuto
        },
        visual: {
            particleCount: 700,
            color: 'rainbow',
            movement: 'vortex-up',
            speed: 0.9,
            gravity: -0.5,
            particleSize: [3, 8],
            connections: true,
            connectionOpacity: 0.25,
            trail: 0.35,
            spread: 0.55,
            bloom: 0.6,
            colorShift: true
        }
    }
};

// Lista ordinata delle emozioni per iterazione
const EMOTION_LIST = Object.values(EMOTIONS);

// Emozione di default
const DEFAULT_EMOTION = EMOTIONS.serenita;
