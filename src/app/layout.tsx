import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { SoundProvider } from "@/lib/audio";
import { SearchProvider } from "@/lib/search/search-provider";
import { CommandPalette } from "@/components/palette/command-palette";
import { Header } from "@/components/layout/header";
import { getAllPosts, getAllSeries, getAllPaths, getAllTips } from "@/lib/content";
import { siteConfig } from "@config/index";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const posts = getAllPosts();
  const series = getAllSeries();
  const paths = getAllPaths();
  const tips = getAllTips();

  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-bg text-ink min-h-screen flex flex-col">
        <ThemeProvider>
          <SoundProvider>
            <SearchProvider>
              <Header />
              <div className="flex-1">{children}</div>
              <CommandPalette
                posts={posts}
                series={series}
                paths={paths}
                tips={tips}
              />
            </SearchProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
