/**
 * LUMI Sound FX & World Audio Engine (lumiAudio.js)
 * 
 * Audio Architecture:
 * - Master Bus -> Audio Destination
 * - SFX Bus, Voice Bus (LUMI Emotions), Ambient World Bus
 * - Low-latency procedural synthesizer with micro-variations
 * - Ducking, tiered victory fanfares, semantic error diagnostics, and continuous cosmic ambience
 */

const STORAGE_MUTE_KEY = 'metasense:lumi-sound-muted'

let audioCtx = null
let masterBus = null
let sfxBus = null
let voiceBus = null
let ambientBus = null
let currentAmbientNodes = null
let currentAmbientMode = null
let isMuted = false

try {
  if (typeof window !== 'undefined') {
    isMuted = localStorage.getItem(STORAGE_MUTE_KEY) === 'true'
  }
} catch {
  // localStorage safe fallback
}

function initAudioSystem() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()

      // Master Output
      masterBus = audioCtx.createGain()
      masterBus.gain.setValueAtTime(isMuted ? 0 : 1, audioCtx.currentTime)
      masterBus.connect(audioCtx.destination)

      // SFX Bus
      sfxBus = audioCtx.createGain()
      sfxBus.gain.setValueAtTime(0.9, audioCtx.currentTime)
      sfxBus.connect(masterBus)

      // Voice Bus (LUMI Emotional chirps)
      voiceBus = audioCtx.createGain()
      voiceBus.gain.setValueAtTime(0.85, audioCtx.currentTime)
      voiceBus.connect(masterBus)

      // Ambient World Bus
      ambientBus = audioCtx.createGain()
      ambientBus.gain.setValueAtTime(0.4, audioCtx.currentTime)
      ambientBus.connect(masterBus)
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function setLumiMuted(muted) {
  isMuted = Boolean(muted)
  try {
    localStorage.setItem(STORAGE_MUTE_KEY, String(isMuted))
  } catch {
    // ignore
  }
  if (masterBus && audioCtx) {
    masterBus.gain.setValueAtTime(isMuted ? 0 : 1, audioCtx.currentTime)
  }
  if (isMuted) {
    stopWorldAmbience()
  } else if (currentAmbientMode) {
    startWorldAmbience(currentAmbientMode)
  }
}

export function isLumiMuted() {
  return isMuted
}

/**
 * Duck ambient sound during important action or voice (no-op when background drone is disabled)
 */
function duckAmbient() {
  // Continuous background drone is disabled.
}

/**
 * Continuous World Ambience Generator
 * Note: Continuous background drone hum is permanently disabled across all courses
 * to provide a clean, distraction-free environment while keeping interactive SFX crisp.
 * @param {'offline' | 'online'} _mode
 */
export function startWorldAmbience(_mode = 'offline') {
  stopWorldAmbience()
}

export function stopWorldAmbience() {
  if (currentAmbientNodes) {
    try {
      currentAmbientNodes.forEach((node) => {
        if (node.stop) node.stop()
        if (node.disconnect) node.disconnect()
      })
    } catch {
      // ignore
    }
    currentAmbientNodes = null
  }
  currentAmbientMode = null
}

/**
 * Play procedural SFX & Voice expressions
 */
export function playLumiSound(soundType, options = {}) {
  if (isMuted) return
  const ctx = initAudioSystem()
  if (!ctx) return

  const now = ctx.currentTime

  switch (soundType) {
    // ==========================================
    // 1. Awakening Sequences
    // ==========================================
    case 'first_awaken': {
      // 3.2s Cinematic Awakening Sequence (Mission 1 only)
      duckAmbient(3.5, 0.05)

      // Step 1: Static ignition spark (0.0s - 0.4s)
      const noiseOsc = ctx.createOscillator()
      const noiseGain = ctx.createGain()
      noiseOsc.type = 'sawtooth'
      noiseOsc.frequency.setValueAtTime(80, now)
      noiseOsc.frequency.exponentialRampToValueAtTime(300, now + 0.35)
      noiseGain.gain.setValueAtTime(0.08, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      noiseOsc.connect(noiseGain)
      noiseGain.connect(sfxBus)
      noiseOsc.start(now)
      noiseOsc.stop(now + 0.42)

      // Step 2: Low-frequency core power ignition pulse (0.4s - 1.2s)
      const subOsc = ctx.createOscillator()
      const subGain = ctx.createGain()
      subOsc.type = 'sine'
      subOsc.frequency.setValueAtTime(50, now + 0.4)
      subOsc.frequency.exponentialRampToValueAtTime(180, now + 1.1)
      subGain.gain.setValueAtTime(0.001, now + 0.4)
      subGain.gain.linearRampToValueAtTime(0.25, now + 0.6)
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
      subOsc.connect(subGain)
      subGain.connect(sfxBus)
      subOsc.start(now + 0.4)
      subOsc.stop(now + 1.25)

      // Step 3: Orbital ring spin servo surge (1.2s - 2.0s)
      const servoOsc = ctx.createOscillator()
      const servoGain = ctx.createGain()
      servoOsc.type = 'triangle'
      servoOsc.frequency.setValueAtTime(350, now + 1.2)
      servoOsc.frequency.exponentialRampToValueAtTime(880, now + 1.9)
      servoGain.gain.setValueAtTime(0.001, now + 1.2)
      servoGain.gain.linearRampToValueAtTime(0.18, now + 1.5)
      servoGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0)
      servoOsc.connect(servoGain)
      servoGain.connect(sfxBus)
      servoOsc.start(now + 1.2)
      servoOsc.stop(now + 2.05)

      // Step 4: LUMI joy greeting chirp (2.0s - 2.6s)
      const chirpNotes = [587.33, 783.99, 1046.5, 1318.51]
      chirpNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + 2.0 + i * 0.1)
        gain.gain.setValueAtTime(0.001, now + 2.0 + i * 0.1)
        gain.gain.linearRampToValueAtTime(0.18, now + 2.0 + i * 0.1 + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0 + i * 0.1 + 0.2)
        osc.connect(gain)
        gain.connect(voiceBus)
        osc.start(now + 2.0 + i * 0.1)
        osc.stop(now + 2.0 + i * 0.1 + 0.22)
      })

      // Step 5: Warm major harmonic chord resolve (2.6s - 3.4s)
      const chord = [261.63, 329.63, 392.0, 523.25]
      chord.forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + 2.6)
        gain.gain.setValueAtTime(0.001, now + 2.6)
        gain.gain.linearRampToValueAtTime(0.15, now + 2.7)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4)
        osc.connect(gain)
        gain.connect(sfxBus)
        osc.start(now + 2.6)
        osc.stop(now + 3.45)
      })
      break
    }

    case 'wake':
    case 'boot': {
      // Standard clean 0.5s boot arpeggio
      duckAmbient(0.6, 0.3)
      const notes = [261.63, 329.63, 392.0, 523.25]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.1)
        gain.gain.setValueAtTime(0.001, now + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.16, now + i * 0.1 + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.35)
        osc.connect(gain)
        gain.connect(sfxBus)
        osc.start(now + i * 0.1)
        osc.stop(now + i * 0.1 + 0.4)
      })
      break
    }

    // ==========================================
    // 2. Navigation Actions with Anti-Fatigue Micro-Variations
    // ==========================================
    case 'move': {
      // Micro-variation: Random pitch drift ±4% so loops don't fatigue the ear
      const pitchDrift = 1.0 + (Math.random() * 0.08 - 0.04)
      const isFinal = Boolean(options.isFinalStep)

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(180 * pitchDrift, now)
      osc.frequency.exponentialRampToValueAtTime(60 * pitchDrift, now + 0.18)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.23)

      // If this is the final step in a loop, add a subtle arrival "TING"
      if (isFinal) {
        const pingOsc = ctx.createOscillator()
        const pingGain = ctx.createGain()
        pingOsc.type = 'sine'
        pingOsc.frequency.setValueAtTime(1174.66, now + 0.12)
        pingGain.gain.setValueAtTime(0.08, now + 0.12)
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
        pingOsc.connect(pingGain)
        pingGain.connect(sfxBus)
        pingOsc.start(now + 0.12)
        pingOsc.stop(now + 0.34)
      }
      break
    }

    case 'turn': {
      const pitchDrift = 1.0 + (Math.random() * 0.06 - 0.03)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(750 * pitchDrift, now)
      osc.frequency.exponentialRampToValueAtTime(1200 * pitchDrift, now + 0.07)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.1)
      break
    }

    // ==========================================
    // 3. Signature Transmit & Hologram Protocol
    // ==========================================
    case 'transmit': {
      // Signature Code Transmission Laser Pulse
      duckAmbient(0.5, 0.2)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(320, now)
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.18)
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.22, now + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.3)
      break
    }

    case 'hologram': {
      // Cyber scanline sweep
      duckAmbient(0.5, 0.3)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(240, now)
      osc.frequency.exponentialRampToValueAtTime(960, now + 0.28)
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.1, now + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.36)
      break
    }

    // ==========================================
    // 4. LUMI Emotion Voice Set
    // ==========================================
    case 'say':
    case 'voice_neutral': {
      // Friendly 3-tone chirp
      const notes = [659.25, 880.0, 1174.66]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.08)
        osc.frequency.linearRampToValueAtTime(freq * 1.12, now + i * 0.08 + 0.06)
        gain.gain.setValueAtTime(0.12, now + i * 0.08)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12)
        osc.connect(gain)
        gain.connect(voiceBus)
        osc.start(now + i * 0.08)
        osc.stop(now + i * 0.08 + 0.14)
      })
      break
    }

    case 'voice_happy': {
      // Rising cheerful trill (삐-리링! ↑)
      const notes = [783.99, 1046.5, 1318.51, 1567.98]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.06)
        gain.gain.setValueAtTime(0.001, now + i * 0.06)
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.06 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.14)
        osc.connect(gain)
        gain.connect(voiceBus)
        osc.start(now + i * 0.06)
        osc.stop(now + i * 0.06 + 0.16)
      })
      break
    }

    case 'voice_curious':
    case 'voice_discovery': {
      // Inquisitive question mark chirp (삐? 삐리링!)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(523.25, now)
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.1)
      gain1.gain.setValueAtTime(0.14, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      osc1.connect(gain1)
      gain1.connect(voiceBus)
      osc1.start(now)
      osc1.stop(now + 0.14)

      const notes = [1046.5, 1318.51]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + 0.16 + i * 0.07)
        gain.gain.setValueAtTime(0.12, now + 0.16 + i * 0.07)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16 + i * 0.07 + 0.1)
        osc.connect(gain)
        gain.connect(voiceBus)
        osc.start(now + 0.16 + i * 0.07)
        osc.stop(now + 0.16 + i * 0.07 + 0.12)
      })
      break
    }

    case 'voice_confused': {
      // Surprised disappointed downward slide (뿌우... ↓)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.26)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
      osc.connect(gain)
      gain.connect(voiceBus)
      osc.start(now)
      osc.stop(now + 0.3)
      break
    }

    // ==========================================
    // 5. Tiered Achievement & Success Fanfares
    // ==========================================
    case 'clear_task': {
      // Tier 1: Small Step Completion (0.4s crisp 2-tone)
      duckAmbient(0.5, 0.4)
      const notes = [659.25, 987.77]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.09)
        gain.gain.setValueAtTime(0.001, now + i * 0.09)
        gain.gain.exponentialRampToValueAtTime(0.16, now + i * 0.09 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.3)
        osc.connect(gain)
        gain.connect(sfxBus)
        osc.start(now + i * 0.09)
        osc.stop(now + i * 0.09 + 0.35)
      })
      break
    }

    case 'clear':
    case 'clear_mission': {
      // Tier 2: Standard Mission Clear (1.2s Major 9th sparkle fanfare)
      duckAmbient(1.4, 0.15)
      const chord = [523.25, 659.25, 783.99, 987.77, 1174.66]
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.1)
        gain.gain.setValueAtTime(0.001, now + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.1 + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.7)
        osc.connect(gain)
        gain.connect(sfxBus)
        osc.start(now + i * 0.1)
        osc.stop(now + i * 0.1 + 0.75)
      })
      setTimeout(() => playLumiSound('voice_happy'), 450)
      break
    }

    case 'clear_core': {
      // Tier 3: Core Restored / Field Test Boss Clear (2.8s Grand Fanfare)
      duckAmbient(3.0, 0.05)
      const grandNotes = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
      grandNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.12)
        gain.gain.setValueAtTime(0.001, now + i * 0.12)
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 1.2)
        osc.connect(gain)
        gain.connect(sfxBus)
        osc.start(now + i * 0.12)
        osc.stop(now + i * 0.12 + 1.3)
      })
      setTimeout(() => playLumiSound('voice_happy'), 800)
      break
    }

    // ==========================================
    // 6. Semantic Error Diagnostics
    // ==========================================
    case 'error_syntax': {
      // Broken transmission static cutoff
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(480, now)
      osc.frequency.linearRampToValueAtTime(140, now + 0.12)
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.16)
      break
    }

    case 'error_collision': {
      // Metallic bump + confused chirp
      const bumpOsc = ctx.createOscillator()
      const bumpGain = ctx.createGain()
      bumpOsc.type = 'square'
      bumpOsc.frequency.setValueAtTime(90, now)
      bumpOsc.frequency.exponentialRampToValueAtTime(30, now + 0.15)
      bumpGain.gain.setValueAtTime(0.22, now)
      bumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      bumpOsc.connect(bumpGain)
      bumpGain.connect(sfxBus)
      bumpOsc.start(now)
      bumpOsc.stop(now + 0.2)

      setTimeout(() => playLumiSound('voice_confused'), 120)
      break
    }

    case 'error': {
      // Soft descending double-buzz
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.22)
      gain.gain.setValueAtTime(0.14, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.28)
      break
    }

    // ==========================================
    // 7. Sensor & Memory Data Operations
    // ==========================================
    case 'scan': {
      // Sonar ping chime with subtle harmonic tail
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1480, now)
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.52)
      break
    }

    case 'memory': {
      // Microchip memory slot write click
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.11)
      break
    }

    // ==========================================
    // 8. Game API & Combat SFX
    // ==========================================
    case 'shield': {
      // Forcefield harmonic resonance sweep up
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(320, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35)
      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.5)
      break
    }

    case 'condition_true': {
      // Crisp rising confirmation chime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12)
      gain.gain.setValueAtTime(0.14, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.2)
      break
    }

    case 'condition_false': {
      // Subtle dry tick
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(320, now)
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08)
      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.11)
      break
    }

    case 'charge': {
      // Electrical power surge / capacitor charge
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(180, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35)
      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.42)
      break
    }

    case 'barrier_unlock': {
      // Mechanical lock unlock and glass shimmer
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(520, now)
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.15)
      gain.gain.setValueAtTime(0.16, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.28)
      break
    }

    case 'pulse':
    case 'laser': {
      // Rapid downward laser chirp
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(1400, now)
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.18)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.24)
      break
    }

    case 'alert':
    case 'warning': {
      // Tactical warning double-blip
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.setValueAtTime(660, now + 0.08)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.22)
      break
    }

    case 'engine':
    case 'thrust': {
      // Low engine boost hiss
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(120, now)
      osc.frequency.linearRampToValueAtTime(80, now + 0.25)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.32)
      break
    }

    case 'hud':
    case 'click': {
      // Crisp neon UI click
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1760, now)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.06)
      break
    }

    case 'radar':
    case 'blip': {
      // Radar blip
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1046.5, now)
      gain.gain.setValueAtTime(0.16, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.27)
      break
    }

    case 'damage':
    case 'hit': {
      // Low impact crunch
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.18)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      osc.connect(gain)
      gain.connect(sfxBus)
      osc.start(now)
      osc.stop(now + 0.24)
      break
    }

    default:
      break
  }
}
