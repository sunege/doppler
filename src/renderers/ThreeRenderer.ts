import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SimulationCore } from '../core/SimulationCore';

const WAVEFRONT_POOL_SIZE = 80;
const HEMISPHERE_SEG_W = 20;
const HEMISPHERE_SEG_H = 16;
const FLOOR_GRID_SIZE = 80;
const FLOOR_GRID_DIV = 40;

export type Render3DOptions = {
  showWavefronts: boolean;
  showSourceArrow: boolean;
  showMachCone: boolean;
  waveSpeed: number;
  vOverC: number;
  wavefrontMaxAge: number;
};

export class ThreeRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  private sourceMesh: THREE.Mesh;
  private velocityArrow: THREE.ArrowHelper;
  private wavefrontPool: THREE.Mesh[];
  private machCone: THREE.Mesh;

  private disposables: { dispose: () => void }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setClearColor(0x07091a, 1);
    this.renderer.localClippingEnabled = true;

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x07091a, 60, 180);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
    this.camera.position.set(14, 18, 42);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 4, 0);
    this.controls.minDistance = 6;
    this.controls.maxDistance = 140;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.update();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(20, 35, 15);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x8aa2ff, 0.4);
    rim.position.set(-25, 15, -25);
    this.scene.add(rim);

    const grid = new THREE.GridHelper(
      FLOOR_GRID_SIZE,
      FLOOR_GRID_DIV,
      0x4a578f,
      0x252b48,
    );
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    this.scene.add(grid);
    this.disposables.push(grid.geometry);
    if (!Array.isArray(grid.material)) this.disposables.push(grid.material);

    const xAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-FLOOR_GRID_SIZE / 2, 0.01, 0),
      new THREE.Vector3(FLOOR_GRID_SIZE / 2, 0.01, 0),
    ]);
    const xAxisMat = new THREE.LineBasicMaterial({ color: 0xff8899 });
    this.scene.add(new THREE.Line(xAxisGeom, xAxisMat));
    this.disposables.push(xAxisGeom, xAxisMat);

    const sourceGeom = new THREE.SphereGeometry(0.7, 24, 18);
    const sourceMat = new THREE.MeshStandardMaterial({
      color: 0xff5577,
      emissive: 0xff3355,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      metalness: 0.1,
    });
    this.sourceMesh = new THREE.Mesh(sourceGeom, sourceMat);
    this.sourceMesh.position.y = 0.7;
    this.scene.add(this.sourceMesh);
    this.disposables.push(sourceGeom, sourceMat);

    this.velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0.7, 0),
      4,
      0xffcc55,
      1.0,
      0.55,
    );
    this.scene.add(this.velocityArrow);

    const hemisphereGeom = new THREE.SphereGeometry(
      1,
      HEMISPHERE_SEG_W,
      HEMISPHERE_SEG_H,
      Math.PI,
      Math.PI,
      0,
      Math.PI,
    );
    this.disposables.push(hemisphereGeom);

    this.wavefrontPool = [];
    for (let i = 0; i < WAVEFRONT_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x6dc1ff,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
        clippingPlanes: [floorPlane],
      });
      const mesh = new THREE.Mesh(hemisphereGeom, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.wavefrontPool.push(mesh);
      this.disposables.push(mat);
    }

    const coneGeom = new THREE.ConeGeometry(
      1,
      1,
      40,
      1,
      true,
      Math.PI / 2,
      Math.PI,
    );
    coneGeom.translate(0, -0.5, 0);
    coneGeom.rotateZ(-Math.PI / 2);
    this.disposables.push(coneGeom);

    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffaa55,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      clippingPlanes: [floorPlane],
    });
    this.machCone = new THREE.Mesh(coneGeom, coneMat);
    this.machCone.visible = false;
    this.scene.add(this.machCone);
    this.disposables.push(coneMat);

    this.resize();
  }

  resize(): void {
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  draw(core: SimulationCore, opts: Render3DOptions): void {
    const pos = core.getSourcePosition();
    const vel = core.getSourceVelocity();
    const speed = Math.hypot(vel.x, vel.y);

    this.sourceMesh.position.x = pos.x;
    this.sourceMesh.position.z = 0;

    if (opts.showSourceArrow && speed > 1e-4) {
      this.velocityArrow.visible = true;
      this.velocityArrow.position.set(pos.x, 0.7, 0);
      const dir = new THREE.Vector3(vel.x, 0, vel.y);
      dir.normalize();
      this.velocityArrow.setDirection(dir);
      const len = 3 + speed * 2.5;
      this.velocityArrow.setLength(len, len * 0.28, len * 0.18);
    } else {
      this.velocityArrow.visible = false;
    }

    const wavefronts = core.getWavefronts();
    const maxR = opts.wavefrontMaxAge * opts.waveSpeed;
    for (let i = 0; i < this.wavefrontPool.length; i++) {
      const mesh = this.wavefrontPool[i];
      const w = wavefronts[i];
      if (
        opts.showWavefronts &&
        w &&
        w.radius > 0.1 &&
        w.radius < maxR
      ) {
        mesh.visible = true;
        mesh.position.set(w.x, 0, 0);
        mesh.scale.setScalar(w.radius);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const fade = 1 - w.radius / maxR;
        mat.opacity = Math.max(0.04, 0.2 * fade);
      } else {
        mesh.visible = false;
      }
    }

    if (opts.showMachCone && opts.vOverC > 1.001) {
      const sinTheta = Math.min(1, 1 / opts.vOverC);
      const tanTheta = Math.tan(Math.asin(sinTheta));
      let maxRadius = 0;
      for (const w of wavefronts) {
        if (w.radius < maxR && w.radius > maxRadius) maxRadius = w.radius;
      }
      const coneLength = Math.max(1, maxRadius);
      const coneRadius = coneLength * tanTheta;
      this.machCone.visible = true;
      this.machCone.position.set(pos.x, 0, 0);
      this.machCone.scale.set(coneLength, coneRadius, coneRadius);
    } else {
      this.machCone.visible = false;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resetView(): void {
    this.camera.position.set(14, 18, 42);
    this.controls.target.set(0, 4, 0);
    this.controls.update();
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.controls.dispose();
    this.renderer.dispose();
  }
}
