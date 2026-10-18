import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

describe("cn utility", () => {
  it("merges classes correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes and falsy values", () => {
    expect(cn("foo", false && "bar", undefined, null, "baz")).toBe("foo baz");
  });

  it("resolves tailwind class conflicts with last wins precedence", () => {
    expect(cn("px-2 py-1", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("Button component", () => {
  it("renders with default variant and size", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeDefined();
    expect(button.className).toContain("bg-surf");
    expect(button.className).toContain("h-9");
  });

  it("renders with outline variant and sm size", () => {
    render(
      <Button variant="outline" size="sm">
        Outline Sm
      </Button>
    );
    const button = screen.getByRole("button", { name: /outline sm/i });
    expect(button.className).toContain("bg-transparent");
    expect(button.className).toContain("h-8");
  });

  it("renders with ghost variant and icon size", () => {
    render(
      <Button variant="ghost" size="icon" aria-label="Icon Button">
        *
      </Button>
    );
    const button = screen.getByRole("button", { name: /icon button/i });
    expect(button.className).toContain("hover:bg-surf");
    expect(button.className).toContain("h-9 w-9");
  });

  it("forwards ref to HTMLButtonElement", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("supports disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button", { name: /disabled/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.className).toContain("disabled:opacity-50");
  });
});

describe("Kbd component", () => {
  it("renders keyboard shortcut element", () => {
    render(<Kbd>Ctrl</Kbd>);
    const kbd = screen.getByText("Ctrl");
    expect(kbd.tagName.toLowerCase()).toBe("kbd");
    expect(kbd.className).toContain("border-line");
    expect(kbd.className).toContain("text-mut");
  });
});
