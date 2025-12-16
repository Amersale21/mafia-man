// src/level.js
// Imports
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class Level {
  constructor(grid, tileSize = 1) {
    this.grid = grid;
    this.tileSize = tileSize;
    this.root = new THREE.Group();

    // For coin model
    this._gltfLoader = new GLTFLoader();
    this._coinModel = null; // THREE.Object3D once loaded
    this._coinModelPromise = null;

    // Keep references if we want to remove coins later
    this.coinMeshes = new Map(); // key "r,c" -> mesh
    this.coinCount = 0;

    // Tile stays grey until all coins are picked up
    // When all coins picked up, you can win the game
    this.exitMesh = null;
    this.exitLockedMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    this.exitUnlockedMat = new THREE.MeshStandardMaterial({ color: 0x33cc66 });
    this.exitUnlocked = false;

    // Now need to support full model
    this._texLoader = null;
    this._floorTex = null;
    this._wallTex = null;
  }

  loadCoinModelOnce() {
    if (this._coinModel) return Promise.resolve(this._coinModel);
    if (this._coinModelPromise) return this._coinModelPromise;

    this._coinModelPromise = new Promise((resolve, reject) => {
      this._gltfLoader.load(
        "./assets/models/coin.glb",
        (gltf) => {
          this._coinModel = gltf.scene;
          resolve(this._coinModel);
        },
        undefined,
        reject
      );
    });

    return this._coinModelPromise;
  }

  buildPrototype() {
    this.root.clear();
    this.coinMeshes.clear();
    this.coinCount = 0;
    this.exitMesh = null;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a3340 });
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd34d });

    const floorGeom = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    const wallGeom = new THREE.BoxGeometry(
      this.tileSize,
      this.tileSize,
      this.tileSize
    );
    const coinGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const x = (c - this.grid[r].length / 2) * this.tileSize;
        const z = (r - this.grid.length / 2) * this.tileSize;

        // floor everywhere (even under walls, keeps it simple)
        const floor = new THREE.Mesh(floorGeom, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        this.root.add(floor);

        const cell = this.grid[r][c];
        if (cell === "#") {
          const wall = new THREE.Mesh(wallGeom, wallMat);
          wall.position.set(x, this.tileSize / 2, z);
          this.root.add(wall);
        } else if (cell === ".") {
          const coinMesh = new THREE.Mesh(coinGeom, coinMat);
          coinMesh.rotation.x = Math.PI / 2;

          const root = new THREE.Group();
          root.position.set(x, 0.15, z);
          root.add(coinMesh);

          this.root.add(root);
          this.coinMeshes.set(`${r},${c}`, {
            root,
            spin: coinMesh,
            baseY: 0.15,
          });

          this.coinCount++;
        } else if (cell === "E") {
          const exit = new THREE.Mesh(
            new THREE.BoxGeometry(this.tileSize, 0.1, this.tileSize),
            this.exitLockedMat
          );
          exit.position.set(x, 0.05, z);
          this.root.add(exit);

          this.exitMesh = exit;
          this.exitUnlocked = false;
        }
      }
    }
  }
  /*
   * Build full model - has textures and custom models.
   */
  async buildFull() {
    this.ensureTexturesLoaded();

    // preserve current exit lock state across rebuild
    const wasUnlocked = this.exitUnlocked;

    this.root.clear();
    this.coinMeshes.clear();
    this.coinCount = 0;
    this.exitMesh = null;

    const floorMat = new THREE.MeshStandardMaterial({
      map: this._floorTex,
      roughness: 0.9,
      metalness: 0.0,
    });

    const wallMat = new THREE.MeshStandardMaterial({
      map: this._wallTex,
      roughness: 0.95,
      metalness: 0.0,
    });

    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd34d,
      roughness: 0.6,
      metalness: 0.1,
    });

    const floorGeom = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    const wallGeom = new THREE.BoxGeometry(
      this.tileSize,
      this.tileSize,
      this.tileSize
    );
    const coinGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
    await this.loadCoinModelOnce();
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const x = (c - this.grid[r].length / 2) * this.tileSize;
        const z = (r - this.grid.length / 2) * this.tileSize;

        // floor tile
        const floor = new THREE.Mesh(floorGeom, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        this.root.add(floor);

        const cell = this.grid[r][c];

        if (cell === "#") {
          const wall = new THREE.Mesh(wallGeom, wallMat);
          wall.position.set(x, this.tileSize / 2, z);
          this.root.add(wall);
        } else if (cell === ".") {
          const model = this._coinModel.clone(true);

          // Put the model inside a wrapper group so bobbing is always visible
          const root = new THREE.Group();
          root.position.set(x, 0.15, z);

          model.scale.set(0.6, 0.6, 0.6);
          root.add(model);

          this.root.add(root);
          this.coinMeshes.set(`${r},${c}`, { root, spin: model, baseY: 0.15 });

          this.coinCount++;
        } else if (cell === "E") {
          const exit = new THREE.Mesh(
            new THREE.BoxGeometry(this.tileSize, 0.1, this.tileSize),
            this.exitLockedMat // will be corrected by setExitUnlocked below
          );
          exit.position.set(x, 0.05, z);
          this.root.add(exit);
          this.exitMesh = exit;
        }
      }
    }

    // restore exit state + correct material
    this.setExitUnlocked(wasUnlocked);
  }

  inBounds(r, c) {
    return r >= 0 && r < this.grid.length && c >= 0 && c < this.grid[0].length;
  }

  isWalkable(r, c) {
    if (!this.inBounds(r, c)) return false;
    return this.grid[r][c] !== "#";
  }
  // get useful coordinates for the player
  gridToWorld(r, c) {
    const x = (c - this.grid[0].length / 2) * this.tileSize;
    const z = (r - this.grid.length / 2) * this.tileSize;
    return { x, z };
  }

  collectCoinAt(r, c) {
    const key = `${r},${c}`;
    const entry = this.coinMeshes.get(key);
    if (!entry) return false;

    this.root.remove(entry.root);
    this.coinMeshes.delete(key);
    this.coinCount = Math.max(0, this.coinCount - 1);

    // update grid: coin is now empty
    this.grid[r][c] = " ";

    return true;
  }

  setExitUnlocked(unlocked) {
    this.exitUnlocked = unlocked;
    if (this.exitMesh) {
      this.exitMesh.material = unlocked
        ? this.exitUnlockedMat
        : this.exitLockedMat;
    }
  }

  isExitTile(r, c) {
    return this.grid?.[r]?.[c] === "E";
  }

  timeStep(dt, t) {
    for (const entry of this.coinMeshes.values()) {
      // bob the wrapper so it always moves visibly
      entry.root.position.y = entry.baseY + 0.05 * Math.sin(t * 4.0);

      // spin: choose axis based on whether it's a Mesh (prototype) or a Group/model (full)
      if (entry.spin.isMesh) {
        // prototype cylinder (lying flat): spin around Z looks best
        entry.spin.rotation.z += dt * 2.0;
      } else {
        // glTF model: Y spin is usually what you want
        entry.spin.rotation.y += dt * 2.0;
      }
    }
  }

  ensureTexturesLoaded() {
    if (this._floorTex && this._wallTex) return;

    // lazy-create loader only when Full mode is first used
    if (!this._texLoader) this._texLoader = new THREE.TextureLoader();

    this._floorTex = this._texLoader.load("./assets/textures/floor.jpg");
    this._wallTex = this._texLoader.load("./assets/textures/wall.jpg");

    // make them tile nicely
    this._floorTex.wrapS = this._floorTex.wrapT = THREE.RepeatWrapping;
    this._wallTex.wrapS = this._wallTex.wrapT = THREE.RepeatWrapping;

    // tweak repetition (adjust later if you want bigger/smaller tiles)
    this._floorTex.repeat.set(1, 1);
    this._wallTex.repeat.set(1, 1);
  }

  async rebuild(isFull) {
    if (isFull) await this.buildFull();
    else this.buildPrototype();
  }
}
