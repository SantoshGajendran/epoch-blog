import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Header } from "@/components/layout/header";
import Home from "@/app/page";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { siteConfig } from "@config/index";

describe("Layout Components", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
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

  describe("Logo", () => {
    it("renders site name from config and links to home", () => {
      render(<Logo />);
      const link = screen.getByRole("link", { name: new RegExp(siteConfig.name, "i") });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/");
    });
  });

  describe("ThemeToggle", () => {
    it("renders with configured aria-label and toggles theme on click", () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole("button", { name: siteConfig.ui.themeToggleAriaLabel });
      expect(button).toBeInTheDocument();
      // Default resolved is dark, so button label should offer switching to Light
      expect(button).toHaveTextContent(siteConfig.ui.themeLightLabel);

      fireEvent.click(button);
      expect(button).toHaveTextContent(siteConfig.ui.themeDarkLabel);
    });
  });

  describe("Header", () => {
    it("renders logo, search trigger, and theme toggle", () => {
      render(
        <ThemeProvider>
          <Header />
        </ThemeProvider>
      );

      expect(screen.getByRole("link", { name: new RegExp(siteConfig.name, "i") })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: siteConfig.ui.searchAriaLabel })).toBeInTheDocument();
      expect(screen.getByText(siteConfig.ui.searchButtonLabel)).toBeInTheDocument();
      expect(screen.getByText(siteConfig.ui.searchShortcutLabel)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: siteConfig.ui.themeToggleAriaLabel })).toBeInTheDocument();
    });
  });

  describe("Home page foundation", () => {
    it("renders tagline and description from siteConfig", () => {
      render(<Home />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent(siteConfig.tagline);
      expect(screen.getByText(siteConfig.description)).toBeInTheDocument();
    });
  });
});
