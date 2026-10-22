let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, delay: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, slideTo?: number) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  setMuted(v: boolean) {
    muted = v;
  },
  place(player: 'X' | 'O') {
    tone(player === 'X' ? 660 : 495, 0, 0.14, 'triangle');
  },
  vanish() {
    tone(420, 0, 0.22, 'sine', 0.05, 160);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.09));
  },
  draw() {
    tone(330, 0, 0.18, 'sine');
    tone(262, 0.16, 0.26, 'sine');
  },
  reset() {
    tone(300, 0, 0.1, 'sine', 0.05, 500);
  },
};
