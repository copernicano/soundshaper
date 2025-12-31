/**
 * Soundshaper - Visual Engine ENHANCED
 * Sistema particelle avanzato con glow, trails e effetti wow
 * Con ottimizzazione mobile e settings utente
 */

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

// Mobile detection
let isMobile = window.innerWidth < 600;

// Base scale factors (device-based)
const BASE_PARTICLE_SCALE = isMobile ? 0.5 : 1.0;
const BASE_SIZE_SCALE = isMobile ? 0.6 : 1.0;
const BASE_BLOOM_SCALE = isMobile ? 0.3 : 1.0;
const BASE_SPREAD_SCALE = isMobile ? 1.5 : 1.0;
const BASE_CONNECTION_SCALE = isMobile ? 0.4 : 1.0;

// User settings multipliers (1.0 = default)
let userSettings = {
    sizeScale: 1.0,
    bloomScale: 1.0,
    spreadScale: 1.0,
    particleScale: 1.0,
    connectionScale: 1.0
};

// Effective scale factors (base * user)
let SIZE_SCALE = BASE_SIZE_SCALE * userSettings.sizeScale;
let BLOOM_SCALE = BASE_BLOOM_SCALE * userSettings.bloomScale;
let SPREAD_SCALE = BASE_SPREAD_SCALE * userSettings.spreadScale;
let PARTICLE_SCALE = BASE_PARTICLE_SCALE * userSettings.particleScale;
let CONNECTION_SCALE = BASE_CONNECTION_SCALE * userSettings.connectionScale;

const MAX_PARTICLES = Math.floor(800 * BASE_PARTICLE_SCALE); // Fixed at init

let scene, camera, renderer;
let particles, particleGeometry, particleMaterial;
let connectionLines, lineGeometry, lineMaterial;
let positions, colors, sizes, velocities, phases, lifetimes;

let lastFrameTime = 0;
let animationId = null;
let time = 0;
let beatPulse = 0;

let width, height;
let shakeIntensity = 0;

function initVisualEngine() {
    const canvas = document.getElementById('canvas');
    width = window.innerWidth;
    height = window.innerHeight;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);

    // Camera
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particelle
    createParticleSystem();

    // Connessioni
    createConnectionSystem();

    // Glow ambientale
    createAmbientGlow();

    // Resize
    window.addEventListener('resize', onWindowResize);

    // Start
    lastFrameTime = performance.now();
    animate(lastFrameTime);

    console.log('Visual Engine Enhanced avviato', isMobile ? '(Mobile Mode)' : '(Desktop Mode)');
    console.log(`Scale factors: Particles=${PARTICLE_SCALE}, Size=${SIZE_SCALE}, Bloom=${BLOOM_SCALE}, Spread=${SPREAD_SCALE}`);
}

function createParticleSystem() {
    particleGeometry = new THREE.BufferGeometry();

    positions = new Float32Array(MAX_PARTICLES * 3);
    colors = new Float32Array(MAX_PARTICLES * 3);
    sizes = new Float32Array(MAX_PARTICLES);
    velocities = new Float32Array(MAX_PARTICLES * 3);
    phases = new Float32Array(MAX_PARTICLES);
    lifetimes = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
        resetParticle(i, true);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Shader Material per glow (con uniforms dinamici)
    particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBeat: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() },
            uSizeScale: { value: SIZE_SCALE },
            uBloomScale: { value: BLOOM_SCALE }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float uBeat;
            uniform float uPixelRatio;
            uniform float uSizeScale;

            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                float pulse = 1.0 + uBeat * 0.5;
                // SIZE_SCALE applicato tramite uniform
                gl_PointSize = size * pulse * uPixelRatio * uSizeScale * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            uniform float uBloomScale;

            void main() {
                vec2 center = gl_PointCoord - 0.5;
                float dist = length(center);

                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha = pow(alpha, 1.5);

                // Core e glow controllati da uBloomScale uniform
                float coreIntensity = 0.6 * uBloomScale;
                float core = 1.0 - smoothstep(0.0, 0.15, dist);
                vec3 finalColor = vColor + core * coreIntensity;

                float glowIntensity = 0.4 * uBloomScale;
                float glow = exp(-dist * 3.5) * glowIntensity;
                finalColor += vColor * glow;

                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
}

function resetParticle(i, initial = false) {
    const i3 = i * 3;
    const spread = (initial ? 80 : 20) * SPREAD_SCALE;

    positions[i3] = (Math.random() - 0.5) * spread;
    positions[i3 + 1] = (Math.random() - 0.5) * spread;
    positions[i3 + 2] = (Math.random() - 0.5) * 30;

    velocities[i3] = (Math.random() - 0.5) * 2;
    velocities[i3 + 1] = (Math.random() - 0.5) * 2;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;

    phases[i] = Math.random() * Math.PI * 2;
    lifetimes[i] = 0.5 + Math.random() * 0.5;
    // Dimensione ridotta su mobile
    sizes[i] = (2 + Math.random() * 4) * SIZE_SCALE;
}

function createConnectionSystem() {
    // Meno connessioni su mobile
    const maxConnections = Math.floor(400 * CONNECTION_SCALE);
    lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(maxConnections * 6);
    const lineColors = new Float32Array(maxConnections * 6);

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: isMobile ? 0.25 : 0.4,  // Meno opache su mobile
        blending: THREE.AdditiveBlending
    });

    connectionLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(connectionLines);
}

function createAmbientGlow() {
    // Glow più piccolo e meno intenso su mobile
    const glowSize = isMobile ? 25 : 35;
    const glowGeo = new THREE.CircleGeometry(glowSize, 64);
    const glowMat = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0.2, 0.4, 0.8) },
            uIntensity: { value: 0.25 * BLOOM_SCALE }  // Bloom ridotto su mobile
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uIntensity;
            varying vec2 vUv;
            void main() {
                float dist = distance(vUv, vec2(0.5));
                float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * uIntensity;
                gl_FragColor = vec4(uColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.z = -15;
    glowMesh.name = 'ambientGlow';
    scene.add(glowMesh);
}

function updateParticles(visual, audioParams) {
    if (!visual) return;

    time += 0.02;

    const activeCount = Math.min(visual.particleCount || 400, MAX_PARTICLES);
    const movement = visual.movement || 'wave';
    const speed = (visual.speed || 0.5) * 1.5;
    const gravity = visual.gravity || 0;
    // Spread aumentato su mobile per evitare ammassamento
    const spread = (visual.spread || 0.6) * SPREAD_SCALE;
    const sizeRange = visual.particleSize || [3, 8];

    const energy = audioParams ? audioParams.energia : 0.3;
    const velocity = audioParams ? audioParams.velocita : 0.2;

    // Beat pulse
    beatPulse = beatPulse * 0.85 + velocity * 0.15;
    particleMaterial.uniforms.uBeat.value = beatPulse * 2;
    particleMaterial.uniforms.uTime.value = time;

    // Colore
    let baseHue, baseSat, baseLight;
    if (visual.color === 'rainbow') {
        baseHue = (time * 30) % 360;
        baseSat = 0.8;
        baseLight = 0.6;
    } else {
        baseHue = visual.color?.h || 200;
        baseSat = visual.color?.s || 0.7;
        baseLight = visual.color?.l || 0.5;
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
        const i3 = i * 3;

        if (i >= activeCount) {
            positions[i3 + 2] = -1000;
            continue;
        }

        lifetimes[i] -= 0.004;
        if (lifetimes[i] <= 0) resetParticle(i, false);

        const phase = phases[i];
        const e = 1 + energy * 2;

        switch (movement) {
            case 'wave':
                positions[i3] += Math.sin(time * 2 + phase) * speed * e * 0.5;
                positions[i3 + 1] += Math.cos(time * 1.5 + phase * 1.3) * speed * e * 0.3;
                positions[i3] *= 0.995;
                positions[i3 + 1] *= 0.995;
                if (Math.abs(positions[i3]) > 70 || Math.abs(positions[i3 + 1]) > 60) resetParticle(i, false);
                break;

            case 'fall':
                velocities[i3 + 1] -= gravity * 0.15;
                positions[i3] += velocities[i3] * speed * e;
                positions[i3 + 1] += velocities[i3 + 1] * speed;
                positions[i3] += Math.sin(time + phase) * 0.2;
                if (positions[i3 + 1] < -60) {
                    positions[i3] = (Math.random() - 0.5) * 80 * spread;
                    positions[i3 + 1] = 60 + Math.random() * 20;
                    velocities[i3] = (Math.random() - 0.5) * 0.5;
                    velocities[i3 + 1] = -Math.random() * 0.5;
                }
                break;

            case 'explode':
                const dx = positions[i3];
                const dy = positions[i3 + 1];
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
                const force = speed * e * 0.5;
                velocities[i3] += (dx / dist) * force;
                velocities[i3 + 1] += (dy / dist) * force - gravity;
                velocities[i3] *= 0.96;
                velocities[i3 + 1] *= 0.96;
                positions[i3] += velocities[i3];
                positions[i3 + 1] += velocities[i3 + 1];
                if (dist > 70 * spread || Math.random() < 0.008 * e) {
                    positions[i3] = (Math.random() - 0.5) * 15;
                    positions[i3 + 1] = (Math.random() - 0.5) * 15;
                    velocities[i3] = (Math.random() - 0.5) * 3;
                    velocities[i3 + 1] = Math.random() * 4;
                }
                break;

            case 'shatter':
                velocities[i3] += (Math.random() - 0.5) * speed * energy * 2;
                velocities[i3 + 1] += (Math.random() - 0.5) * speed * energy * 2;
                velocities[i3] *= 0.9;
                velocities[i3 + 1] *= 0.9;
                positions[i3] += velocities[i3] * e;
                positions[i3 + 1] += velocities[i3 + 1] * e;
                if (Math.abs(positions[i3]) > 60) { positions[i3] *= -0.3; velocities[i3] *= -0.5; }
                if (Math.abs(positions[i3 + 1]) > 50) { positions[i3 + 1] *= -0.3; velocities[i3 + 1] *= -0.5; }
                break;

            case 'spiral-down':
                const angle = time * speed * 0.8 + phase + positions[i3 + 1] * 0.03;
                const radius = (25 + Math.sin(phase * 2) * 10) * spread;
                positions[i3] = Math.cos(angle) * radius;
                positions[i3 + 2] = Math.sin(angle) * radius * 0.4;
                positions[i3 + 1] -= gravity * 0.8 + speed * 0.3;
                if (positions[i3 + 1] < -55) { positions[i3 + 1] = 55; phases[i] = Math.random() * Math.PI * 2; }
                break;

            case 'drift':
                positions[i3] += Math.sin(time * 0.4 + phase) * speed * 0.4;
                positions[i3 + 1] += Math.cos(time * 0.3 + phase * 1.5) * speed * 0.3;
                const driftDist = Math.sqrt(positions[i3] ** 2 + positions[i3 + 1] ** 2);
                if (driftDist > 55) { positions[i3] *= 0.98; positions[i3 + 1] *= 0.98; }
                break;

            case 'pulse':
                const pDist = Math.sqrt(positions[i3] ** 2 + positions[i3 + 1] ** 2) + 0.1;
                const wave = Math.sin(pDist * 0.15 - time * speed * 3) * e;
                const pAngle = Math.atan2(positions[i3 + 1], positions[i3]);
                positions[i3] += Math.cos(pAngle) * wave * speed * 2;
                positions[i3 + 1] += Math.sin(pAngle) * wave * speed * 2;
                if (pDist > 55 * spread) { positions[i3] *= 0.95; positions[i3 + 1] *= 0.95; }
                if (pDist < 3 || Math.random() < 0.003) {
                    const newAngle = Math.random() * Math.PI * 2;
                    const newDist = 10 + Math.random() * 30;
                    positions[i3] = Math.cos(newAngle) * newDist;
                    positions[i3 + 1] = Math.sin(newAngle) * newDist;
                }
                break;

            case 'vortex-up':
                const hFactor = (positions[i3 + 1] + 60) / 120;
                const vAngle = time * speed + phase + hFactor * Math.PI * 2;
                const vRadius = (35 - hFactor * 25) * spread;
                positions[i3] = Math.cos(vAngle) * vRadius;
                positions[i3 + 2] = Math.sin(vAngle) * vRadius * 0.4;
                positions[i3 + 1] -= gravity * 1.5;
                if (positions[i3 + 1] < -60) { positions[i3 + 1] = 60; phases[i] = Math.random() * Math.PI * 2; }
                break;

            default:
                positions[i3] += Math.sin(time * 2 + phase) * speed * 0.5;
                positions[i3 + 1] += Math.cos(time * 1.5 + phase) * speed * 0.3;
        }

        // Colore
        let hue = baseHue;
        if (visual.colorShift || visual.color === 'rainbow') {
            hue = (baseHue + i * 0.5 + positions[i3 + 1] * 0.5) % 360;
        }
        const rgb = hslToRgb(hue / 360, baseSat, baseLight + energy * 0.2);
        colors[i3] = rgb.r;
        colors[i3 + 1] = rgb.g;
        colors[i3 + 2] = rgb.b;

        // Size
        const baseSize = sizeRange[0] + (sizeRange[1] - sizeRange[0]) * (0.5 + Math.sin(phase) * 0.5);
        sizes[i] = baseSize * (1 + energy * 1.5) * (0.8 + Math.sin(time * 3 + phase) * 0.2);
    }

    // Connessioni
    updateConnections(visual, activeCount, energy);

    // Camera shake
    if (visual.cameraShake && visual.cameraShake > 0) {
        shakeIntensity = shakeIntensity * 0.9 + visual.cameraShake * energy * 0.1;
        camera.position.x = (Math.random() - 0.5) * shakeIntensity * 3;
        camera.position.y = (Math.random() - 0.5) * shakeIntensity * 3;
    } else {
        camera.position.x *= 0.9;
        camera.position.y *= 0.9;
    }

    // Glow ambientale
    const glow = scene.getObjectByName('ambientGlow');
    if (glow && glow.material.uniforms) {
        const rgb = hslToRgb(baseHue / 360, 0.6, 0.3);
        glow.material.uniforms.uColor.value.setRGB(rgb.r, rgb.g, rgb.b);
        glow.material.uniforms.uIntensity.value = 0.2 + energy * 0.4;
        glow.scale.setScalar(1 + energy * 0.5);
    }

    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;
    particleGeometry.attributes.size.needsUpdate = true;
}

function updateConnections(visual, activeCount, energy) {
    if (!visual.connections) {
        connectionLines.visible = false;
        return;
    }
    connectionLines.visible = true;

    const maxDist = 15 + energy * 10;
    const linePositions = lineGeometry.attributes.position.array;
    const lineColors = lineGeometry.attributes.color.array;
    let lineIndex = 0;
    const maxLines = linePositions.length / 6;

    for (let i = 0; i < Math.min(activeCount, 120); i++) {
        if (lineIndex >= maxLines) break;
        const i3 = i * 3;
        if (positions[i3 + 2] < -100) continue;

        for (let j = i + 1; j < Math.min(activeCount, 120); j++) {
            if (lineIndex >= maxLines) break;
            const j3 = j * 3;
            if (positions[j3 + 2] < -100) continue;

            const dx = positions[i3] - positions[j3];
            const dy = positions[i3 + 1] - positions[j3 + 1];
            const dz = positions[i3 + 2] - positions[j3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < maxDist) {
                const l6 = lineIndex * 6;
                const alpha = 1 - dist / maxDist;
                linePositions[l6] = positions[i3];
                linePositions[l6 + 1] = positions[i3 + 1];
                linePositions[l6 + 2] = positions[i3 + 2];
                linePositions[l6 + 3] = positions[j3];
                linePositions[l6 + 4] = positions[j3 + 1];
                linePositions[l6 + 5] = positions[j3 + 2];

                const cr = (colors[i3] + colors[j3]) * 0.5 * alpha;
                const cg = (colors[i3 + 1] + colors[j3 + 1]) * 0.5 * alpha;
                const cb = (colors[i3 + 2] + colors[j3 + 2]) * 0.5 * alpha;
                lineColors[l6] = cr; lineColors[l6 + 1] = cg; lineColors[l6 + 2] = cb;
                lineColors[l6 + 3] = cr; lineColors[l6 + 4] = cg; lineColors[l6 + 5] = cb;
                lineIndex++;
            }
        }
    }

    for (let i = lineIndex * 6; i < linePositions.length; i++) linePositions[i] = 0;

    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.color.needsUpdate = true;
    lineMaterial.opacity = (visual.connectionOpacity || 0.3) * (0.5 + energy);
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r, g, b };
}

function onWindowResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate(currentTime) {
    animationId = requestAnimationFrame(animate);

    const elapsed = currentTime - lastFrameTime;
    if (elapsed < FRAME_INTERVAL) return;
    lastFrameTime = currentTime - (elapsed % FRAME_INTERVAL);

    const audioParams = analyzeAudio();
    const emotionalState = updateEmotionalState(audioParams);
    updateParticles(emotionalState.visual, audioParams);
    renderer.render(scene, camera);
    updateDebugOverlay(audioParams, emotionalState);
}

function stopVisualEngine() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function updateDebugOverlay(audioParams, emotionalState) {
    const debug = document.getElementById('debug-overlay');
    const emotion = document.getElementById('emotion-indicator');

    if (debug && debug.classList.contains('visible')) {
        debug.innerHTML = `E: ${audioParams.energia.toFixed(2)}<br>P: ${audioParams.profondita.toFixed(2)}<br>V: ${audioParams.velocita.toFixed(2)}<br>R: ${audioParams.varianza.toFixed(2)}`;
    }

    if (emotion && emotionalState.dominant) {
        emotion.textContent = emotionalState.dominant.name;
        emotion.classList.add('visible');
    }
}

/**
 * Aggiorna i settings visivi in tempo reale
 * @param {Object} settings - { sizeScale, bloomScale, spreadScale, particleScale, connectionScale }
 */
function updateVisualSettings(settings) {
    // Aggiorna user settings
    if (settings.sizeScale !== undefined) userSettings.sizeScale = settings.sizeScale;
    if (settings.bloomScale !== undefined) userSettings.bloomScale = settings.bloomScale;
    if (settings.spreadScale !== undefined) userSettings.spreadScale = settings.spreadScale;
    if (settings.particleScale !== undefined) userSettings.particleScale = settings.particleScale;
    if (settings.connectionScale !== undefined) userSettings.connectionScale = settings.connectionScale;

    // Ricalcola effective scale factors
    SIZE_SCALE = BASE_SIZE_SCALE * userSettings.sizeScale;
    BLOOM_SCALE = BASE_BLOOM_SCALE * userSettings.bloomScale;
    SPREAD_SCALE = BASE_SPREAD_SCALE * userSettings.spreadScale;
    PARTICLE_SCALE = BASE_PARTICLE_SCALE * userSettings.particleScale;
    CONNECTION_SCALE = BASE_CONNECTION_SCALE * userSettings.connectionScale;

    // Aggiorna uniforms del material particelle
    if (particleMaterial && particleMaterial.uniforms) {
        particleMaterial.uniforms.uSizeScale.value = SIZE_SCALE;
        particleMaterial.uniforms.uBloomScale.value = BLOOM_SCALE;
    }

    // Aggiorna opacità connessioni
    if (lineMaterial) {
        lineMaterial.opacity = (isMobile ? 0.25 : 0.4) * userSettings.connectionScale;
    }

    // Aggiorna glow ambientale
    const glow = scene ? scene.getObjectByName('ambientGlow') : null;
    if (glow && glow.material.uniforms) {
        glow.material.uniforms.uIntensity.value = 0.25 * BLOOM_SCALE;
    }

    console.log('Visual settings updated:', userSettings);
}

/**
 * Ottieni i settings correnti
 */
function getVisualSettings() {
    return { ...userSettings };
}
