import { describe, it, expect } from "vitest";
import { topicsConfig, graphConfig } from "@config/index";
import type { Topic } from "@config/schemas/topics";
import type { Post } from "@/lib/content";
import { buildNetworkGraph } from "@/lib/network/builder";

const createMockPost = (
  overrides: Partial<Post> & { title: string; slug: string; topic: string; draft?: boolean }
): Post => ({
  permalink: `/posts/${overrides.slug}`,
  summary: `Summary for ${overrides.title}`,
  date: "2026-03-01T00:00:00Z",
  tags: [],
  draft: overrides.draft ?? false,
  readingTime: 4,
  toc: [],
  body: "",
  metadata: { readingTime: 4, wordCount: 800 },
  ...overrides,
});

const mockPosts: Post[] = [
  createMockPost({
    title: "Agents Post 1",
    slug: "agents-post-1",
    topic: "agents",
    tags: ["loops"],
  }),
  createMockPost({
    title: "Agents Post 2",
    slug: "agents-post-2",
    topic: "agents",
    tags: ["evals"],
  }),
  createMockPost({
    title: "RAG Post 1",
    slug: "rag-post-1",
    topic: "rag",
    tags: ["search"],
  }),
  createMockPost({
    title: "RAG Post 2",
    slug: "rag-post-2",
    topic: "rag",
    tags: ["chunks"],
  }),
  createMockPost({
    title: "RAG Post 3",
    slug: "rag-post-3",
    topic: "rag",
    tags: ["rankers"],
  }),
  createMockPost({
    title: "Tune Draft Post",
    slug: "tune-draft",
    topic: "tune",
    tags: ["qlora"],
    draft: true,
  }),
];

describe("Network Graph Builder", () => {
  it("generates correct number of clusters matching topics config", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);

    expect(graph.clusters.length).toBe(topicsConfig.topics.length);
    expect(graph.clustersByTopic.size).toBe(topicsConfig.topics.length);

    topicsConfig.topics.forEach((topic, idx) => {
      const cluster = graph.clustersByTopic.get(topic.id);
      expect(cluster).toBeDefined();
      expect(cluster?.topic.id).toBe(topic.id);
      expect(cluster?.clusterIndex).toBe(idx);
      expect(cluster?.hub).toEqual(topic.clusterPosition);
    });
  });

  it("constructs configured layers per cluster with dynamic posts layer sizing", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);

    // Agents has 2 published posts
    const agentsCluster = graph.clustersByTopic.get("agents")!;
    expect(agentsCluster.layers.length).toBe(graphConfig.clusterLayers.length);
    expect(agentsCluster.layers[0].length).toBe(graphConfig.clusterLayers[0]); // 2
    expect(agentsCluster.layers[1].length).toBe(graphConfig.clusterLayers[1]); // 3
    expect(agentsCluster.layers[2].length).toBe(2); // 2 published posts
    expect(agentsCluster.layers[3].length).toBe(graphConfig.clusterLayers[3]); // 2

    // RAG has 3 published posts
    const ragCluster = graph.clustersByTopic.get("rag")!;
    expect(ragCluster.layers[2].length).toBe(3);

    // Tune only has 1 draft post (0 published posts) -> fallback to 1 neuron
    const tuneCluster = graph.clustersByTopic.get("tune")!;
    expect(tuneCluster.layers[2].length).toBe(1);

    // Infra has 0 posts -> fallback to 1 neuron
    const infraCluster = graph.clustersByTopic.get("infra")!;
    expect(infraCluster.layers[2].length).toBe(1);
  });

  it("correctly assigns post metadata to post neurons and marks them isPost: true", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);

    const agentsCluster = graph.clustersByTopic.get("agents")!;
    const postLayer = agentsCluster.layers[graphConfig.postsLayerIndex];

    expect(postLayer[0].isPost).toBe(true);
    expect(postLayer[0].post).toBeDefined();
    expect(postLayer[0].post?.slug).toBe("agents-post-1");

    expect(postLayer[1].isPost).toBe(true);
    expect(postLayer[1].post).toBeDefined();
    expect(postLayer[1].post?.slug).toBe("agents-post-2");

    // All published post neurons should be aggregated in graph.postNeurons
    expect(graph.postNeurons.length).toBe(5); // 2 agents + 3 rag
    expect(graph.postNeurons.every((n) => n.isPost && n.post !== undefined)).toBe(true);
  });

  it("marks structural and empty-fallback neurons as isPost: false", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);

    const agentsCluster = graph.clustersByTopic.get("agents")!;
    // Layer 0, 1, 3 neurons are decorative
    [0, 1, 3].forEach((l) => {
      agentsCluster.layers[l].forEach((n) => {
        expect(n.isPost).toBe(false);
        expect(n.post).toBeUndefined();
      });
    });

    // Infra has 0 posts -> fallback neuron in post layer is decorative
    const infraCluster = graph.clustersByTopic.get("infra")!;
    const fallbackNeuron = infraCluster.layers[graphConfig.postsLayerIndex][0];
    expect(fallbackNeuron.isPost).toBe(false);
    expect(fallbackNeuron.post).toBeUndefined();
  });

  it("connects intra-cluster neurons fully between adjacent layers (layer L to L+1)", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);

    const agentsCluster = graph.clustersByTopic.get("agents")!;
    // Verify layer 0 (2 neurons) to layer 1 (3 neurons)
    const layer0 = agentsCluster.layers[0];
    const layer1 = agentsCluster.layers[1];

    layer0.forEach((n0) => {
      // Outgoing connections from n0 to all neurons in layer 1
      const outToLayer1 = n0.out.filter((c) => c.target.layer === 1 && !c.isInterTopic);
      expect(outToLayer1.length).toBe(layer1.length);
      layer1.forEach((n1) => {
        expect(outToLayer1.some((c) => c.target === n1)).toBe(true);
      });
    });

    layer1.forEach((n1) => {
      // Incoming connections to n1 from all neurons in layer 0
      const inFromLayer0 = n1.ins.filter((c) => c.source.layer === 0 && !c.isInterTopic);
      expect(inFromLayer0.length).toBe(layer0.length);
      layer0.forEach((n0) => {
        expect(inFromLayer0.some((c) => c.source === n0)).toBe(true);
      });
    });

    // Total intra-cluster connections for agents: (2*3) + (3*2) + (2*2) = 6 + 6 + 4 = 16
    const agentsIntra = graph.connections.filter(
      (c) => !c.isInterTopic && c.source.topicId === "agents" && c.target.topicId === "agents"
    );
    expect(agentsIntra.length).toBe(16);
  });

  it("wires inter-cluster connections according to graphConfig.interTopicLinks", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);

    const interConns = graph.connections.filter((c) => c.isInterTopic);
    expect(interConns.length).toBeGreaterThan(0);

    // Check all-to-all link: agents layer 3 (2 neurons) -> rag layer 0 (2 neurons) => 4 connections
    const agentsToRag = interConns.filter(
      (c) => c.source.topicId === "agents" && c.target.topicId === "rag"
    );
    expect(agentsToRag.length).toBe(4);
    agentsToRag.forEach((c) => {
      expect(c.source.layer).toBe(3);
      expect(c.target.layer).toBe(0);
      expect(c.isInterTopic).toBe(true);
    });

    // Check one-to-one link: agents layer 1 (3 neurons) -> tune layer 1 (3 neurons) => 3 connections
    const agentsToTune = interConns.filter(
      (c) => c.source.topicId === "agents" && c.target.topicId === "tune"
    );
    expect(agentsToTune.length).toBe(3);
    agentsToTune.forEach((c) => {
      expect(c.source.layer).toBe(1);
      expect(c.target.layer).toBe(1);
      expect(c.source.row).toBe(c.target.row);
      expect(c.isInterTopic).toBe(true);
    });

    // Check one-to-one link: rag layer 1 (3 neurons) -> infra layer 1 (3 neurons) => 3 connections
    const ragToInfra = interConns.filter(
      (c) => c.source.topicId === "rag" && c.target.topicId === "infra"
    );
    expect(ragToInfra.length).toBe(3);
    ragToInfra.forEach((c) => {
      expect(c.source.row).toBe(c.target.row);
    });
  });

  it("handles dynamic addition of new topics without code changes", () => {
    const extendedTopics: Topic[] = [
      ...topicsConfig.topics,
      {
        id: "evals",
        label: "Evaluations",
        colorToken: "--c-evals",
        lightColor: "#f59e0b",
        darkColor: "#fbbf24",
        clusterPosition: { x: 0.5, y: 0.5 },
        description: "Model evaluations and benchmarks.",
      },
    ];

    const extendedPosts: Post[] = [
      ...mockPosts,
      createMockPost({
        title: "Evals Post 1",
        slug: "evals-post-1",
        topic: "evals",
        tags: ["benchmarks"],
      }),
    ];

    const graph = buildNetworkGraph(extendedTopics, graphConfig, extendedPosts);

    expect(graph.clusters.length).toBe(5);
    const evalsCluster = graph.clustersByTopic.get("evals");
    expect(evalsCluster).toBeDefined();
    expect(evalsCluster?.clusterIndex).toBe(4);
    expect(evalsCluster?.layers[2].length).toBe(1);
    expect(evalsCluster?.layers[2][0].isPost).toBe(true);
    expect(evalsCluster?.layers[2][0].post?.slug).toBe("evals-post-1");

    // Evals has intra-cluster connections: (2*3) + (3*1) + (1*2) = 11
    const evalsConns = graph.connections.filter(
      (c) => c.source.topicId === "evals" && c.target.topicId === "evals"
    );
    expect(evalsConns.length).toBe(11);
  });

  it("calculates animation born timestamps with stagger progression", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);

    const firstNeuron = graph.neurons[0];
    expect(firstNeuron.born).toBe(0); // cluster 0, layer 0, row 0

    // Later neurons have strictly increasing born times within cluster or across clusters
    const agentsCluster = graph.clustersByTopic.get("agents")!;
    const n_0_1 = agentsCluster.layers[0][1];
    expect(n_0_1.born).toBe(graphConfig.animation.rowStaggerMs);

    const n_1_0 = agentsCluster.layers[1][0];
    expect(n_1_0.born).toBe(graphConfig.animation.layerStaggerMs);

    const ragCluster = graph.clustersByTopic.get("rag")!;
    const rag_0_0 = ragCluster.layers[0][0];
    expect(rag_0_0.born).toBe(graphConfig.animation.clusterStaggerMs);
  });

  it("maintains consistent adjacency lists and flat arrays", () => {
    const graph = buildNetworkGraph(topicsConfig.topics, graphConfig, mockPosts);

    // Every connection in graph.connections has corresponding entries in source.out and target.ins
    graph.connections.forEach((conn) => {
      expect(conn.source.out).toContain(conn);
      expect(conn.target.ins).toContain(conn);
    });

    // Flat neurons count matches sum of all cluster neurons
    const sumNeurons = graph.clusters.reduce((acc, c) => acc + c.neurons.length, 0);
    expect(graph.neurons.length).toBe(sumNeurons);
  });
});
