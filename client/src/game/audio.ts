export type BgmTrack = 'town' | 'home' | 'dungeon' | 'minigame';

class SoundManager {
  private bgmAudio: HTMLAudioElement | null = null;
  private currentTrack: BgmTrack | null = null;
  private muted = false;
  private volume = 0.28;
  private audioCtx: AudioContext | null = null;

  playBgm(track: BgmTrack): void {
    if (this.currentTrack === track && this.bgmAudio && !this.bgmAudio.paused) {
      return;
    }
    this.currentTrack = track;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
    const audio = new Audio(`./bgm/${track}.mp3`);
    audio.loop = true;
    audio.volume = this.muted ? 0 : this.volume;
    this.bgmAudio = audio;
    if (!this.muted) {
      audio.play().catch(() => {
        // Browser autoplay policy; will start on next user interaction
      });
    }
  }

  unlock(): void {
    if (this.bgmAudio && this.bgmAudio.paused && !this.muted) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.muted ? 0 : this.volume;
      if (!this.muted && this.bgmAudio.paused) {
        this.bgmAudio.play().catch(() => {});
      }
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  playPop(freq = 520, duration = 0.08): void {
    if (this.muted) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, this.audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Ignore audio context errors
    }
  }

  playChime(): void {
    this.playPop(587, 0.09);
    setTimeout(() => this.playPop(880, 0.14), 75);
  }
}

export const soundManager = new SoundManager();
