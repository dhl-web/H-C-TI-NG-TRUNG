/**
 * Audio utilities for Gemini 3.8 Live (16kHz PCM16 input, 24kHz PCM16 output)
 * and unary WAV playback for Gemini 3.8 Flash Lite TTS.
 */

export function downsampleAndEncodePcm16(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate = 16000
): string {
  let samples: Float32Array;
  if (inputSampleRate === targetSampleRate) {
    samples = input;
  } else {
    const ratio = inputSampleRate / targetSampleRate;
    const newLength = Math.max(1, Math.floor(input.length / ratio));
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(input.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += input[j];
        count++;
      }
      samples[i] = count > 0 ? sum / count : input[Math.min(start, input.length - 1)];
    }
  }

  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function computeRmsLevel(input: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input[i] * input[i];
  }
  const rms = Math.sqrt(sum / Math.max(1, input.length));
  return Math.min(1, rms * 4.5);
}

export class LiveAudioPlayer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(32));

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 24000 });
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.72;
      this.analyser.connect(this.ctx.destination);
      this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.nextStartTime = this.ctx.currentTime;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  enqueuePcmBase64(base64: string): void {
    const ctx = this.ensureContext();
    const binary = atob(base64);
    const byteLen = binary.length;
    const sampleCount = Math.floor(byteLen / 2);
    if (sampleCount === 0) return;

    const bytes = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const view = new DataView(bytes.buffer);
    const floatData = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      floatData[i] = view.getInt16(i * 2, true) / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, sampleCount, 24000);
    audioBuffer.copyToChannel(floatData, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    if (this.analyser) {
      source.connect(this.analyser);
    } else {
      source.connect(ctx.destination);
    }

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.015, this.nextStartTime);
    this.nextStartTime = startAt + audioBuffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };
    source.start(startAt);
  }

  interrupt(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.nextStartTime = this.ctx.currentTime;
    }
  }

  isPlaying(): boolean {
    if (!this.ctx || this.ctx.state === 'closed') return false;
    return this.activeSources.size > 0 || this.nextStartTime > this.ctx.currentTime + 0.02;
  }

  getOutputLevel(): number {
    if (!this.analyser || !this.isPlaying()) return 0;
    this.analyser.getByteFrequencyData(this.freqData);
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      sum += this.freqData[i];
    }
    return Math.min(1, (sum / (this.freqData.length * 255)) * 2.2);
  }

  close(): void {
    this.interrupt();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.analyser = null;
  }
}

let activeAudioEl: HTMLAudioElement | null = null;

export function stopWavPlayback(): void {
  if (activeAudioEl) {
    activeAudioEl.pause();
    activeAudioEl.currentTime = 0;
    activeAudioEl = null;
  }
}

export function playWavBase64(base64: string): Promise<void> {
  stopWavPlayback();
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/wav;base64,${base64}`);
    activeAudioEl = audio;
    audio.onended = () => {
      if (activeAudioEl === audio) activeAudioEl = null;
      resolve();
    };
    audio.onerror = () => {
      if (activeAudioEl === audio) activeAudioEl = null;
      reject(new Error('Không thể phát âm thanh.'));
    };
    audio.play().catch((err) => {
      if (activeAudioEl === audio) activeAudioEl = null;
      reject(err);
    });
  });
}
