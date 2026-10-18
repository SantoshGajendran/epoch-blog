import { siteConfig } from "@config/index";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <section className="max-w-2xl py-6">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.05]">
          {siteConfig.tagline}
        </h1>
        <p className="mt-4 text-lg text-mut leading-relaxed">
          {siteConfig.description}
        </p>
      </section>
    </main>
  );
}
