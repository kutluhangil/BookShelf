/**
 * SPINE Haptic Feedback & Tactile Response Service (§4.6)
 * Implements platform-specific UX requirements:
 * - lightImpact: Subtle card taps, spine strip clicks, modal navigation
 * - selectionClick: Selection state changes, filter toggles, edition picks
 * - mediumImpact: Shutter capture, shelf creation, candidate resolution
 * - heavyImpact: Batch library ingestion, destructive actions
 * - notification: Success / Error tactile cues
 */

class HapticFeedbackService {
  private isAudioTactileEnabled: boolean = true;
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Generates an ultra-subtle tactile synthetic micro-click
   * for responsive desktop & mobile physical feedback
   */
  private playMicroClick(frequency = 600, duration = 0.008, gainVal = 0.04) {
    if (!this.isAudioTactileEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + duration);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Graceful silence
    }
  }

  /**
   * Selection Click (§4.6)
   * Used for radio/checkbox toggles, filter pills, and edition selection
   */
  public selectionClick(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
    this.playMicroClick(850, 0.006, 0.035);
  }

  /**
   * Light Impact (§4.6)
   * Used for general card taps, spine strip segments, tab switches, and icon buttons
   */
  public lightImpact(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
    this.playMicroClick(520, 0.009, 0.045);
  }

  /**
   * Medium Impact (§4.6)
   * Used for shutter capture button, resolve action, confirmation triggers
   */
  public mediumImpact(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(28);
      } catch {}
    }
    this.playMicroClick(340, 0.015, 0.07);
  }

  /**
   * Heavy Impact (§4.6)
   * Used for batch ingestion, committing changes, deleting items
   */
  public heavyImpact(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(45);
      } catch {}
    }
    this.playMicroClick(220, 0.022, 0.09);
  }

  /**
   * Camera Alignment Lock-in Haptic (§4.6 & Lifecycle)
   * Subtle tactile feedback when camera roll/pitch enters valid alignment threshold
   */
  public alignmentLock(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        // Short, crisp twin micro-ticks (8ms pulse, 30ms gap, 12ms pulse)
        navigator.vibrate([8, 30, 12]);
      } catch {}
    }
    // High-pitched soft resonance chime indicating optical lock
    this.playTone(780, 0.04, 0.045, 'sine');
    setTimeout(() => {
      this.playTone(1040, 0.06, 0.05, 'sine');
    }, 35);
  }

  /**
   * Completed-Scan Haptic Feedback Pattern (§4.6 & Lifecycle)
   * Specific vibration pattern to signal to the user that background spine clustering,
   * OCR extraction, and catalog matching tasks have successfully finished.
   */
  public completedScan(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        // Distinct completed-scan multi-phase tactile pulse sequence:
        // [30ms preparation pulse, 40ms interval, 45ms peak pulse, 40ms interval, 75ms resonant finish]
        navigator.vibrate([30, 40, 45, 40, 75]);
      } catch {}
    }
    // Deep warm resonance with smooth harmonic cascade (C5 -> E5 -> G5 -> C6)
    this.playTone(523.25, 0.12, 0.055, 'sine');
    setTimeout(() => this.playTone(659.25, 0.12, 0.06, 'sine'), 50);
    setTimeout(() => this.playTone(783.99, 0.14, 0.065, 'sine'), 110);
    setTimeout(() => this.playTone(1046.50, 0.22, 0.07, 'sine'), 180);
  }

  /**
   * Processing Complete Haptic (§4.6 & Lifecycle)
   * A subtle, long-duration tactile feedback when shelf analysis and clustering completes,
   * providing a distinctive, smooth, non-jarring signal that results are ready.
   */
  public processingComplete(): void {
    this.completedScan();
  }

  /**
   * Scan Success Haptic Pulse (§4.6 & Lifecycle)
   * Distinct multi-beat tactile celebration sequence when scan analysis completes
   * and physical spines are successfully isolated & matched
   */
  public scanSuccess(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        // Distinct 3-phase ascending pulse sequence
        navigator.vibrate([25, 45, 30, 45, 65]);
      } catch {}
    }
    // Warm harmonic ascending chord triad (C5 -> E5 -> G5)
    this.playTone(523.25, 0.09, 0.06, 'sine');
    setTimeout(() => this.playTone(659.25, 0.09, 0.07, 'sine'), 50);
    setTimeout(() => this.playTone(783.99, 0.16, 0.08, 'sine'), 110);
  }

  /**
   * Synthesize clean musical or tactile tones
   */
  private playTone(frequency: number, duration: number, gainVal: number, type: OscillatorType = 'sine') {
    if (!this.isAudioTactileEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Graceful silence
    }
  }

  /**
   * General Success Notification (§4.6)
   * Double-pulse celebration pattern when items or shelves are saved
   */
  public success(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([15, 45, 25]);
      } catch {}
    }
    this.playMicroClick(680, 0.01, 0.05);
    setTimeout(() => this.playMicroClick(920, 0.012, 0.06), 65);
  }

  /**
   * Error Notification (§4.6)
   * Rejection or failed action
   */
  public error(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([35, 40, 40]);
      } catch {}
    }
    this.playMicroClick(180, 0.02, 0.08);
  }
}

export const haptic = new HapticFeedbackService();
export default haptic;
