import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { soundEffects } from "@/lib/audio/sound-effects";
import { SoundProvider, useSound } from "@/lib/audio/sound-provider";
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

describe("Web Audio Synthesizer & Sound System", () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    localStorage.clear();
    mockCtx = new MockAudioContext();
    window.AudioContext = vi.fn().mockImplementation(() => mockCtx) as unknown as typeof AudioContext;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark"),
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

  describe("soundEffects Web Audio synthesizer", () => {
    it("synthesizes ~880Hz soft node select pulse with ~25ms exponential decay", () => {
      soundEffects.playNodeSelectSound();

      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();

      const lastOsc = (mockCtx.createOscillator as ReturnType<typeof vi.fn>).mock.results[0]
        .value as MockOscillatorNode;
      const lastGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]
        .value as MockGainNode;

      expect(lastOsc.frequency.setValueAtTime).toHaveBeenCalledWith(880, expect.any(Number));
      expect(lastGain.gain.setValueAtTime).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
      expect(lastGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        0.0001,
        expect.any(Number)
      );
      expect(lastOsc.connect).toHaveBeenCalledWith(lastGain);
      expect(lastGain.connect).toHaveBeenCalledWith(mockCtx.destination);
      expect(lastOsc.start).toHaveBeenCalled();
      expect(lastOsc.stop).toHaveBeenCalled();
    });

    it("synthesizes ~440Hz subtle click with ~12ms exponential decay", () => {
      soundEffects.playActionTick();

      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();

      const lastOsc = (mockCtx.createOscillator as ReturnType<typeof vi.fn>).mock.results[0]
        .value as MockOscillatorNode;
      const lastGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]
        .value as MockGainNode;

      expect(lastOsc.frequency.setValueAtTime).toHaveBeenCalledWith(440, expect.any(Number));
      expect(lastGain.gain.setValueAtTime).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
      expect(lastGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        0.0001,
        expect.any(Number)
      );
      expect(lastOsc.start).toHaveBeenCalled();
      expect(lastOsc.stop).toHaveBeenCalled();
    });

    it("resumes audio context if suspended due to autoplay policy", async () => {
      mockCtx.state = "suspended";
      soundEffects.playActionTick();
      expect(mockCtx.resume).toHaveBeenCalled();
    });

    it("handles resume rejection gracefully without throwing", () => {
      mockCtx.state = "suspended";
      mockCtx.resume.mockRejectedValue(new Error("Autoplay denied"));
      expect(() => soundEffects.playActionTick()).not.toThrow();
    });
  });

  describe("SoundProvider and useSound hook", () => {
    it("throws error when useSound is called outside of SoundProvider", () => {
      expect(() => {
        renderHook(() => useSound());
      }).toThrow("useSound must be used within a SoundProvider");
    });

    it("defaults to muted (false) when no preference is saved in localStorage", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(SoundProvider, null, children);

      const { result } = renderHook(() => useSound(), { wrapper });
      expect(result.current.isSoundEnabled).toBe(false);
    });

    it("loads saved preference from localStorage (epoch_sound_enabled)", () => {
      localStorage.setItem("epoch_sound_enabled", "true");

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(SoundProvider, null, children);

      const { result } = renderHook(() => useSound(), { wrapper });
      expect(result.current.isSoundEnabled).toBe(true);
    });

    it("toggles sound preference and persists to localStorage", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(SoundProvider, null, children);

      const { result } = renderHook(() => useSound(), { wrapper });
      expect(result.current.isSoundEnabled).toBe(false);

      act(() => {
        result.current.toggleSound();
      });

      expect(result.current.isSoundEnabled).toBe(true);
      expect(localStorage.getItem("epoch_sound_enabled")).toBe("true");

      act(() => {
        result.current.toggleSound();
      });

      expect(result.current.isSoundEnabled).toBe(false);
      expect(localStorage.getItem("epoch_sound_enabled")).toBe("false");
    });

    it("playSound triggers synthesizer only when sound is enabled", () => {
      const selectSpy = vi.spyOn(soundEffects, "playNodeSelectSound");
      const tickSpy = vi.spyOn(soundEffects, "playActionTick");

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(SoundProvider, null, children);

      const { result } = renderHook(() => useSound(), { wrapper });

      // When muted:
      act(() => {
        result.current.playSound("select");
        result.current.playSound("tick");
      });

      expect(selectSpy).not.toHaveBeenCalled();
      expect(tickSpy).not.toHaveBeenCalled();

      // Enable sound:
      act(() => {
        result.current.toggleSound();
      });

      act(() => {
        result.current.playSound("select");
      });
      expect(selectSpy).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.playSound("tick");
      });
      expect(tickSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Header Sound Toggle Integration", () => {
    it("renders sound toggle button with accessible aria-label and toggles state", () => {
      render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(
            SoundProvider,
            null,
            React.createElement(Header, null)
          )
        )
      );

      const toggleButton = screen.getByRole("button", {
        name: siteConfig.ui.soundToggleAriaLabel,
      });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute("title", siteConfig.ui.soundDisabledLabel);

      // Click to enable sound
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute("title", siteConfig.ui.soundEnabledLabel);
      expect(localStorage.getItem("epoch_sound_enabled")).toBe("true");

      // Click to mute sound again
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute("title", siteConfig.ui.soundDisabledLabel);
      expect(localStorage.getItem("epoch_sound_enabled")).toBe("false");
    });
  });
});
