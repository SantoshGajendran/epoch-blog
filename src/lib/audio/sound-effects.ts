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

function dispatchSoundPlay(): void {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("epoch:sound-play"));
    } catch {
      // Ignored: custom event dispatch error
    }
  }
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

    dispatchSoundPlay();
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

    dispatchSoundPlay();
  } catch {
    // Graceful degradation on Web Audio API errors
  }
}

let lastHoverTime = 0;
const HOVER_THROTTLE_MS = 50;

export function playHoverTick(): void {
  const now = Date.now();
  if (now - lastHoverTime < HOVER_THROTTLE_MS) {
    return;
  }
  lastHoverTime = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const audioNow = ctx.currentTime;
    const duration = 0.006; // ~6ms
    const initialGain = 0.012;

    osc.type = "sine";
    osc.frequency.setValueAtTime(580, audioNow);

    gain.gain.setValueAtTime(initialGain, audioNow);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioNow + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(audioNow);
    osc.stop(audioNow + duration);

    dispatchSoundPlay();
  } catch {
    // Graceful degradation on Web Audio API errors
  }
}

export function resetHoverThrottleForTesting(): void {
  lastHoverTime = 0;
}

export const soundEffects = {
  playNodeSelectSound,
  playActionTick,
  playHoverTick,
  resetHoverThrottleForTesting,
};
