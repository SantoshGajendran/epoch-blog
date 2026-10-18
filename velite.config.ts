import { defineConfig, defineCollection, s } from "velite";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkGfm from "remark-gfm";
import { topicsConfig } from "./config/topics";

const validTopicIds = new Set(topicsConfig.topics.map((t) => t.id));

export const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/*.mdx",
  schema: s
    .object({
      title: s.string().max(120),
      summary: s.string().max(300),
      date: s.isodate(),
      updated: s.isodate().optional(),
      topic: s.string().refine((val) => validTopicIds.has(val), {
        message: `Topic must be one of: ${Array.from(validTopicIds).join(", ")}`,
      }),
      tags: s.array(s.string()).default([]),
      series: s
        .object({
          id: s.string(),
          order: s.number().int().min(1),
        })
        .optional(),
      draft: s.boolean().default(false),
      cover: s.string().optional(),
      toc: s.toc(),
      metadata: s.metadata(),
      body: s.mdx(),
    })
    .transform((data, { meta }) => {
      const slug = meta.path.replace(/^posts\//, "").replace(/\.mdx$/, "");
      const wordCount = meta.content?.split(/\s+/).length || 0;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      return {
        ...data,
        slug,
        permalink: `/posts/${slug}`,
        readingTime,
      };
    }),
});

export const series = defineCollection({
  name: "Series",
  pattern: "series/**/*.mdx",
  schema: s
    .object({
      id: s.string(),
      title: s.string().max(120),
      summary: s.string().max(300),
      order: s.number().int().default(1),
      body: s.mdx(),
    })
    .transform((data, { meta }) => {
      const slug = meta.path.replace(/^series\//, "").replace(/\.mdx$/, "");
      return {
        ...data,
        slug,
        permalink: `/series/${slug}`,
      };
    }),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { posts, series },
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypePrettyCode,
        {
          theme: {
            dark: "github-dark-default",
            light: "github-light-default",
          },
          keepBackground: false,
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
          properties: {
            className: ["subheading-anchor"],
            ariaLabel: "Link to section",
          },
        },
      ],
    ],
  },
});
