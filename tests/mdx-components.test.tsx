import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Callout } from "@/components/post/callout";
import { Figure } from "@/components/post/figure";
import { DiagramSlot } from "@/components/post/diagram-slot";
import { CodeBlock } from "@/components/post/code-block";
import { MDXContent } from "@/components/post/mdx-content";

describe("MDX Components", () => {
  describe("Callout", () => {
    it("renders callout with specified type and title", () => {
      render(
        <Callout type="tip" title="Pro Tip">
          Remember to optimize inference latency.
        </Callout>
      );
      expect(screen.getByText("Pro Tip")).toBeInTheDocument();
      expect(screen.getByText("Remember to optimize inference latency.")).toBeInTheDocument();
      expect(screen.getByRole("region")).toHaveAttribute("data-type", "tip");
    });

    it("renders callout with default note type and aria label", () => {
      render(<Callout>Default note content</Callout>);
      expect(screen.getByText("Default note content")).toBeInTheDocument();
      const region = screen.getByRole("region");
      expect(region).toHaveAttribute("data-type", "note");
      expect(region).toHaveAttribute("aria-label", "note callout");
    });

    it("renders caution callout correctly", () => {
      render(
        <Callout type="caution" title="Danger Zone">
          High memory usage detected.
        </Callout>
      );
      expect(screen.getByText("Danger Zone")).toBeInTheDocument();
      expect(screen.getByRole("region")).toHaveAttribute("data-type", "caution");
    });
  });

  describe("Figure", () => {
    it("renders image and caption", () => {
      render(
        <Figure src="/images/evals.png" alt="Evals graph" caption="Evaluation metrics overview" />
      );
      const img = screen.getByAltText("Evals graph");
      expect(img).toBeInTheDocument();
      expect(screen.getByText("Evaluation metrics overview")).toBeInTheDocument();
    });

    it("renders figure without caption", () => {
      render(<Figure src="/images/diagram.png" alt="Architecture diagram" />);
      const img = screen.getByAltText("Architecture diagram");
      expect(img).toBeInTheDocument();
      expect(screen.queryByRole("caption")).not.toBeInTheDocument();
    });
  });

  describe("DiagramSlot", () => {
    it("renders interactive diagram placeholder slot with accessible name", () => {
      render(<DiagramSlot name="neural-activation-flow" title="Interactive Activation Flow" />);
      expect(screen.getByText("Interactive Activation Flow")).toBeInTheDocument();
      expect(screen.getByText("[Interactive Component Slot: neural-activation-flow]")).toBeInTheDocument();
    });

    it("renders custom children inside diagram slot", () => {
      render(
        <DiagramSlot name="custom-flow" title="Custom Flow" description="A custom diagram">
          <div data-testid="custom-child">Visualizer</div>
        </DiagramSlot>
      );
      expect(screen.getByText("Custom Flow")).toBeInTheDocument();
      expect(screen.getByText("A custom diagram")).toBeInTheDocument();
      expect(screen.getByTestId("custom-child")).toBeInTheDocument();
    });
  });

  describe("CodeBlock", () => {
    it("renders pre element with copy button", () => {
      render(
        <CodeBlock data-language="python" data-theme="dark">
          <code>{"print('hello world')"}</code>
        </CodeBlock>
      );
      const copyBtn = screen.getByRole("button", { name: /copy code/i });
      expect(copyBtn).toBeInTheDocument();
      expect(screen.getByText("python")).toBeInTheDocument();
    });

    it("renders with custom data-title in header", () => {
      render(
        <CodeBlock data-title="main.py" data-language="python">
          <code>{"def main(): pass"}</code>
        </CodeBlock>
      );
      expect(screen.getByText("main.py")).toBeInTheDocument();
    });

    it("copies code to clipboard on click", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <CodeBlock data-language="bash">
          <code>{"npm install"}</code>
        </CodeBlock>
      );

      const copyBtn = screen.getByRole("button", { name: /copy code/i });
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith("npm install");
      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeInTheDocument();
      });
    });

    it("renders without title/language header using hovering copy button", () => {
      render(
        <CodeBlock>
          <code>{"const x = 1;"}</code>
        </CodeBlock>
      );
      const copyBtn = screen.getByRole("button", { name: /copy code/i });
      expect(copyBtn).toBeInTheDocument();
    });
  });

  describe("MDXContent", () => {
    it("evaluates and renders compiled MDX code string", () => {
      const mockCode =
        'const {jsx: _jsx} = arguments[0]; return { default: (props) => _jsx("div", { "data-testid": "mdx-root", children: "Compiled Content" }) };';
      render(<MDXContent code={mockCode} />);
      expect(screen.getByTestId("mdx-root")).toHaveTextContent("Compiled Content");
    });
  });
});
