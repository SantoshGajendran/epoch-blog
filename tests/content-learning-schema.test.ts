import { describe, it, expect } from "vitest";
import {
  getAllPaths,
  getPathById,
  getAllTips,
  getTipById,
  type Path,
  type Tip,
} from "@/lib/content";

describe("Learning Content Collections Schema & Queries", () => {
  describe("Paths Collection", () => {
    it("returns all paths sorted by order ascending", () => {
      const paths: Path[] = getAllPaths();
      expect(paths.length).toBeGreaterThanOrEqual(2);

      for (let i = 0; i < paths.length - 1; i++) {
        expect(paths[i].order).toBeLessThanOrEqual(paths[i + 1].order);
      }
    });

    it("retrieves llm-systems-engineering roadmap with correct schema and milestones", () => {
      const path = getPathById("llm-systems-engineering");
      expect(path).toBeDefined();

      if (!path) return;
      expect(path.id).toBe("llm-systems-engineering");
      expect(path.title).toBe("LLM Systems Engineering Roadmap");
      expect(path.summary).toContain("Master GPU memory management");
      expect(path.badge).toBe("LLM");
      expect(path.level).toBe("Intermediate");
      expect(path.estimatedHours).toBe(12);
      expect(path.order).toBe(1);
      expect(path.slug).toBe("llm-systems-engineering");
      expect(path.permalink).toBe("/learn/paths/llm-systems-engineering");
      expect(path.steps.length).toBe(3);

      expect(path.steps[0]).toEqual({
        id: "step-1",
        title: "Inference Architecture & KV Cache",
        description: "Understand vLLM PagedAttention and KV cache dynamics.",
        postSlug: "infra-vllm-speculative-decoding",
        type: "article",
      });

      expect(path.steps[1]).toEqual({
        id: "step-2",
        title: "Speculative Decoding Deep Dive",
        description: "Implement draft verification loops with small draft models.",
        postSlug: "infra-vllm-speculative-decoding",
        type: "code",
      });

      expect(path.steps[2]).toEqual({
        id: "step-3",
        title: "Throughput & Latency Benchmarking",
        description: "Profile TTFT and inter-token latency under high concurrency.",
        externalUrl: "https://github.com/vllm-project/vllm",
        type: "benchmark",
      });
    });

    it("retrieves autonomous-agents roadmap with correct schema and milestones", () => {
      const path = getPathById("autonomous-agents");
      expect(path).toBeDefined();

      if (!path) return;
      expect(path.id).toBe("autonomous-agents");
      expect(path.title).toBe("Autonomous Multi-Agent Systems");
      expect(path.badge).toBe("Agents");
      expect(path.level).toBe("Advanced");
      expect(path.estimatedHours).toBe(16);
      expect(path.order).toBe(2);
      expect(path.slug).toBe("autonomous-agents");
      expect(path.permalink).toBe("/learn/paths/autonomous-agents");
      expect(path.steps.length).toBe(2);

      expect(path.steps[0]).toEqual({
        id: "step-1",
        title: "Hierarchical Intent Routing",
        description: "Construct deterministic routers and prompt gatekeepers.",
        postSlug: "agents-hierarchical-routing",
        type: "article",
      });

      expect(path.steps[1]).toEqual({
        id: "step-2",
        title: "Autonomous Evaluation Harnesses",
        description: "Set up LLM-as-judge scoring pipelines and regression fixtures.",
        postSlug: "agents-autonomous-evals",
        type: "article",
      });
    });

    it("returns undefined for non-existent path id", () => {
      expect(getPathById("non-existent-path-id")).toBeUndefined();
    });
  });

  describe("Tips Collection", () => {
    it("returns all tips sorted by order ascending", () => {
      const tips: Tip[] = getAllTips();
      expect(tips.length).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < tips.length - 1; i++) {
        expect(tips[i].order).toBeLessThanOrEqual(tips[i + 1].order);
      }
    });

    it("retrieves pytorch-cuda-alloc-conf tip with code snippet and badges", () => {
      const tip = getTipById("pytorch-cuda-alloc-conf");
      expect(tip).toBeDefined();

      if (!tip) return;
      expect(tip.id).toBe("pytorch-cuda-alloc-conf");
      expect(tip.title).toBe("Prevent PyTorch OOM with Expandable Segments");
      expect(tip.badges).toEqual(["LLM", "Setup", "Infra"]);
      expect(tip.codeSnippet).toBe("export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True");
      expect(tip.copyLabel).toBe("Copy snippet");
      expect(tip.order).toBe(1);
      expect(tip.slug).toBe("pytorch-cuda-alloc-conf");
      expect(tip.permalink).toBe("/learn/tips/pytorch-cuda-alloc-conf");
    });

    it("retrieves vllm-speculative-tokens tip with code snippet and badges", () => {
      const tip = getTipById("vllm-speculative-tokens");
      expect(tip).toBeDefined();

      if (!tip) return;
      expect(tip.id).toBe("vllm-speculative-tokens");
      expect(tip.title).toBe("Tune Speculative Decoding Draft Length");
      expect(tip.badges).toEqual(["LLM", "Infra"]);
      expect(tip.codeSnippet).toContain("--num-speculative-tokens 5");
      expect(tip.copyLabel).toBe("Copy snippet");
      expect(tip.order).toBe(2);
      expect(tip.slug).toBe("vllm-speculative-tokens");
      expect(tip.permalink).toBe("/learn/tips/vllm-speculative-tokens");
    });

    it("retrieves rag-hybrid-rerank tip with code snippet and badges", () => {
      const tip = getTipById("rag-hybrid-rerank");
      expect(tip).toBeDefined();

      if (!tip) return;
      expect(tip.id).toBe("rag-hybrid-rerank");
      expect(tip.title).toBe("Optimized RRF Constant for Hybrid Search");
      expect(tip.badges).toEqual(["RAG", "LLM"]);
      expect(tip.codeSnippet).toContain("score = 1.0 / (60 + rank_sparse)");
      expect(tip.copyLabel).toBe("Copy snippet");
      expect(tip.order).toBe(3);
      expect(tip.slug).toBe("rag-hybrid-rerank");
      expect(tip.permalink).toBe("/learn/tips/rag-hybrid-rerank");
    });

    it("returns undefined for non-existent tip id", () => {
      expect(getTipById("non-existent-tip-id")).toBeUndefined();
    });
  });
});
