import type {
  TopicConfigItem,
  GraphConfig,
  Post,
  Neuron,
  Connection,
  TopicCluster,
  NetworkGraph,
} from "./types";

/**
 * Pure builder function to construct the complete Neural Network Graph.
 * Takes topic configurations, graph settings, and posts, returning
 * structured clusters, layers, and flat neuron/connection arrays with
 * bidirectional adjacency lists.
 *
 * Framework-free and DOM-free: zero React/browser dependencies.
 */
export function buildNetworkGraph(
  topics: TopicConfigItem[],
  graphConfig: GraphConfig,
  posts: Post[]
): NetworkGraph {
  const clusters: TopicCluster[] = [];
  const clustersByTopic = new Map<string, TopicCluster>();
  const allNeurons: Neuron[] = [];
  const allConnections: Connection[] = [];
  const postNeurons: Neuron[] = [];

  const clusterStagger = graphConfig.animation?.clusterStaggerMs ?? 160;
  const layerStagger = graphConfig.animation?.layerStaggerMs ?? 240;
  const rowStagger = graphConfig.animation?.rowStaggerMs ?? 70;

  // 1. Build Clusters and Neurons
  for (let ci = 0; ci < topics.length; ci++) {
    const topic = topics[ci];
    // Only map published posts to interactive neurons
    const topicPosts = posts.filter((p) => p.topic === topic.id && !p.draft);

    const layers: Neuron[][] = [];
    const clusterNeurons: Neuron[] = [];

    for (let l = 0; l < graphConfig.clusterLayers.length; l++) {
      const isPostLayer = l === graphConfig.postsLayerIndex;
      // If post layer has 0 posts, fallback to 1 decorative neuron
      const count = isPostLayer
        ? Math.max(topicPosts.length, 1)
        : graphConfig.clusterLayers[l];

      const layerNeurons: Neuron[] = [];

      for (let r = 0; r < count; r++) {
        const isActualPost = isPostLayer && r < topicPosts.length;
        const post = isActualPost ? topicPosts[r] : undefined;
        const neuronId = isActualPost
          ? `${topic.id}-post-${post!.slug}`
          : `${topic.id}-l${l}-r${r}`;
        const born = ci * clusterStagger + l * layerStagger + r * rowStagger;

        const neuron: Neuron = {
          id: neuronId,
          topicId: topic.id,
          clusterIndex: ci,
          layer: l,
          row: r,
          rowCount: count,
          isPost: isActualPost,
          post,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          f: 0,
          born,
          out: [],
          ins: [],
        };

        layerNeurons.push(neuron);
        clusterNeurons.push(neuron);
        allNeurons.push(neuron);

        if (isActualPost) {
          postNeurons.push(neuron);
        }
      }

      layers.push(layerNeurons);
    }

    const cluster: TopicCluster = {
      topic,
      clusterIndex: ci,
      hub: { ...topic.clusterPosition },
      layers,
      neurons: clusterNeurons,
    };

    clusters.push(cluster);
    clustersByTopic.set(topic.id, cluster);
  }

  // 2. Wire Intra-Cluster Connections (Layer L -> Layer L+1)
  for (const cluster of clusters) {
    for (let l = 0; l < cluster.layers.length - 1; l++) {
      const currentLayer = cluster.layers[l];
      const nextLayer = cluster.layers[l + 1];

      for (const source of currentLayer) {
        for (const target of nextLayer) {
          const connection: Connection = {
            id: `${source.id}->${target.id}`,
            source,
            target,
            isInterTopic: false,
          };

          source.out.push(connection);
          target.ins.push(connection);
          allConnections.push(connection);
        }
      }
    }
  }

  // 3. Wire Inter-Cluster Connections based on graphConfig.interTopicLinks
  for (const link of graphConfig.interTopicLinks) {
    const sourceCluster = clustersByTopic.get(link.sourceTopic);
    const targetCluster = clustersByTopic.get(link.targetTopic);

    if (!sourceCluster || !targetCluster) {
      continue;
    }

    const sourceLayer = sourceCluster.layers[link.sourceLayer];
    const targetLayer = targetCluster.layers[link.targetLayer];

    if (!sourceLayer || !targetLayer) {
      continue;
    }

    if (link.mode === "all-to-all") {
      for (const source of sourceLayer) {
        for (const target of targetLayer) {
          if (source.out.some((c) => c.target === target)) {
            continue;
          }

          const connection: Connection = {
            id: `${source.id}->${target.id}`,
            source,
            target,
            isInterTopic: true,
          };

          source.out.push(connection);
          target.ins.push(connection);
          allConnections.push(connection);
        }
      }
    } else if (link.mode === "one-to-one") {
      const count = Math.min(sourceLayer.length, targetLayer.length);
      for (let r = 0; r < count; r++) {
        const source = sourceLayer[r];
        const target = targetLayer[r];

        if (source.out.some((c) => c.target === target)) {
          continue;
        }

        const connection: Connection = {
          id: `${source.id}->${target.id}`,
          source,
          target,
          isInterTopic: true,
        };

        source.out.push(connection);
        target.ins.push(connection);
        allConnections.push(connection);
      }
    }
  }

  return {
    neurons: allNeurons,
    connections: allConnections,
    clusters,
    clustersByTopic,
    postNeurons,
  };
}
