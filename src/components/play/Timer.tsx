import { useEffect, useRef, useState } from 'react';
import { playSound } from '../../lib/sound';

/** Countdown that respects an external pause flag. Returns controls for host. */
export function useCountdown(seconds: number, opts: { autoStart: boolean; paused: boolean; onExpire?: () => void; ticks?: boolean }) {
  const [remaining, setRemaining] = useState(seconds * 1000);
  const [running, setRunning] = useState(opts.autoStart);
  const last = useRef<number | null>(null);
  const expireRef = useRef(opts.onExpire);
  expireRef.current = opts.onExpire;
  const lastTick = useRef<number>(Infinity);
  const remainingRef = useRef(seconds * 1000);

  const active = running && !opts.paused && remaining > 0;

  useEffect(() => {
    if (!active) {
      last.current = null;
      return;
    }
    const id = setInterval(() => {
      const now = performance.now();
      const dt = last.current == null ? 0 : now - last.current;
      last.current = now;
      const r = remainingRef.current;
      const n = Math.max(0, r - dt);
      remainingRef.current = n;
      setRemaining(n);
      const sec = Math.ceil(n / 1000);
      if (opts.ticks !== false && sec <= 5 && sec > 0 && sec < lastTick.current) {
        lastTick.current = sec;
        playSound('tick');
      }
      if (n === 0 && r > 0) {
        setRunning(false);
        playSound('timeUp');
        expireRef.current?.();
      }
    }, 100);
    return () => clearInterval(id);
  }, [active, opts.ticks]);

  return {
    remaining,
    seconds: Math.ceil(remaining / 1000),
    fraction: seconds > 0 ? remaining / (seconds * 1000) : 0,
    running: active,
    expired: remaining === 0,
    toggle: () => setRunning((r) => !r),
    stop: () => setRunning(false),
    start: () => setRunning(true),
    reset: () => {
      lastTick.current = Infinity;
      remainingRef.current = seconds * 1000;
      setRemaining(seconds * 1000);
      setRunning(true);
    },
  };
}

export function TimerBar({ fraction, seconds, running }: { fraction: number; seconds: number; running: boolean }) {
  const color = fraction > 0.5 ? '#22c55e' : fraction > 0.2 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={`${seconds} seconds remaining`}>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ease-linear" style={{ width: `${fraction * 100}%`, background: color }} />
      </div>
      <div className={`w-14 text-right font-display text-3xl tabular-nums ${fraction <= 0.2 ? 'text-red-400' : ''} ${!running && seconds > 0 ? 'opacity-50' : ''}`}>{seconds}</div>
    </div>
  );
}
