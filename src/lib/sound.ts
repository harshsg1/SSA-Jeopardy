/**
 * Original synthesized sound effects (Web Audio API) — no audio files needed.
 */
import { useStore } from '../store/store';

let ctx: AudioContext | null = null;
let musicStop: (() => void) | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function enabled(): { on: boolean; vol: number; music: boolean } {
  const p = useStore.getState().prefs;
  return { on: p.soundEnabled && p.volume > 0, vol: p.volume, music: p.musicEnabled };
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.3, slideTo?: number) {
  const ac = audio();
  if (!ac) return;
  const { vol } = enabled();
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * vol), t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export type SoundName = 'correct' | 'incorrect' | 'reveal' | 'dailyDouble' | 'win' | 'tick' | 'timeUp' | 'select';

const SOUNDS: Record<SoundName, () => void> = {
  select: () => tone(660, 0, 0.12, 'triangle', 0.2),
  reveal: () => {
    [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.35, 'triangle', 0.22));
  },
  correct: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, 'square', 0.12));
  },
  incorrect: () => {
    tone(180, 0, 0.45, 'sawtooth', 0.22, 120);
    tone(186, 0, 0.45, 'square', 0.12, 110);
  },
  dailyDouble: () => {
    for (let i = 0; i < 10; i++) tone(300 + i * 90, i * 0.05, 0.12, 'square', 0.12);
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.55 + i * 0.12, 0.4, 'triangle', 0.22));
  },
  win: () => {
    const notes = [523, 523, 523, 659, 784, 659, 784, 1047];
    const times = [0, 0.15, 0.3, 0.45, 0.65, 0.85, 1.0, 1.25];
    notes.forEach((f, i) => tone(f, times[i], i === notes.length - 1 ? 0.9 : 0.18, 'square', 0.13));
    notes.forEach((f, i) => tone(f / 2, times[i], 0.2, 'triangle', 0.15));
  },
  tick: () => tone(1200, 0, 0.05, 'square', 0.08),
  timeUp: () => {
    tone(220, 0, 0.7, 'sawtooth', 0.2);
    tone(233, 0, 0.7, 'sawtooth', 0.15);
  },
};

export function playSound(name: SoundName) {
  if (!enabled().on) return;
  try {
    SOUNDS[name]();
  } catch {
    /* audio unavailable */
  }
}

/** A gentle, original looping "thinking" tune for Final Jeopardy. */
export function startThinkMusic(seconds = 30) {
  stopMusic();
  const { on, music } = enabled();
  if (!on || !music) return;
  const ac = audio();
  if (!ac) return;
  const melody = [392, 523, 494, 440, 392, 330, 349, 392, 440, 392, 349, 330, 294, 330, 349, 392];
  const bass = [131, 131, 165, 165, 175, 175, 147, 147];
  const beat = 0.4;
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const loopLen = melody.length * beat;
  const loops = Math.max(1, Math.ceil(seconds / loopLen));
  for (let l = 0; l < loops; l++) {
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        melody.forEach((f, i) => tone(f, i * beat, beat * 0.9, 'triangle', 0.12));
        bass.forEach((f, i) => tone(f, i * beat * 2, beat * 1.8, 'sine', 0.14));
      }, l * loopLen * 1000),
    );
  }
  musicStop = () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}

export function stopMusic() {
  musicStop?.();
  musicStop = null;
}
