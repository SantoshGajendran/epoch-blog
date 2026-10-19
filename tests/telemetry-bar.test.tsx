import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TelemetryBar } from "@/components/network/telemetry-bar";
import { SoundProvider } from "@/lib/audio/sound-provider";
import { siteConfig, topicsConfig, graphConfig } from "@config/index";
import { buildNetworkGraph } from "@/lib/network";
import { getAllPosts } from "@/lib/content";
import Home from "@/app/page";

function createMockContext() {
  return {
    canvas: { width: 800, height: 600, style: { width: "800px", height: "600px" } },
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "#000",
    fillStyle: "#000",
    font: "",
    textAlign: "left",
    shadowColor: "",
    shadowBlur: 0,
    lineDashOffset: 0,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    roundRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  };
}

describe("TelemetryBar Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    // Mock matchMedia defaulting to no reduced motion
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

    // Mock Canvas 2D
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((id: string) => {
      if (id === "2d") return createMockContext();
      return null;
    });

    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Mock ResizeObserver
    class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    // Mock IntersectionObserver
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    // Mock requestAnimationFrame / cancelAnimationFrame
    vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
      return setTimeout(() => cb(Date.now()), 16) as unknown as number;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders live cybernetic status readouts and labels from siteConfig.ui", () => {
    render(
      <SoundProvider>
        <TelemetryBar
          totalNeurons={18}
          postNeurons={6}
          signalCount={4}
          dimensionMode="3d"
        />
      </SoundProvider>
    );

    // Semantics & Accessibility
    const statusContainer = screen.getByRole("status");
    expect(statusContainer).toBeInTheDocument();
    expect(statusContainer).toHaveAttribute("aria-live", "off");

    // Cluster Status
    expect(
      screen.getByText(new RegExp(siteConfig.ui.telemetryClusterOnlineLabel, "i"))
    ).toBeInTheDocument();

    // Topology: total neurons and post neurons
    expect(
      screen.getByText(new RegExp(siteConfig.ui.telemetryNodesLabel, "i"))
    ).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`6 ${siteConfig.ui.telemetryPostsLabel}`, "i"))
    ).toBeInTheDocument();

    // Signal & Inference labels
    expect(
      screen.getByText(new RegExp(siteConfig.ui.telemetrySignalsLabel, "i"))
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(siteConfig.ui.telemetryInferenceLabel, "i"))
    ).toBeInTheDocument();

    // Dimension badge
    expect(screen.getByText(siteConfig.ui.viewMode3dLabel)).toBeInTheDocument();

    // Audio status (defaults to muted)
    expect(screen.getByText(siteConfig.ui.telemetrySynthMutedLabel)).toBeInTheDocument();
  });

  it("switches dimension mode badge between 2D and 3D", () => {
    const { rerender } = render(
      <TelemetryBar
        totalNeurons={12}
        postNeurons={4}
        dimensionMode="2d"
      />
    );

    expect(screen.getByText(siteConfig.ui.viewMode2dLabel)).toBeInTheDocument();
    expect(screen.queryByText(siteConfig.ui.viewMode3dLabel)).not.toBeInTheDocument();

    rerender(
      <TelemetryBar
        totalNeurons={12}
        postNeurons={4}
        dimensionMode="3d"
      />
    );

    expect(screen.getByText(siteConfig.ui.viewMode3dLabel)).toBeInTheDocument();
    expect(screen.queryByText(siteConfig.ui.viewMode2dLabel)).not.toBeInTheDocument();
  });

  it("reflects sound active state when audio is enabled", () => {
    localStorage.setItem("epoch_sound_enabled", "true");

    render(
      <SoundProvider>
        <TelemetryBar
          totalNeurons={10}
          postNeurons={3}
          dimensionMode="2d"
        />
      </SoundProvider>
    );

    expect(screen.getByText(siteConfig.ui.telemetrySynthActiveLabel)).toBeInTheDocument();
    expect(screen.queryByText(siteConfig.ui.telemetrySynthMutedLabel)).not.toBeInTheDocument();
  });

  it("supports omitting signalCount prop gracefully with default oscillation", () => {
    render(
      <TelemetryBar
        totalNeurons={15}
        postNeurons={5}
        dimensionMode="2d"
      />
    );

    expect(screen.getByText(/Hz/i)).toBeInTheDocument();
    expect(screen.getByText(/ms/i)).toBeInTheDocument();
  });

  it("freezes dynamic metrics and disables beacon pulsing under prefers-reduced-motion", () => {
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

    render(
      <TelemetryBar
        totalNeurons={20}
        postNeurons={8}
        signalCount={5}
        dimensionMode="3d"
      />
    );

    // Static average values
    expect(screen.getByText("14 ms")).toBeInTheDocument();
    expect(screen.getByText("~4.0 Hz")).toBeInTheDocument();

    // Beacon should not have animate-pulse
    const beacon = screen.getByTestId("telemetry-beacon");
    expect(beacon.className).not.toContain("animate-pulse");
  });

  it("mounts TelemetryBar on the Home page with computed graph neuron counts", () => {
    render(<Home />);

    const posts = getAllPosts();
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, posts);

    const statusElem = screen.getByRole("status");
    expect(statusElem).toBeInTheDocument();
    expect(statusElem).toHaveAttribute("aria-live", "off");

    // Total neurons & post neurons counts from graph
    expect(screen.getByText(String(graph.neurons.length))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${graph.postNeurons.length} ${siteConfig.ui.telemetryPostsLabel}`, "i"))
    ).toBeInTheDocument();
  });
});
