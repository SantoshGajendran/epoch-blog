"use client";

import * as React from "react";
import { soundEffects } from "./sound-effects";

const STORAGE_KEY = "epoch_sound_enabled";

export interface SoundContextValue {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playSound: (type: "select" | "tick") => void;
}

const SoundContext = React.createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [isSoundEnabled, setIsSoundEnabled] = React.useState<boolean>(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsSoundEnabled(stored === "true");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleSound = React.useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const playSound = React.useCallback(
    (type: "select" | "tick") => {
      if (!isSoundEnabled) return;

      if (type === "select") {
        soundEffects.playNodeSelectSound();
      } else if (type === "tick") {
        soundEffects.playActionTick();
      }
    },
    [isSoundEnabled]
  );

  const value = React.useMemo<SoundContextValue>(
    () => ({
      isSoundEnabled,
      toggleSound,
      playSound,
    }),
    [isSoundEnabled, toggleSound, playSound]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const context = React.useContext(SoundContext);
  if (!context) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context;
}

export function useOptionalSound(): SoundContextValue | null {
  return React.useContext(SoundContext);
}
