import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/content";
import { siteConfig, topicsConfig } from "@config/index";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  const title = post?.title || siteConfig.name;
  const topicId = post?.topic || topicsConfig.topics[0]?.id || "";
  const topic = topicsConfig.topics.find((t) => t.id === topicId);
  const topicLabel = topic?.label || "Article";
  const topicColor = topic?.darkColor || "#6fd3ff";
  const readingTime = post?.readingTime || 5;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#14181c",
          color: "#e8eef3",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 400,
            height: 400,
            background: `radial-gradient(circle at top right, ${topicColor}25, transparent 70%)`,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: topicColor,
            }}
          />
          <span style={{ fontSize: 24, fontWeight: 700, color: topicColor }}>
            {topicLabel}
          </span>
          <span style={{ fontSize: 20, color: "#8b9ba8" }}>•</span>
          <span style={{ fontSize: 20, color: "#8b9ba8" }}>
            {readingTime} {siteConfig.ui.minReadSuffix || "min read"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #2b343c",
            paddingTop: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {siteConfig.name}
            </span>
          </div>
          <span style={{ fontSize: 18, color: "#8b9ba8" }}>
            {siteConfig.url.replace(/^https?:\/\//, "")}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
