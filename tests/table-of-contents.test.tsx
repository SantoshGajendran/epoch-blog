import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TableOfContents } from "@/components/post/table-of-contents";
import { siteConfig } from "@config/index";

const mockToc = [
  {
    title: "Trajectory Invariance Testing",
    url: "#trajectory-invariance-testing",
    items: [
      {
        title: "Termination Boundary Guarantees",
        url: "#termination-boundary-guarantees",
      },
    ],
  },
  {
    title: "Evaluation Metrics",
    url: "#evaluation-metrics",
  },
];

describe("TableOfContents Component", () => {
  let observerCallback: (entries: { target: { id: string }; isIntersecting: boolean }[]) => void;
  let observeMock = vi.fn();
  let unobserveMock = vi.fn();
  let disconnectMock = vi.fn();

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    window.IntersectionObserver = vi.fn().mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: observeMock,
        unobserve: unobserveMock,
        disconnect: disconnectMock,
      };
    });
  });

  it("renders table of contents title from siteConfig and heading items", () => {
    render(<TableOfContents toc={mockToc} />);
    expect(screen.getAllByText(siteConfig.ui.tableOfContentsTitle).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Trajectory Invariance Testing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Termination Boundary Guarantees").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Evaluation Metrics").length).toBeGreaterThan(0);
  });

  it("renders links with proper href anchors", () => {
    render(<TableOfContents toc={mockToc} />);
    const links = screen.getAllByRole("link", { name: "Trajectory Invariance Testing" });
    expect(links[0]).toHaveAttribute("href", "#trajectory-invariance-testing");
  });

  it("toggles mobile collapse view on click", () => {
    render(<TableOfContents toc={mockToc} />);
    const trigger = screen.getByRole("button", { name: new RegExp(siteConfig.ui.tableOfContentsTitle, "i") });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("returns null if toc is empty or not provided", () => {
    const { container: c1 } = render(<TableOfContents toc={[]} />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(<TableOfContents toc={undefined} />);
    expect(c2).toBeEmptyDOMElement();
  });

  it("observes DOM heading elements that match TOC items", () => {
    const heading1 = document.createElement("div");
    heading1.id = "trajectory-invariance-testing";
    document.body.appendChild(heading1);

    const heading2 = document.createElement("div");
    heading2.id = "evaluation-metrics";
    document.body.appendChild(heading2);

    render(<TableOfContents toc={mockToc} />);
    expect(observeMock).toHaveBeenCalledWith(heading1);
    expect(observeMock).toHaveBeenCalledWith(heading2);

    document.body.removeChild(heading1);
    document.body.removeChild(heading2);
  });

  it("updates active state when IntersectionObserver triggers", () => {
    const heading1 = document.createElement("div");
    heading1.id = "trajectory-invariance-testing";
    document.body.appendChild(heading1);

    render(<TableOfContents toc={mockToc} />);

    act(() => {
      observerCallback([
        {
          target: { id: "trajectory-invariance-testing" },
          isIntersecting: true,
        },
      ]);
    });

    const activeLinks = screen.getAllByRole("link", { name: "Trajectory Invariance Testing" });
    expect(activeLinks.some((link) => link.className.includes("text-primary"))).toBe(true);

    document.body.removeChild(heading1);
  });

  it("disconnects IntersectionObserver on unmount", () => {
    const heading = document.createElement("div");
    heading.id = "evaluation-metrics";
    document.body.appendChild(heading);

    const { unmount } = render(<TableOfContents toc={mockToc} />);
    unmount();
    expect(disconnectMock).toHaveBeenCalled();

    document.body.removeChild(heading);
  });

  it("applies custom className to nav element", () => {
    const { container } = render(<TableOfContents toc={mockToc} className="custom-toc-class" />);
    expect(container.querySelector("nav")).toHaveClass("custom-toc-class");
  });
});
