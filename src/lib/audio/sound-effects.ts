let cachedContext: AudioContext | null = null;
let lastContextClass: unknown = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!cachedContext || lastContextClass !== AudioContextClass || cachedContext.state === "closed") {
    try {
      cachedContext = new AudioContextClass();
      lastContextClass = AudioContextClass;
    } catch {
      return null;
    }
  }

  if (cachedContext.state === "suspended") {
    cachedContext.resume().catch(() => {
      // Ignored: browser autoplay policy restriction until user interaction
    });
  }

  return cachedContext;
}

export function playNodeSelectSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    const duration = 0.025; // ~25ms
    const initialGain = 0.08;

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(initialGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Graceful degradation on Web Audio API errors
  }
}

export function playActionTick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    const duration = 0.012; // ~12ms
    const initialGain = 0.05;

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);

    gain.gain.setValueAtTime(initialGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Graceful degradation on Web Audio API errors
  }
}

export const soundEffects = {
  playNodeSelectSound,
  playActionTick,
};
