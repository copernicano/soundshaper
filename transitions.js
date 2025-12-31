/**
 * Soundshaper - Sistema di transizioni fluide
 * Gestisce l'interpolazione tra stati emotivi
 */

// Pesi smoothed delle emozioni
let smoothedWeights = EMOTION_LIST.map(() => 0);
smoothedWeights[1] = 1; // Inizia con serenità

// Parametri visivi correnti interpolati
let currentVisual = { ...DEFAULT_EMOTION.visual };

// Emozione dominante corrente (per UI)
let dominantEmotion = DEFAULT_EMOTION;

// Costanti
const SMOOTHING_FACTOR = 0.08; // Transizione in ~2-3 secondi a 30fps

/**
 * Interpolazione lineare
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Interpolazione hue con wraparound (es: 350° → 10° passa per 0°)
 */
function lerpHue(h1, h2, t) {
    const diff = h2 - h1;

    if (Math.abs(diff) > 180) {
        if (diff > 0) {
            h1 += 360;
        } else {
            h2 += 360;
        }
    }

    let result = lerp(h1, h2, t);
    if (result >= 360) result -= 360;
    if (result < 0) result += 360;

    return result;
}

/**
 * Calcola quanto un valore matcha un range [min, max]
 * Ritorna 1 se dentro, 0 se fuori, graduale ai bordi
 */
function matchRange(value, range) {
    const [min, max] = range;
    const margin = 0.1; // Bordo sfumato

    if (value < min - margin || value > max + margin) {
        return 0;
    }

    if (value >= min && value <= max) {
        return 1;
    }

    // Sfumatura ai bordi
    if (value < min) {
        return 1 - (min - value) / margin;
    }

    return 1 - (value - max) / margin;
}

/**
 * Calcola il peso di un'emozione basandosi sui parametri audio
 */
function calculateEmotionWeight(audioParams, emotion) {
    const conditions = emotion.conditions;

    // Prodotto dei match (tutti devono matchare)
    let weight = 1;
    weight *= matchRange(audioParams.energia, conditions.energia);
    weight *= matchRange(audioParams.profondita, conditions.profondita);
    weight *= matchRange(audioParams.velocita, conditions.velocita);
    weight *= matchRange(audioParams.varianza, conditions.varianza);

    return weight;
}

/**
 * Calcola i pesi di tutte le emozioni
 */
function calculateEmotionWeights(audioParams) {
    const weights = EMOTION_LIST.map(e => calculateEmotionWeight(audioParams, e));

    // Normalizza (somma = 1)
    const total = weights.reduce((a, b) => a + b, 0);

    if (total === 0) {
        // Fallback a serenità se nessuna emozione matcha
        return EMOTION_LIST.map((_, i) => i === 1 ? 1 : 0);
    }

    return weights.map(w => w / total);
}

/**
 * Aggiorna lo stato emotivo con smoothing temporale
 */
function updateEmotionalState(audioParams) {
    // Calcola pesi grezzi
    const rawWeights = calculateEmotionWeights(audioParams);

    // Applica smoothing temporale
    smoothedWeights = smoothedWeights.map((sw, i) =>
        lerp(sw, rawWeights[i], SMOOTHING_FACTOR)
    );

    // Trova emozione dominante
    let maxWeight = 0;
    let maxIndex = 1;
    smoothedWeights.forEach((w, i) => {
        if (w > maxWeight) {
            maxWeight = w;
            maxIndex = i;
        }
    });
    dominantEmotion = EMOTION_LIST[maxIndex];

    // Interpola parametri visivi
    interpolateVisuals();

    return {
        weights: smoothedWeights,
        dominant: dominantEmotion,
        visual: currentVisual
    };
}

/**
 * Interpola tutti i parametri visivi basandosi sui pesi
 */
function interpolateVisuals() {
    // Particelle (media pesata)
    currentVisual.particleCount = 0;
    currentVisual.speed = 0;
    currentVisual.gravity = 0;
    currentVisual.trail = 0;
    currentVisual.spread = 0;
    currentVisual.cameraShake = 0;
    currentVisual.bloom = 0;
    currentVisual.vignette = 0;
    currentVisual.fog = 0;

    // Colore (interpolazione HSL)
    let hSum = 0, sSum = 0, lSum = 0;
    let hCount = 0;

    // Size range
    let minSize = 0, maxSize = 0;

    // Movimento dominante (quello con peso maggiore)
    let maxMovementWeight = 0;

    EMOTION_LIST.forEach((emotion, i) => {
        const w = smoothedWeights[i];
        if (w < 0.001) return; // Ignora pesi trascurabili

        const v = emotion.visual;

        currentVisual.particleCount += v.particleCount * w;
        currentVisual.speed += v.speed * w;
        currentVisual.gravity += v.gravity * w;
        currentVisual.trail += v.trail * w;
        currentVisual.spread += v.spread * w;
        currentVisual.cameraShake += (v.cameraShake || 0) * w;
        currentVisual.bloom += (v.bloom || 0) * w;
        currentVisual.vignette += (v.vignette || 0) * w;
        currentVisual.fog += (v.fog || 0) * w;

        // Size
        minSize += v.particleSize[0] * w;
        maxSize += v.particleSize[1] * w;

        // Colore (gestisci rainbow separatamente)
        if (v.color !== 'rainbow') {
            hSum += v.color.h * w;
            sSum += v.color.s * w;
            lSum += v.color.l * w;
            hCount += w;
        }

        // Movimento
        if (w > maxMovementWeight) {
            maxMovementWeight = w;
            currentVisual.movement = v.movement;
        }

        // Connections
        if (w > 0.3) {
            currentVisual.connections = v.connections;
            currentVisual.connectionOpacity = v.connectionOpacity || 0.2;
            currentVisual.connectionStyle = v.connectionStyle || 'normal';
        }

        // Effetti speciali
        if (v.fadeInOut && w > 0.3) currentVisual.fadeInOut = true;
        if (v.colorShift && w > 0.3) currentVisual.colorShift = true;
    });

    currentVisual.particleCount = Math.round(currentVisual.particleCount);
    currentVisual.particleSize = [minSize, maxSize];

    // Colore finale
    if (hCount > 0) {
        currentVisual.color = {
            h: hSum / hCount,
            s: sSum / hCount,
            l: lSum / hCount
        };
    } else {
        // Rainbow mode (trascendenza dominante)
        currentVisual.color = 'rainbow';
    }
}

/**
 * Ottieni i parametri visivi correnti
 */
function getCurrentVisual() {
    return currentVisual;
}

/**
 * Ottieni l'emozione dominante
 */
function getDominantEmotion() {
    return dominantEmotion;
}

/**
 * Ottieni i pesi smoothed
 */
function getSmoothedWeights() {
    return smoothedWeights;
}

/**
 * Reset allo stato iniziale
 */
function resetEmotionalState() {
    smoothedWeights = EMOTION_LIST.map((_, i) => i === 1 ? 1 : 0);
    dominantEmotion = DEFAULT_EMOTION;
    currentVisual = { ...DEFAULT_EMOTION.visual };
}
