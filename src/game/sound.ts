/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Web Audio API sound synthesizer with BGM loop
class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  // BGM states
  private bgmGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private isBgmPlaying: boolean = false;
  private currentStep: number = 0;

  constructor() {
    try {
      const saved = localStorage.getItem('macaron_sound_muted');
      if (saved !== null) {
        this.muted = saved === 'true';
      }
    } catch {
      this.muted = false;
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('macaron_sound_muted', String(this.muted));
    } catch {
      // ignore
    }

    if (this.muted) {
      this.pauseBGM();
    } else {
      this.initCtx();
      this.resumeBGM();
      this.playPowerUpGain();
    }
    return this.muted;
  }

  // ==================== PROCEDURAL BGM ====================
  // Sweet pastel macaron cafe chiptune/celesta music loop
  public startBGM() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.currentStep = 0;

    if (!this.bgmGain) {
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      this.bgmGain.connect(this.ctx.destination);
    }

    this.scheduleBGMStep();
  }

  public pauseBGM() {
    this.isBgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public resumeBGM() {
    if (this.muted || this.isBgmPlaying) return;
    this.startBGM();
  }

  public stopBGM() {
    this.pauseBGM();
    this.currentStep = 0;
  }

  private scheduleBGMStep = () => {
    if (!this.isBgmPlaying || !this.ctx || this.muted) return;

    const stepDuration = 0.145; // ~104 BPM 16th notes
    const t = this.ctx.currentTime;

    // Chord progression (Fmaj7 -> G7 -> Em7 -> Am7) across 32 steps (2 bars each or 4 bars total)
    // 32 steps total (steps 0-7: Fmaj7, 8-15: G7, 16-23: Em7, 24-31: Am7)
    const bar = Math.floor(this.currentStep / 8);
    const stepInBar = this.currentStep % 8;

    // 1. Bassline on beat 0 and beat 4
    if (stepInBar === 0 || stepInBar === 4) {
      const bassNotes = [174.61, 196.00, 164.81, 220.00]; // F3, G3, E3, A3
      const bassFreq = bassNotes[bar % 4] / 2; // F2, G2, E2, A2
      this.playBassNote(bassFreq, t);
    }

    // 2. Sweet arpeggio celesta notes
    const melodyPattern = [
      // Bar 1 (Fmaj7)
      [523.25, 659.25, 783.99, 880.00, 659.25, 783.99, 1046.50, 783.99],
      // Bar 2 (G7)
      [587.33, 783.99, 880.00, 987.77, 783.99, 880.00, 1174.66, 880.00],
      // Bar 3 (Em7)
      [659.25, 783.99, 987.77, 1174.66, 987.77, 783.99, 1318.51, 987.77],
      // Bar 4 (Am7)
      [880.00, 1046.50, 1174.66, 1318.51, 1046.50, 880.00, 1046.50, 659.25],
    ];

    const note = melodyPattern[bar % 4][stepInBar];
    // Play with gentle swing & varied dynamics
    if (stepInBar % 2 === 0 || stepInBar === 3 || stepInBar === 7) {
      this.playCelestaNote(note, t, stepInBar === 0 ? 0.05 : 0.035);
    }

    // 3. Subtle soft hi-hat/sugar shaker tick on odd steps
    if (stepInBar % 2 === 1) {
      this.playShakerTick(t);
    }

    this.currentStep = (this.currentStep + 1) % 32;
    this.bgmTimer = window.setTimeout(this.scheduleBGMStep, stepDuration * 1000);
  };

  private playCelestaNote(freq: number, time: number, volume: number) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.28);
  }

  private playBassNote(freq: number, time: number) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.38);
  }

  private playShakerTick(time: number) {
    if (!this.ctx || !this.bgmGain) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.018, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
  }

  // ==================== SOUND EFFECTS ====================
  // Release drop swoosh
  public playDrop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Normal landing - bouncy jelly squish
  public playLand() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.14);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Slice excess off
  public playSlice() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // Perfect landing with rising pitch arpeggios
  public playPerfect(combo: number) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00, // A5
      1046.50, // C6
      1174.66, // D6
      1318.51, // E6
      1567.98, // G6
      1760.00, // A6
      2093.00, // C7
    ];

    const noteIdx = Math.min(combo - 1, notes.length - 1);
    const baseFreq = notes[Math.max(0, noteIdx)];

    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, t);

    gain1.gain.setValueAtTime(0.28, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.35);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2, t + 0.04);

    gain2.gain.setValueAtTime(0.15, t + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc2.start(t + 0.04);
    osc2.stop(t + 0.4);
  }

  // Power-up gained
  public playPowerUpGain() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [587.33, 739.99, 880.00, 1174.66]; // D maj shimmer
    chords.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.12, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.25);
    });
  }

  // Power-up activated
  public playPowerUpUse() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.2);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  // Shield rescues player from a miss!
  public playShieldUse() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.3);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Completely missed
  public playMiss() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.35);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Game Over jingle
  public playGameOver() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 392, 349.23, 293.66]; // A4, G4, F4, D4
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.16);

      gain.gain.setValueAtTime(0.18, t + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.16 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.16);
      osc.stop(t + idx * 0.16 + 0.35);
    });
  }
}

export const sound = new SoundManager();
