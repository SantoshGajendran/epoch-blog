import { topicsConfigSchema, type TopicsConfig } from "./schemas/topics";

export const topicsConfig: TopicsConfig = topicsConfigSchema.parse({
  topics: [
    {
      id: "agents",
      label: "Agents",
      colorToken: "--c-agents",
      lightColor: "#0a86c0",
      darkColor: "#6fd3ff",
      clusterPosition: { x: 0.25, y: 0.36 },
      description: "Autonomous reasoning, tool-calling architectures, and resilient memory.",
    },
    {
      id: "rag",
      label: "RAG",
      colorToken: "--c-rag",
      lightColor: "#6c9400",
      darkColor: "#c8f43a",
      clusterPosition: { x: 0.75, y: 0.36 },
      description: "Retrieval evaluation, hybrid search, dense chunking, and rankers.",
    },
    {
      id: "tune",
      label: "Fine-tuning",
      colorToken: "--c-tune",
      lightColor: "#4a5fe0",
      darkColor: "#8ea2ff",
      clusterPosition: { x: 0.25, y: 0.74 },
      description: "QLoRA datasets, loss optimization, quantization, and local fine-tunes.",
    },
    {
      id: "infra",
      label: "Infrastructure",
      colorToken: "--c-infra",
      lightColor: "#0e9f73",
      darkColor: "#5ff0c0",
      clusterPosition: { x: 0.75, y: 0.74 },
      description: "Self-hosting models, gateway failover routing, and tracing pipelines.",
    },
  ],
});
