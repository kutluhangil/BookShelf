/**
 * Ambient soundscapes synthesized in the browser with the Web Audio API.
 * Generating the audio locally avoids hotlinking third-party CDNs, which was
 * unreliable (CORS / 403) and shipped no audio at all in practice.
 */

import { AppError } from './appError';

export type AmbientTrackId = 'rain' | 'fireplace' | 'library' | 'brown_noise';

/** Display names live in the i18n catalog; this module stays audio-only. */
export const AMBIENT_TRACK_IDS: AmbientTrackId[] = ['rain', 'fireplace', 'library', 'brown_noise'];

function createNoiseBuffer(ctx: AudioContext, type: 'white' | 'brown', seconds = 4): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }
  return buffer;
}

interface ActiveGraph {
  nodes: AudioScheduledSourceNode[];
  gain: GainNode;
  timers: number[];
}

export class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private active: ActiveGraph | null = null;
  private masterVolume = 0.35;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new AppError('device.audioUnavailable', {});
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  get volume(): number {
    return this.masterVolume;
  }

  setVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value));
    if (this.active) {
      this.active.gain.gain.setTargetAtTime(this.masterVolume, this.getContext().currentTime, 0.1);
    }
  }

  stop(): void {
    if (!this.active) return;
    const { nodes, gain, timers } = this.active;
    timers.forEach((timer) => window.clearInterval(timer));
    const ctx = this.getContext();
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    window.setTimeout(() => {
      nodes.forEach((node) => {
        try {
          node.stop();
        } catch {
          // Already stopped.
        }
      });
      gain.disconnect();
    }, 600);
    this.active = null;
  }

  play(trackId: AmbientTrackId): void {
    this.stop();
    const ctx = this.getContext();

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.setTargetAtTime(this.masterVolume, ctx.currentTime, 0.5);
    master.connect(ctx.destination);

    const nodes: AudioScheduledSourceNode[] = [];
    const timers: number[] = [];

    const startLoop = (buffer: AudioBuffer, destination: AudioNode) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(destination);
      source.start();
      nodes.push(source);
      return source;
    };

    if (trackId === 'brown_noise') {
      startLoop(createNoiseBuffer(ctx, 'brown'), master);
    }

    if (trackId === 'rain') {
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 700;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 6500;
      highpass.connect(lowpass).connect(master);
      startLoop(createNoiseBuffer(ctx, 'white'), highpass);

      // Occasional droplets
      timers.push(
        window.setInterval(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(900 + Math.random() * 900, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.05 * this.masterVolume, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
          osc.connect(gain).connect(master);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }, 700)
      );
    }

    if (trackId === 'fireplace') {
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 420;
      lowpass.connect(master);
      startLoop(createNoiseBuffer(ctx, 'brown'), lowpass);

      // Crackles
      timers.push(
        window.setInterval(() => {
          if (Math.random() > 0.6) return;
          const crackle = ctx.createBufferSource();
          crackle.buffer = createNoiseBuffer(ctx, 'white', 0.05);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.12 * this.masterVolume, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
          const bandpass = ctx.createBiquadFilter();
          bandpass.type = 'bandpass';
          bandpass.frequency.value = 1800 + Math.random() * 1500;
          crackle.connect(bandpass).connect(gain).connect(master);
          crackle.start();
        }, 320)
      );
    }

    if (trackId === 'library') {
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 900;
      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      lowpass.connect(gain).connect(master);
      startLoop(createNoiseBuffer(ctx, 'brown'), lowpass);

      // Sparse page turns
      timers.push(
        window.setInterval(() => {
          if (Math.random() > 0.35) return;
          const page = ctx.createBufferSource();
          page.buffer = createNoiseBuffer(ctx, 'white', 0.25);
          const envelope = ctx.createGain();
          envelope.gain.setValueAtTime(0.0001, ctx.currentTime);
          envelope.gain.exponentialRampToValueAtTime(0.08 * this.masterVolume, ctx.currentTime + 0.08);
          envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
          const bandpass = ctx.createBiquadFilter();
          bandpass.type = 'bandpass';
          bandpass.frequency.value = 2600;
          page.connect(bandpass).connect(envelope).connect(master);
          page.start();
        }, 4200)
      );
    }

    this.active = { nodes, gain: master, timers };
  }

  dispose(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
