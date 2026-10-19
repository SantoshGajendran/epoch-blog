import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getCompletedSteps,
  toggleStepCompletion,
  isStepCompleted,
  getPathProgress,
  clearProgress,
  PROGRESS_STORAGE_KEY,
} from "@/lib/learn/progress-storage";

describe("Progress Storage Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    clearProgress();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Toggling and Persistence", () => {
    it("reports incomplete initially", () => {
      expect(isStepCompleted("path1:step1")).toBe(false);
      expect(getCompletedSteps().has("path1:step1")).toBe(false);
    });

    it("toggles step completion and persists to localStorage", () => {
      const nowComplete = toggleStepCompletion("path1:step1");
      expect(nowComplete).toBe(true);
      expect(isStepCompleted("path1:step1")).toBe(true);
      expect(getCompletedSteps().has("path1:step1")).toBe(true);

      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed["path1:step1"]).toBe(true);

      const nowIncomplete = toggleStepCompletion("path1:step1");
      expect(nowIncomplete).toBe(false);
      expect(isStepCompleted("path1:step1")).toBe(false);
      expect(getCompletedSteps().has("path1:step1")).toBe(false);
    });

    it("dispatches 'epoch:progress-change' event when step completion is toggled", () => {
      const listener = vi.fn();
      window.addEventListener("epoch:progress-change", listener);

      try {
        toggleStepCompletion("llm:step-1");
        expect(listener).toHaveBeenCalledTimes(1);

        const event = listener.mock.calls[0][0] as CustomEvent;
        expect(event.type).toBe("epoch:progress-change");
        expect(event.detail).toEqual({
          stepKey: "llm:step-1",
          completed: true,
        });
      } finally {
        window.removeEventListener("epoch:progress-change", listener);
      }
    });

    it("dispatches 'epoch:progress-change' when clearProgress is called", () => {
      toggleStepCompletion("path:s1");
      const listener = vi.fn();
      window.addEventListener("epoch:progress-change", listener);

      try {
        clearProgress();
        expect(listener).toHaveBeenCalledTimes(1);
        expect(isStepCompleted("path:s1")).toBe(false);
        expect(getCompletedSteps().size).toBe(0);
        expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
      } finally {
        window.removeEventListener("epoch:progress-change", listener);
      }
    });
  });

  describe("Path Progress Calculation", () => {
    it("calculates path progress percentage accurately with partial completion", () => {
      toggleStepCompletion("llm:s1");
      toggleStepCompletion("llm:s2");

      const progress = getPathProgress("llm", [
        "llm:s1",
        "llm:s2",
        "llm:s3",
        "llm:s4",
      ]);
      expect(progress.completed).toBe(2);
      expect(progress.total).toBe(4);
      expect(progress.percentage).toBe(50);
    });

    it("accepts short step IDs and automatically prefixes pathId", () => {
      toggleStepCompletion("agents:step-1");

      const progress = getPathProgress("agents", ["step-1", "step-2"]);
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(2);
      expect(progress.percentage).toBe(50);
    });

    it("returns 0% when no steps are completed", () => {
      const progress = getPathProgress("rag", ["s1", "s2", "s3"]);
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(3);
      expect(progress.percentage).toBe(0);
    });

    it("returns 100% when all steps are completed", () => {
      toggleStepCompletion("rag:s1");
      toggleStepCompletion("rag:s2");
      toggleStepCompletion("rag:s3");

      const progress = getPathProgress("rag", ["s1", "s2", "s3"]);
      expect(progress.completed).toBe(3);
      expect(progress.total).toBe(3);
      expect(progress.percentage).toBe(100);
    });

    it("handles empty steps gracefully", () => {
      const progress = getPathProgress("empty-path", []);
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it("rounds percentage to nearest integer", () => {
      toggleStepCompletion("tuning:s1");
      // 1 of 3 -> 33.333% -> 33%
      const p1 = getPathProgress("tuning", ["s1", "s2", "s3"]);
      expect(p1.completed).toBe(1);
      expect(p1.total).toBe(3);
      expect(p1.percentage).toBe(33);

      toggleStepCompletion("tuning:s2");
      // 2 of 3 -> 66.666% -> 67%
      const p2 = getPathProgress("tuning", ["s1", "s2", "s3"]);
      expect(p2.completed).toBe(2);
      expect(p2.total).toBe(3);
      expect(p2.percentage).toBe(67);
    });
  });

  describe("Resilience & Error Handling", () => {
    it("handles corrupted JSON in localStorage gracefully", () => {
      localStorage.setItem(PROGRESS_STORAGE_KEY, "{corrupted-json: invalid,");

      expect(() => getCompletedSteps()).not.toThrow();
      expect(getCompletedSteps().size).toBe(0);
      expect(isStepCompleted("any:step")).toBe(false);

      // Toggling step repairs/overwrites the corrupted entry with valid JSON
      const res = toggleStepCompletion("any:step");
      expect(res).toBe(true);
      expect(isStepCompleted("any:step")).toBe(true);

      const parsed = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY)!);
      expect(parsed["any:step"]).toBe(true);
    });

    it("falls back to in-memory storage if localStorage throws an error", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError: localStorage full or blocked");
      });

      expect(() => toggleStepCompletion("sandbox:s1")).not.toThrow();
      expect(isStepCompleted("sandbox:s1")).toBe(true);
      expect(getCompletedSteps().has("sandbox:s1")).toBe(true);

      const progress = getPathProgress("sandbox", ["s1", "s2"]);
      expect(progress.completed).toBe(1);
      expect(progress.percentage).toBe(50);
    });

    it("falls back to in-memory storage if localStorage.getItem throws an error", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError: Access is denied");
      });

      expect(() => getCompletedSteps()).not.toThrow();
      expect(getCompletedSteps().size).toBe(0);
      expect(isStepCompleted("test:s1")).toBe(false);
    });
  });

  describe("SSR Environment Simulation", () => {
    it("handles SSR environment gracefully when window is undefined", () => {
      const originalWindow = globalThis.window;
      try {
        // @ts-expect-error simulating SSR
        delete globalThis.window;

        expect(() => isStepCompleted("ssr:s1")).not.toThrow();
        expect(isStepCompleted("ssr:s1")).toBe(false);
        expect(() => getCompletedSteps()).not.toThrow();
        expect(getCompletedSteps().size).toBe(0);
        expect(() => getPathProgress("ssr", ["s1", "s2"])).not.toThrow();

        // In SSR, toggling in-memory works without throwing or trying to dispatch event
        expect(() => toggleStepCompletion("ssr:s1")).not.toThrow();
        expect(isStepCompleted("ssr:s1")).toBe(true);
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });
});
