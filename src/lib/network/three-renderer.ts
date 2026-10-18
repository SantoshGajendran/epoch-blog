import * as THREE from "three";
import type {
  NetworkGraph,
  Neuron,
  ThemeColors,
  GraphConfig,
} from "./types";
import { SignalSystem } from "./signals";

const DEFAULT_THEME_COLORS: ThemeColors = {
  background: "#14181c",
  surface: "#1c2227",
  ink: "#e8eef3",
  muted: "#93a1ad",
  accent: "#6fd3ff",
  lime: "#c8f43a",
  line: "#2b343c",
  topicColors: {},
};

/**
 * Pure Three.js WebGL Neural Network Renderer.
 * Framework-free engine rendering interactive 3D neural topologies with spatial depth,
 * raycasting, camera drift, cursor tilt, signal particles, and reduced motion fallback.
 */
export class ThreeNetworkRenderer {
  private canvas: HTMLCanvasElement;
  private config: GraphConfig;
  private colors: ThemeColors;
  private width: number = 800;
  private height: number = 600;
  private dpr: number = 1;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;

  private neuronsGroup: THREE.Group;
  private halosGroup: THREE.Group;
  private synapsesGroup: THREE.Group;
  private signalsGroup: THREE.Group;

  private neuronMeshMap: Map<string, THREE.Mesh> = new Map();
  private haloMap: Map<string, THREE.Mesh> = new Map();
  private postMeshes: THREE.Mesh[] = [];
  private synapsesMesh: THREE.LineSegments | null = null;
  private signalMeshes: THREE.Mesh[] = [];

  private graph: NetworkGraph | null = null;
  private signalSystem: SignalSystem;
  private filterTopicId: string | null = null;
  private selectedNeuron: Neuron | null = null;

  private cursorNdc: { x: number; y: number } = { x: 0, y: 0 };
  private currentTiltX: number = 0;
  private currentTiltY: number = 0;
  private targetTiltX: number = 0;
  private targetTiltY: number = 0;
  private baseDistance: number = 724;
  private lastAmbientSpawn: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    config: GraphConfig,
    initialColors?: ThemeColors,
    customRenderer?: THREE.WebGLRenderer
  ) {
    this.canvas = canvas;
    this.config = config;
    this.colors = initialColors ? { ...initialColors } : { ...DEFAULT_THEME_COLORS };

    if (canvas.width > 0) this.width = canvas.width;
    if (canvas.height > 0) this.height = canvas.height;

    this.scene = new THREE.Scene();

    const fov = this.config.three.cameraFov;
    const aspect = this.width / this.height;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 1, 5000);

    const fovRad = (fov * Math.PI) / 180;
    this.baseDistance = this.height / 2 / Math.tan(fovRad / 2);
    this.camera.position.set(0, 0, this.baseDistance);
    this.camera.lookAt(0, 0, 0);

    this.renderer =
      customRenderer ??
      new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });

    this.raycaster = new THREE.Raycaster();
    this.signalSystem = new SignalSystem(config);

    // Group hierarchy for clean depth ordering and traversal
    this.synapsesGroup = new THREE.Group();
    this.neuronsGroup = new THREE.Group();
    this.halosGroup = new THREE.Group();
    this.signalsGroup = new THREE.Group();

    this.scene.add(this.synapsesGroup);
    this.scene.add(this.neuronsGroup);
    this.scene.add(this.halosGroup);
    this.scene.add(this.signalsGroup);

    // Ambient and directional lighting for 3D depth perception
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.15);
    directionalLight.position.set(0, 200, 600);
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);

    this.initSignalPool();
  }

  private initSignalPool(): void {
    const maxConcurrent = this.config.signals.maxConcurrent;
    const geom = new THREE.SphereGeometry(2.5, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.colors.accent),
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < maxConcurrent; i++) {
      const mesh = new THREE.Mesh(geom, mat.clone());
      mesh.visible = false;
      this.signalsGroup.add(mesh);
      this.signalMeshes.push(mesh);
    }
  }

  private getTopicColorHex(topicId: string): string {
    return this.colors.topicColors[topicId] || this.colors.accent;
  }

  private getNeuronDepth(neuron: Neuron): number {
    const depthSpread = this.config.three.depthSpread;
    if (neuron.isPost || neuron.layer === this.config.postsLayerIndex) {
      return 0.4 * depthSpread;
    }
    switch (neuron.layer) {
      case 0:
        return -0.3 * depthSpread;
      case 1:
        return -0.1 * depthSpread;
      case 3:
        return -0.2 * depthSpread;
      default:
        return -0.1 * depthSpread;
    }
  }

  private to3DCoordinates(x: number, y: number, z: number): THREE.Vector3 {
    return new THREE.Vector3(x - this.width / 2, -(y - this.height / 2), z);
  }

  private updateNodePositions(): void {
    if (!this.graph) return;

    for (const neuron of this.graph.neurons) {
      const mesh = this.neuronMeshMap.get(neuron.id);
      if (mesh) {
        mesh.position.x = neuron.x - this.width / 2;
        mesh.position.y = -(neuron.y - this.height / 2);
        const halo = this.haloMap.get(neuron.id);
        if (halo) {
          halo.position.x = mesh.position.x;
          halo.position.y = mesh.position.y;
        }
      }
    }

    if (this.synapsesMesh) {
      const posAttr = this.synapsesMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      let idx = 0;

      for (const conn of this.graph.connections) {
        const sDepth = this.getNeuronDepth(conn.source);
        const tDepth = this.getNeuronDepth(conn.target);

        positions[idx++] = conn.source.x - this.width / 2;
        positions[idx++] = -(conn.source.y - this.height / 2);
        positions[idx++] = sDepth;

        positions[idx++] = conn.target.x - this.width / 2;
        positions[idx++] = -(conn.target.y - this.height / 2);
        positions[idx++] = tDepth;
      }

      posAttr.needsUpdate = true;
    }
  }

  private updateSynapseColors(): void {
    if (!this.synapsesMesh || !this.graph) return;

    const colorAttr = this.synapsesMesh.geometry.getAttribute("color") as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    let idx = 0;

    const accentCol = new THREE.Color(this.colors.accent);
    const mutedCol = new THREE.Color(this.colors.muted);

    for (const conn of this.graph.connections) {
      const isSelected =
        this.selectedNeuron &&
        (conn.source.id === this.selectedNeuron.id ||
          conn.target.id === this.selectedNeuron.id);

      const isFiltered =
        this.filterTopicId &&
        conn.source.topicId !== this.filterTopicId &&
        conn.target.topicId !== this.filterTopicId;

      const dim = isFiltered ? 0.14 : 1.0;

      let col: THREE.Color;
      if (isSelected) {
        col = accentCol;
      } else if (conn.isInterTopic) {
        col = mutedCol;
      } else {
        col = new THREE.Color(this.getTopicColorHex(conn.source.topicId));
      }

      const r = col.r * dim;
      const g = col.g * dim;
      const b = col.b * dim;

      // 2 vertices per line segment
      colors[idx++] = r;
      colors[idx++] = g;
      colors[idx++] = b;

      colors[idx++] = r;
      colors[idx++] = g;
      colors[idx++] = b;
    }

    colorAttr.needsUpdate = true;
  }

  private applyFilterAndSelection(): void {
    if (!this.graph) return;

    for (const neuron of this.graph.neurons) {
      const mesh = this.neuronMeshMap.get(neuron.id);
      if (!mesh) continue;

      const isFiltered = this.filterTopicId && neuron.topicId !== this.filterTopicId;
      const dim = isFiltered ? 0.14 : 1.0;
      const isSelected = this.selectedNeuron?.id === neuron.id;

      if (neuron.isPost) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = dim;
        mat.emissiveIntensity = isSelected ? 0.8 : 0.35 * dim;

        const halo = this.haloMap.get(neuron.id);
        if (halo) {
          const haloMat = halo.material as THREE.MeshBasicMaterial;
          if (isSelected) {
            haloMat.opacity = 0.9;
            halo.scale.set(1.3, 1.3, 1.3);
            haloMat.color.set(this.colors.accent);
          } else {
            haloMat.opacity = 0.25 * dim;
            halo.scale.set(1.0, 1.0, 1.0);
            haloMat.color.set(this.getTopicColorHex(neuron.topicId));
          }
        }
      } else {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.45 * dim;
      }
    }

    this.updateSynapseColors();
  }

  /**
   * Resizes renderer buffer, capping DPR at 2.0 and recalculating camera aspect and distance.
   */
  resize(width: number, height: number, dpr?: number): void {
    const rawDpr =
      dpr ??
      (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const effectiveDpr = Math.min(rawDpr || 1, 2);

    this.width = width;
    this.height = height;
    this.dpr = effectiveDpr;

    this.renderer.setPixelRatio(effectiveDpr);
    this.renderer.setSize(width, height, false);

    const fov = this.config.three.cameraFov;
    this.camera.aspect = width / height;
    this.camera.fov = fov;

    const fovRad = (fov * Math.PI) / 180;
    this.baseDistance = height / 2 / Math.tan(fovRad / 2);
    this.camera.position.z = this.baseDistance;
    this.camera.updateProjectionMatrix();

    this.updateNodePositions();
  }

  /**
   * Updates ThemeColors and applies changes to all scene materials.
   */
  setThemeColors(colors: ThemeColors): void {
    this.colors = { ...colors };

    if (!this.graph) return;

    for (const neuron of this.graph.neurons) {
      const mesh = this.neuronMeshMap.get(neuron.id);
      if (!mesh) continue;

      const hex = this.getTopicColorHex(neuron.topicId);

      if (neuron.isPost) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(hex);
        mat.emissive.set(hex);

        const halo = this.haloMap.get(neuron.id);
        if (halo) {
          const haloMat = halo.material as THREE.MeshBasicMaterial;
          haloMat.color.set(
            this.selectedNeuron?.id === neuron.id ? this.colors.accent : hex
          );
        }
      } else {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(hex);
      }
    }

    this.updateSynapseColors();
  }

  /**
   * Reconstructs 3D scene representation of the graph.
   */
  setGraph(graph: NetworkGraph): void {
    // 1. Clear previous graph scene objects
    for (const mesh of this.neuronMeshMap.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const halo of this.haloMap.values()) {
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
    }
    if (this.synapsesMesh) {
      this.synapsesMesh.geometry.dispose();
      (this.synapsesMesh.material as THREE.Material).dispose();
      this.synapsesGroup.remove(this.synapsesMesh);
      this.synapsesMesh = null;
    }

    this.neuronsGroup.clear();
    this.halosGroup.clear();
    this.neuronMeshMap.clear();
    this.haloMap.clear();
    this.postMeshes = [];

    this.graph = graph;

    // Shared reusable geometries
    const postGeom = new THREE.SphereGeometry(7, 16, 16);
    const haloGeom = new THREE.RingGeometry(11, 13, 32);
    const decorativeGeom = new THREE.SphereGeometry(3.5, 12, 12);

    // 2. Build Neuron Meshes
    for (const neuron of graph.neurons) {
      const depth = this.getNeuronDepth(neuron);
      const pos = this.to3DCoordinates(neuron.x, neuron.y, depth);
      const colorHex = this.getTopicColorHex(neuron.topicId);

      if (neuron.isPost) {
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.35,
          metalness: 0.2,
          emissive: new THREE.Color(colorHex),
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 1.0,
        });

        const mesh = new THREE.Mesh(postGeom, mat);
        mesh.position.copy(pos);
        mesh.userData = { neuron };
        this.neuronsGroup.add(mesh);
        this.neuronMeshMap.set(neuron.id, mesh);
        this.postMeshes.push(mesh);

        const haloMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(colorHex),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.25,
        });

        const halo = new THREE.Mesh(haloGeom, haloMat);
        halo.position.set(pos.x, pos.y, pos.z + 0.1);
        halo.userData = { neuron };
        this.halosGroup.add(halo);
        this.haloMap.set(neuron.id, halo);
      } else {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(colorHex),
          transparent: true,
          opacity: 0.45,
        });

        const mesh = new THREE.Mesh(decorativeGeom, mat);
        mesh.position.copy(pos);
        mesh.userData = { neuron };
        this.neuronsGroup.add(mesh);
        this.neuronMeshMap.set(neuron.id, mesh);
      }
    }

    // 3. Build Synapses LineSegments
    const connCount = graph.connections.length;
    const positions = new Float32Array(connCount * 6);
    const colors = new Float32Array(connCount * 6);

    const synapsesGeom = new THREE.BufferGeometry();
    synapsesGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    synapsesGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const synapsesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    this.synapsesMesh = new THREE.LineSegments(synapsesGeom, synapsesMat);
    this.synapsesGroup.add(this.synapsesMesh);

    this.updateNodePositions();
    this.applyFilterAndSelection();
    this.scene.updateMatrixWorld(true);
  }

  /**
   * Sets active topic filter, dimming unselected topic neurons and connections.
   */
  setFilterTopic(topicId: string | null): void {
    this.filterTopicId = topicId;
    this.applyFilterAndSelection();
  }

  /**
   * Sets selected post neuron, activating outer halo ring, brightening connections,
   * and triggering a signal burst.
   */
  setSelectedNeuron(neuron: Neuron | null): void {
    this.selectedNeuron = neuron;
    this.applyFilterAndSelection();

    if (neuron) {
      this.signalSystem.fireBurst(neuron, false);
    }
  }

  /**
   * Updates pointer coordinates for cursor-driven camera tilt.
   */
  setCursor(clientX: number, clientY: number, rect: DOMRect): void {
    const rawX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const rawY = -(((clientY - rect.top) / rect.height) * 2 - 1);

    this.cursorNdc.x = Math.max(-1, Math.min(1, rawX));
    this.cursorNdc.y = Math.max(-1, Math.min(1, rawY));

    const tiltSensitivity = this.config.three.tiltSensitivity;
    this.targetTiltY = this.cursorNdc.x * tiltSensitivity * 0.35;
    this.targetTiltX = -this.cursorNdc.y * tiltSensitivity * 0.35;
  }

  /**
   * Raycasts from pointer coordinates against post neuron meshes.
   * Ignores decorative nodes and nodes filtered out by the active topic filter.
   */
  pickNeuron(clientX: number, clientY: number, rect: DOMRect): Neuron | null {
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);

    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObjects(this.postMeshes, false);

    for (const hit of hits) {
      const neuron = hit.object.userData.neuron as Neuron | undefined;
      if (!neuron) continue;
      if (this.filterTopicId && neuron.topicId !== this.filterTopicId) continue;
      return neuron;
    }

    return null;
  }

  /**
   * Main render loop execution.
   */
  render(dt: number, now: number, isReducedMotion: boolean): void {
    if (this.graph) {
      this.updateNodePositions();
    }

    if (isReducedMotion) {
      this.camera.rotation.set(0, 0, 0);
      this.camera.position.set(0, 0, this.baseDistance);
      this.currentTiltX = 0;
      this.currentTiltY = 0;

      if (this.graph) {
        this.signalSystem.updateSignals(dt, this.graph, true);
      }
      for (const sm of this.signalMeshes) {
        sm.visible = false;
      }
    } else {
      // Ambient camera drift
      const driftSpeed = this.config.three.ambientDriftSpeed;
      const driftAngle = now * 0.001 * driftSpeed;
      const driftRotX = Math.cos(driftAngle * 0.7) * 0.025;
      const driftRotY = Math.sin(driftAngle) * 0.035;

      // Smooth camera tilt
      this.currentTiltX += (this.targetTiltX + driftRotX - this.currentTiltX) * 0.08;
      this.currentTiltY += (this.targetTiltY + driftRotY - this.currentTiltY) * 0.08;
      this.camera.rotation.x = this.currentTiltX;
      this.camera.rotation.y = this.currentTiltY;

      // Rotate post neuron halo rings
      for (const halo of this.haloMap.values()) {
        halo.rotation.z = -now * 0.0015;
      }

      // Signal propagation
      if (this.graph) {
        if (now - this.lastAmbientSpawn > this.config.signals.spawnIntervalMs) {
          if (Math.random() < this.config.signals.spawnProbability) {
            this.signalSystem.spawnAmbientSignal(this.graph, false);
          }
          this.lastAmbientSpawn = now;
        }

        this.signalSystem.updateSignals(dt, this.graph, false);
        const active = this.signalSystem.activeSignals;

        for (let i = 0; i < this.signalMeshes.length; i++) {
          const mesh = this.signalMeshes[i];
          if (i < active.length) {
            const sig = active[i];
            const sDepth = this.getNeuronDepth(sig.source);
            const tDepth = this.getNeuronDepth(sig.target);
            const p = sig.progress;

            const sx = sig.source.x - this.width / 2;
            const sy = -(sig.source.y - this.height / 2);
            const tx = sig.target.x - this.width / 2;
            const ty = -(sig.target.y - this.height / 2);

            mesh.position.set(
              sx + (tx - sx) * p,
              sy + (ty - sy) * p,
              sDepth + (tDepth - sDepth) * p
            );

            const mat = mesh.material as THREE.MeshBasicMaterial;
            const col = sig.isBackprop
              ? this.colors.accent
              : this.getTopicColorHex(sig.source.topicId);
            mat.color.set(col);
            mesh.visible = true;
          } else {
            mesh.visible = false;
          }
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Recursively disposes all geometries, materials, line segments, textures,
   * renderer context, and clears scene hierarchy.
   */
  dispose(): void {
    this.scene.traverse((obj) => {
      if ("geometry" in obj && obj.geometry instanceof THREE.BufferGeometry) {
        obj.geometry.dispose();
      }
      if ("material" in obj) {
        if (Array.isArray(obj.material)) {
          for (const m of obj.material) m.dispose();
        } else if (obj.material) {
          (obj.material as THREE.Material).dispose();
        }
      }
    });

    this.scene.clear();
    this.neuronsGroup.clear();
    this.halosGroup.clear();
    this.synapsesGroup.clear();
    this.signalsGroup.clear();

    this.neuronMeshMap.clear();
    this.haloMap.clear();
    this.postMeshes = [];
    this.signalMeshes = [];
    this.synapsesMesh = null;
    this.graph = null;

    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // Getters for testing and external consumption
  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getThemeColors(): ThemeColors {
    return this.colors;
  }

  getDpr(): number {
    return this.dpr;
  }

  getFilterTopic(): string | null {
    return this.filterTopicId;
  }

  getSelectedNeuron(): Neuron | null {
    return this.selectedNeuron;
  }

  getNeuronMesh(id: string): THREE.Mesh | undefined {
    return this.neuronMeshMap.get(id);
  }

  getNeuronHalo(id: string): THREE.Mesh | undefined {
    return this.haloMap.get(id);
  }

  getSynapsesMesh(): THREE.LineSegments | null {
    return this.synapsesMesh;
  }

  getActiveSignalCount(): number {
    return this.signalSystem.activeSignals.length;
  }
}
