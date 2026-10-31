/**
 * Procedural Web Audio API sound generator for Focus Studio
 * Provides zero-dependency ambient soundscapes, completion chimes, and gentle tactile audio.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private ambientSourceNode: AudioNode | null = null;
  private ambientOscillators: OscillatorNode[] = [];
  private ambientIntervalId: number | null = null;
  private currentTrack: string | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.4;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: ReturnType<typeof setInterval> | null = null;
  private isSirenActive: boolean = false;

  private initContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play uplifting finish chime
  playCompletionChime() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      // Arpeggiated resonant chime: E5, G#5, B5, E6
      const freqs = [659.25, 830.61, 987.77, 1318.51];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.8);

        osc.connect(gain);
        gain.connect(this.masterGain || ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 2.0);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Soft tactile tick
  playTick() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Audio fallback
    }
  }

  // Gentle gong for distraction logging
  playDistractionChime() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.6); // D4
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(now);
      osc.stop(now + 1.0);
    } catch {
      // Audio fallback
    }
  }

  // Task done chime
  playTaskSuccess() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.22, now + i * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.8);
        osc.connect(gain);
        gain.connect(this.masterGain || ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.9);
      });
    } catch {
      // Fallback
    }
  }

  // Authentic two-tone ambulance emergency siren
  startAmbulanceSiren() {
    if (this.isSirenActive) return;
    try {
      const ctx = this.initContext();
      this.isSirenActive = true;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Dual harmonic character using sawtooth for sharp emergency acoustic profile
      osc.type = 'sawtooth';
      const now = ctx.currentTime;

      // Start at 960 Hz (Hi tone)
      osc.frequency.setValueAtTime(960, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.1);

      let toggle = false;
      this.sirenInterval = setInterval(() => {
        if (!this.isSirenActive || !this.ctx) return;
        const t = this.ctx.currentTime;
        const targetFreq = toggle ? 960 : 770;
        osc.frequency.cancelScheduledValues(t);
        osc.frequency.linearRampToValueAtTime(targetFreq, t + 0.06);
        toggle = !toggle;
      }, 480);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(now);

      this.sirenOsc = osc;
      this.sirenGain = gain;
    } catch {
      // Audio autoplay policy safe
    }
  }

  stopAmbulanceSiren() {
    if (!this.isSirenActive) return;
    this.isSirenActive = false;

    if (this.sirenInterval !== null) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }

    if (this.sirenGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.sirenGain.gain.cancelScheduledValues(now);
        this.sirenGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
      } catch {
        // Safe
      }
    }

    setTimeout(() => {
      if (this.sirenOsc) {
        try {
          this.sirenOsc.stop();
          this.sirenOsc.disconnect();
        } catch {
          // Safe
        }
        this.sirenOsc = null;
      }
      this.sirenGain = null;
    }, 300);
  }

  isSirenPlaying(): boolean {
    return this.isSirenActive;
  }

  // Stop current ambient background audio
  stopAmbient() {
    if (this.ambientIntervalId !== null) {
      clearInterval(this.ambientIntervalId);
      this.ambientIntervalId = null;
    }
    this.ambientOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Disconnect error safe
      }
    });
    this.ambientOscillators = [];
    if (this.ambientSourceNode) {
      try {
        this.ambientSourceNode.disconnect();
      } catch {
        // Safe
      }
      this.ambientSourceNode = null;
    }
    this.currentTrack = null;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  getCurrentTrack(): string | null {
    return this.currentTrack;
  }

  // Play procedural ambient sound
  playAmbient(track: 'rain' | 'alpha' | 'noise' | 'stream'): void {
    if (this.currentTrack === track) {
      this.stopAmbient();
      return;
    }
    this.stopAmbient();
    const ctx = this.initContext();
    this.currentTrack = track;

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, ctx.currentTime);
    this.ambientGain.connect(this.masterGain || ctx.destination);

    if (track === 'rain') {
      this.createRainSound(ctx);
    } else if (track === 'alpha') {
      this.createAlphaBinaural(ctx);
    } else if (track === 'noise') {
      this.createPinkNoise(ctx);
    } else if (track === 'stream') {
      this.createStreamSound(ctx);
    }
  }

  // Procedural Rain: Filtered noise with periodic drop modulations
  private createRainSound(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.ambientGain!);
    whiteNoise.start();
    this.ambientSourceNode = whiteNoise;
  }

  // Alpha Binaural Beat (10 Hz frequency gap) + Warm drone
  private createAlphaBinaural(ctx: AudioContext) {
    const merger = ctx.createChannelMerger(2);

    // Left channel: 216 Hz
    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(216, ctx.currentTime);
    const gainLeft = ctx.createGain();
    gainLeft.gain.setValueAtTime(0.2, ctx.currentTime);
    oscLeft.connect(gainLeft);
    gainLeft.connect(merger, 0, 0);

    // Right channel: 226 Hz (10Hz difference = Alpha Waves)
    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(226, ctx.currentTime);
    const gainRight = ctx.createGain();
    gainRight.gain.setValueAtTime(0.2, ctx.currentTime);
    oscRight.connect(gainRight);
    gainRight.connect(merger, 0, 1);

    // Warm sub-harmonics
    const oscSub = ctx.createOscillator();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(108, ctx.currentTime);
    const gainSub = ctx.createGain();
    gainSub.gain.setValueAtTime(0.08, ctx.currentTime);
    oscSub.connect(gainSub);
    gainSub.connect(this.ambientGain!);

    merger.connect(this.ambientGain!);

    oscLeft.start();
    oscRight.start();
    oscSub.start();

    this.ambientOscillators = [oscLeft, oscRight, oscSub];
  }

  // Smooth pink/brown focus noise
  private createPinkNoise(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 0.6;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.ambientGain!);
    noise.start();
    this.ambientSourceNode = noise;
  }

  // Gentle stream sound
  private createStreamSound(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    // Subtle LFO sweep for bubbling effect
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.3, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(150, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(this.ambientGain!);

    lfo.start();
    noise.start();

    this.ambientSourceNode = noise;
    this.ambientOscillators = [lfo];
  }
}

export const soundEngine = new SoundEngine();
