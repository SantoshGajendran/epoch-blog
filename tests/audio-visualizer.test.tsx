import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AudioVisualizer } from "@/components/layout/audio-visualizer";
import { SoundProvider, useSound } from "@/lib/audio/sound-provider";
import {
  soundEffects,
  playHoverTick,
  playNodeSelectSound,
  playActionTick,
  resetHoverThrottleForTesting,
} from "@/lib/audio/sound-effects";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { siteConfig } from "@config/index";

class MockAudioParam {
  value = 0;
  setValueAtTime = vi.fn().mockReturnThis();
  exponentialRampToValueAtTime = vi.fn().mockReturnThis();
  linearRampToValueAtTime = vi.fn().mockReturnThis();
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = vi.fn();
}

class MockOscillatorNode {
  type: OscillatorType = "sine";
  frequency = new MockAudioParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  destination = {};
  createGain = vi.fn().mockImplementation(() => new MockGainNode());
  createOscillator = vi.fn().mockImplementation(() => new MockOscillatorNode());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

describe("AudioVisualizer Component and Micro-Ticks", () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    localStorage.clear();
    resetHoverThrottleForTesting();
    mockCtx = new MockAudioContext();
    window.AudioContext = vi.fn().mockImplementation(() => mockCtx) as unknown as typeof AudioContext;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("<AudioVisualizer />", () => {
    it("renders 5 visualizer equalizer bars with accessible aria-label and role='img'", () => {
      render(
        <SoundProvider>
          <AudioVisualizer />
        </SoundProvider>
      );

      const visualizer = screen.getByRole("img", {
        name: siteConfig.ui.audioVisualizerAriaLabel,
      });
      expect(visualizer).toBeInTheDocument();
      expect(visualizer.children.length).toBe(5);
    });

    it("renders muted state with flat 2px bars when isSoundEnabled is false", () => {
      render(
        <SoundProvider>
          <AudioVisualizer />
        </SoundProvider>
      );

      const visualizer = screen.getByRole("img", {
        name: siteConfig.ui.audioVisualizerAriaLabel,
      });

      const bars = Array.from(visualizer.children) as HTMLElement[];
      expect(bars).toHaveLength(5);
      bars.forEach((bar) => {
        expect(bar.style.height).toBe("2px");
        expect(bar.className).toContain("bg-mut/40");
      });
    });

    it("renders active wave heights when sound is enabled", () => {
      // Pre-enable sound in localStorage
      localStorage.setItem("epoch_sound_enabled", "true");

      render(
        <SoundProvider>
          <AudioVisualizer />
        </SoundProvider>
      );

      const visualizer = screen.getByRole("img", {
        name: siteConfig.ui.audioVisualizerAriaLabel,
      });

      const bars = Array.from(visualizer.children) as HTMLElement[];
      expect(bars).toHaveLength(5);
      // At least one bar should be taller than 2px when active
      const heights = bars.map((b) => parseFloat(b.style.height));
      expect(heights.some((h) => h > 2)).toBe(true);
    });

    it("peaks heights and triggers circuit glow on 'epoch:sound-play' event, then decays after 300ms", () => {
      vi.useFakeTimers();
      localStorage.setItem("epoch_sound_enabled", "true");

      render(
        <SoundProvider>
          <AudioVisualizer />
        </SoundProvider>
      );

      const visualizer = screen.getByRole("img", {
        name: siteConfig.ui.audioVisualizerAriaLabel,
      });

      // Dispatch sound-play event
      act(() => {
        window.dispatchEvent(new CustomEvent("epoch:sound-play"));
      });

      const bars = Array.from(visualizer.children) as HTMLElement[];
      // In peak state, bars should reach between 12px and 16px
      const peakHeights = bars.map((b) => parseFloat(b.style.height));
      expect(peakHeights.every((h) => h >= 12 && h <= 16)).toBe(true);
      expect(bars[0].className).toContain("bg-primary");

      // Advance timers by 300ms
      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Decayed back to idle wave
      const decayedHeights = (Array.from(visualizer.children) as HTMLElement[]).map((b) =>
        parseFloat(b.style.height)
      );
      expect(decayedHeights.some((h) => h < 12)).toBe(true);

      vi.useRealTimers();
    });

    it("freezes bar heights to static calm baseline when prefers-reduced-motion is active", () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      localStorage.setItem("epoch_sound_enabled", "true");

      render(
        <SoundProvider>
          <AudioVisualizer />
        </SoundProvider>
      );

      const visualizer = screen.getByRole("img", {
        name: siteConfig.ui.audioVisualizerAriaLabel,
      });

      const bars = Array.from(visualizer.children) as HTMLElement[];
      expect(bars).toHaveLength(5);
      // Under reduced motion, bars should stay at a calm static height (e.g. 4px) without animation
      bars.forEach((bar) => {
        expect(bar.style.height).toBe("4px");
      });
    });
  });

  describe("Micro-Audio Hover Ticks & Synthesizer Events", () => {
    it("synthesizes ~580Hz sine click with ~6ms duration and 0.012 gain decay", () => {
      playHoverTick();

      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();

      const lastOsc = (mockCtx.createOscillator as ReturnType<typeof vi.fn>).mock.results[0]
        .value as MockOscillatorNode;
      const lastGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]
        .value as MockGainNode;

      expect(lastOsc.frequency.setValueAtTime).toHaveBeenCalledWith(580, expect.any(Number));
      expect(lastGain.gain.setValueAtTime).toHaveBeenCalledWith(0.012, expect.any(Number));
      expect(lastGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        0.0001,
        expect.any(Number)
      );
      expect(lastOsc.connect).toHaveBeenCalledWith(lastGain);
      expect(lastGain.connect).toHaveBeenCalledWith(mockCtx.destination);
      expect(lastOsc.start).toHaveBeenCalled();
      expect(lastOsc.stop).toHaveBeenCalled();
    });

    it("enforces an internal throttle of 50ms so rapid calls do not buzz", () => {
      playHoverTick();
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);

      // Immediate second call should be throttled
      playHoverTick();
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);

      // Advance Date.now or wait 60ms
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 60);
      playHoverTick();
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);

      nowSpy.mockRestore();
    });

    it("dispatches 'epoch:sound-play' event on window when sounds play", () => {
      const listener = vi.fn();
      window.addEventListener("epoch:sound-play", listener);

      playHoverTick();
      expect(listener).toHaveBeenCalledTimes(1);

      playNodeSelectSound();
      expect(listener).toHaveBeenCalledTimes(2);

      playActionTick();
      expect(listener).toHaveBeenCalledTimes(3);

      window.removeEventListener("epoch:sound-play", listener);
    });

    it("supports playSound('hover') in SoundProvider", () => {
      const hoverSpy = vi.spyOn(soundEffects, "playHoverTick").mockImplementation(() => {});

      function Consumer() {
        const { playSound, toggleSound } = useSound();
        return (
          <div>
            <button onClick={() => toggleSound()}>Toggle</button>
            <button onClick={() => playSound("hover")}>Hover</button>
          </div>
        );
      }

      render(
        <SoundProvider>
          <Consumer />
        </SoundProvider>
      );

      // When muted, playSound should not trigger
      fireEvent.click(screen.getByText("Hover"));
      expect(hoverSpy).not.toHaveBeenCalled();

      // Enable sound
      fireEvent.click(screen.getByText("Toggle"));

      // Now hover should trigger
      fireEvent.click(screen.getByText("Hover"));
      expect(hoverSpy).toHaveBeenCalledTimes(1);

      hoverSpy.mockRestore();
    });
  });

  describe("Header Integration", () => {
    it("mounts AudioVisualizer immediately to the left of the Sound Toggle button in Header", () => {
      render(
        <ThemeProvider>
          <SoundProvider>
            <Header />
          </SoundProvider>
        </ThemeProvider>
      );

      const visualizer = screen.getByRole("img", {
        name: siteConfig.ui.audioVisualizerAriaLabel,
      });
      const soundButton = screen.getByRole("button", {
        name: siteConfig.ui.soundToggleAriaLabel,
      });

      expect(visualizer).toBeInTheDocument();
      expect(soundButton).toBeInTheDocument();

      // Check DOM sibling order: visualizer should precede sound button
      const parent = soundButton.parentElement;
      expect(parent).toBeInTheDocument();
      const children = Array.from(parent!.children);
      const visualizerIndex = children.indexOf(visualizer);
      const soundButtonIndex = children.indexOf(soundButton);

      expect(visualizerIndex).toBe(soundButtonIndex - 1);
    });
  });
});
