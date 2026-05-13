/**
 * AudioManager - 8-bit WebAudio API sound system
 */
export class AudioManager {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private currentPhaseSources: AudioScheduledSourceNode[] = [];
  private currentPhaseNodes: AudioNode[] = [];
  private phaseMusicToken: number = 0;

  constructor() {
    // Initialize Web Audio API
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.15; // Keep volume low to avoid ear damage
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Stop all current phase music
   */
  private stopPhaseMusic(): void {
    this.phaseMusicToken++;

    this.currentPhaseSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Ignore nodes that were already stopped.
      }
      source.disconnect();
    });
    this.currentPhaseNodes.forEach((node) => node.disconnect());
    this.currentPhaseSources = [];
    this.currentPhaseNodes = [];
  }

  /**
   * Set the current game phase and play corresponding music
   */
  setPhase(phase: string): void {
    this.stopPhaseMusic();

    switch (phase) {
      case 'PLANNING':
      case 'REST':
        this.playPlanningPhase(); // Slow, mysterious for rest/reward
        break;
      case 'ACTION':
        this.playActionPhase(); // Fast, driving for battle
        break;
      case 'TRANSITION':
        this.playTransitionPhase();
        break;
      default:
        break;
    }
  }

  /**
   * PLANNING: Slow rhythmic pulse (BPM 80)
   * Triangle wave at 110 Hz (A2)
   */
  private playPlanningPhase(): void {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.value = 110; // A2 - low, bass note

    // Pulsing LFO: 80 BPM = 1.33 beats per second
    const pulseRate = 1.33; // Hz
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    lfo.frequency.value = pulseRate;
    lfoGain.gain.value = 0.4;

    lfo.connect(gain.gain);
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    lfo.start();

    this.currentPhaseSources.push(osc, lfo);
    this.currentPhaseNodes.push(gain, lfoGain);
  }

  /**
   * ACTION: Fast melodic sequence (BPM 140)
   * Square wave in Phrygian scale
   */
  private playActionPhase(): void {
    // Phrygian scale: E F G A B C D
    const phrygianFrequencies = [164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66]; // E3-D4

    let noteIndex = 0;
    const bpm = 140;
    const beatDuration = 60 / bpm; // seconds per beat
    const noteDuration = beatDuration * 0.8; // Slightly staccato

    const phaseToken = this.phaseMusicToken;

    // Create a repeating sequence
    const playNote = () => {
      if (phaseToken !== this.phaseMusicToken) return;

      const freq = phrygianFrequencies[noteIndex % phrygianFrequencies.length];
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + noteDuration
      );

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + noteDuration);

      noteIndex++;

      // Schedule next note
      setTimeout(playNote, beatDuration * 1000);
    };

    playNote();
  }

  /**
   * TRANSITION: Fading white noise ambient
   */
  private playTransitionPhase(): void {
    const bufferSize = this.audioContext.sampleRate * 2;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2); // Fade out

    source.connect(gain);
    gain.connect(this.masterGain);

    source.start(this.audioContext.currentTime);
    source.stop(this.audioContext.currentTime + 2.5);

    this.currentPhaseSources.push(source);
    this.currentPhaseNodes.push(gain);
  }

  /**
   * SFX: Blip sound for card reordering
   */
  playBlip(): void {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      400,
      this.audioContext.currentTime + 0.1
    );

    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  /**
   * SFX: Crunch sound for card execution
   */
  playCrunch(): void {
    const bufferSize = this.audioContext.sampleRate * 0.2;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = noiseBuffer;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    source.connect(gain);
    gain.connect(this.masterGain);

    source.start(this.audioContext.currentTime);
  }

  /**
   * BOSS MUSIC: Dark, fast chromatic progression with lowpass filter
   */
  playBossMusic(): void {
    // Boss: Fast, dark, aggressive (BPM 160, chromatic tones)
    const chromaFrequencies = [130.81, 139.0, 146.83, 155.56, 164.81, 174.61]; // C3-E3 chromatic

    let noteIndex = 0;
    const bpm = 160;
    const beatDuration = 60 / bpm;
    const noteDuration = beatDuration * 0.7; // Slightly longer notes

    const phaseToken = this.phaseMusicToken;

    // Create lowpass filter
    const lowpassFilter = this.audioContext.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.setValueAtTime(5000, this.audioContext.currentTime);
    lowpassFilter.frequency.exponentialRampToValueAtTime(8000, this.audioContext.currentTime + 3); // Sweep up
    lowpassFilter.Q.value = 5;

    lowpassFilter.connect(this.masterGain);
    this.currentPhaseNodes.push(lowpassFilter);

    const playBossNote = () => {
      if (phaseToken !== this.phaseMusicToken) return;

      const freq = chromaFrequencies[noteIndex % chromaFrequencies.length];
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sawtooth'; // Harsh sawtooth for boss
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.02, this.audioContext.currentTime + noteDuration);

      osc.connect(gain);
      gain.connect(lowpassFilter);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + noteDuration);

      noteIndex++;

      // Schedule next note
      setTimeout(playBossNote, beatDuration * 1000);
    };

    playBossNote();
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(value: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, value)) * 0.15;
  }

  /**
   * Get current volume (0-1)
   */
  getVolume(): number {
    return Math.min(1, this.masterGain.gain.value / 0.15);
  }

  /**
   * Mute/unmute
   */
  setMuted(muted: boolean): void {
    if (muted) {
      this.masterGain.gain.value = 0;
    } else {
      this.masterGain.gain.value = 0.15;
    }
  }

  /**
   * Resume audio context if suspended (required by browsers)
   */
  resume(): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Victory Fanfare: High-pitched upward arpeggio
   */
  playVictoryFanfare(): void {
    const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (upward)
    const noteDuration = 0.15;
    const delay = 0.1;

    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, this.audioContext.currentTime + noteDuration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + noteDuration);
      }, index * delay * 1000);
    });
  }

  /**
   * Death Dirge: Low-pitched descending square wave
   */
  playDeathDirge(): void {
    const frequencies = [261.63, 196.0, 146.83, 110.0]; // C4, G3, D3, A2 (downward)
    const noteDuration = 0.25;
    const delay = 0.15;

    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.02, this.audioContext.currentTime + noteDuration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + noteDuration);
      }, index * delay * 1000);
    });
  }
}
