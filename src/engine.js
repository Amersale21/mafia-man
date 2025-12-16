// src/engine.js
import * as THREE from "three";

export class Engine {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x20252b);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // lights (simple + good-looking)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x303030, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(10, 20, 10);
    this.scene.add(dir);

    this.clock = new THREE.Clock();
    this.objects = []; // things with timeStep
    window.addEventListener("resize", () => this.resize());
  }

  add(obj3dOrWrapper) {
    // wrapper style: { root: THREE.Object3D, timeStep(dt,t) {} }
    if (obj3dOrWrapper?.root) this.scene.add(obj3dOrWrapper.root);
    else this.scene.add(obj3dOrWrapper);
    if (obj3dOrWrapper?.timeStep) this.objects.push(obj3dOrWrapper);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  start() {
    const tick = () => {
      const dt = this.clock.getDelta();
      const t = this.clock.elapsedTime;

      for (const o of this.objects) o.timeStep(dt, t);

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(tick);
    };
    tick();
  }
}
