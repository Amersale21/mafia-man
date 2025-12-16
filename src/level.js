// src/level.js
// Imports
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class Level {
  constructor(grid, tileSize = 1, textures = null) {
    this.grid = grid;
    this.tileSize = tileSize;
    this.root = new THREE.Group();

    // For coin model
    this._gltfLoader = new GLTFLoader();
    this._coinModel = null; // THREE.Object3D once loaded
    this._coinModelPromise = null;

    // Keep references so we can remove picked up coins
    this.coinMeshes = new Map();
    this.coinCount = 0;
    // Knife pickup (Level 3 only)
    this.knifeMeshes = new Map();
    this.hasKnife = false;

    // Trophy pickup (Level 4)
    this.trophyMeshes = new Map();
    this.hasTrophy = false;

    // Trophy model (Full mode)
    this._trophyModel = null;
    this._trophyModelPromise = null;

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
    this.textures = textures;
    // Add more effects for the full mode.
    this.isFullMode = false;

    // teleport pad effect
    this._teleportTiles = [];
    this._teleportTimer = 0;
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

  loadTrophyModelOnce() {
    if (this._trophyModel) return Promise.resolve(this._trophyModel);
    if (this._trophyModelPromise) return this._trophyModelPromise;

    this._trophyModelPromise = new Promise((resolve, reject) => {
      this._gltfLoader.load(
        "./assets/models/trophy.glb",
        (gltf) => {
          this._trophyModel = gltf.scene;
          resolve(this._trophyModel);
        },
        undefined,
        reject
      );
    });

    return this._trophyModelPromise;
  }

  buildPrototype() {
    // Clear everything
    this.root.clear();
    this.coinMeshes.clear();
    const wasUnlocked = this.exitUnlocked;
    this.coinCount = 0;
    this.exitMesh = null;
    this._teleportTiles = [];
    this._teleportTimer = 0;

    this.knifeMeshes.clear();
    this.hasKnife = false;

    this.trophyMeshes.clear();
    this.hasTrophy = false;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a3340 });
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd34d });

    //knife geometry
    const knifeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const knifeGeom = new THREE.BoxGeometry(0.35, 0.05, 0.08); // silly knife blade
    const handleGeom = new THREE.BoxGeometry(0.12, 0.06, 0.09);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    // trophy geometry
    const trophyGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd34d,
      roughness: 0.35,
      metalness: 0.3,
    });
    const trophyCupGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.22, 18);
    const trophyStemGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12);
    const trophyBaseGeom = new THREE.CylinderGeometry(0.22, 0.26, 0.08, 16);

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
        } else if (cell === "K") {
          // blade + handle
          const blade = new THREE.Mesh(knifeGeom, knifeMat);
          const handle = new THREE.Mesh(handleGeom, handleMat);

          // exaggerate handle so silhouette reads clearly
          handle.position.set(-0.32, 0, 0);
          blade.position.set(0.08, 0, 0);

          const knife = new THREE.Group();
          knife.add(blade);
          knife.add(handle);

          // Needs better visibility
          // stand upright instead of flat
          knife.rotation.x = 0;

          // rotate sideways so it has a profile
          knife.rotation.y = Math.PI / 2;

          // slight tilt for visual interest + readability
          knife.rotation.z = Math.PI / 8;

          // make it larger so it’s obvious
          knife.scale.set(1.5, 1.5, 1.5);

          const root = new THREE.Group();
          root.position.set(x, 0.22, z);
          root.add(knife);

          this.root.add(root);
          this.knifeMeshes.set(`${r},${c}`, {
            root,
            spin: knife,
            baseY: 0.22,
          });
        } else if (cell === "T") {
          const cup = new THREE.Mesh(trophyCupGeom, trophyGoldMat);
          cup.position.set(0, 0.18, 0);

          const stem = new THREE.Mesh(trophyStemGeom, trophyGoldMat);
          stem.position.set(0, 0.08, 0);

          const base = new THREE.Mesh(
            trophyBaseGeom,
            new THREE.MeshStandardMaterial({ color: 0x3a2a12 })
          );
          base.position.set(0, 0.02, 0);

          const trophy = new THREE.Group();
          trophy.add(cup, stem, base);

          // tilt so it reads from top-down + look “special”
          trophy.rotation.x = -Math.PI / 8;
          trophy.rotation.z = Math.PI / 10;
          trophy.scale.set(1.6, 1.6, 1.6);

          const root = new THREE.Group();
          root.position.set(x, 0.18, z);
          root.add(trophy);

          this.root.add(root);
          this.trophyMeshes.set(`${r},${c}`, {
            root,
            spin: trophy,
            baseY: 0.18,
          });
        }
      }
    }
    this.setExitUnlocked(wasUnlocked);
  }
  /*
   * Build full model - has textures and custom models.
   */
  async buildFull() {
    this.ensureTexturesLoaded();
    this._teleportTiles = [];
    this._teleportTimer = 0;
    // preserve current exit lock state across rebuild
    const wasUnlocked = this.exitUnlocked;

    this.root.clear();
    this.coinMeshes.clear();
    this.coinCount = 0;
    this.exitMesh = null;

    this.knifeMeshes.clear();
    this.hasKnife = false;

    this.trophyMeshes.clear();
    this.hasTrophy = false;

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

    const knifeGeom = new THREE.BoxGeometry(0.34, 0.04, 0.1); // blade
    const handleGeom = new THREE.BoxGeometry(0.18, 0.06, 0.12); // handle

    const knifeMat = new THREE.MeshStandardMaterial({
      color: 0xd9d9d9, // silver blade
      roughness: 0.35,
      metalness: 0.8,
    });

    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x2b2b2b, // dark handle
      roughness: 0.9,
      metalness: 0.05,
    });

    const coinGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
    await this.loadCoinModelOnce();
    await this.loadTrophyModelOnce();
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
        } else if (cell === "K") {
          // blade + handle
          const blade = new THREE.Mesh(knifeGeom, knifeMat);
          const handle = new THREE.Mesh(handleGeom, handleMat);

          handle.position.set(-0.32, 0, 0);
          blade.position.set(0.08, 0, 0);

          const knife = new THREE.Group();
          knife.add(blade);
          knife.add(handle);

          // Had to adjust knife to make it easier to see

          // stand upright instead of flat
          knife.rotation.x = 0;

          // rotate sideways so it has a profile
          knife.rotation.y = Math.PI / 2;

          knife.rotation.z = Math.PI / 8;

          // make it larger so it’s obvious
          knife.scale.set(1.5, 1.5, 1.5);

          const root = new THREE.Group();
          root.position.set(x, 0.22, z);
          root.add(knife);

          this.root.add(root);
          this.knifeMeshes.set(`${r},${c}`, {
            root,
            spin: knife,
            baseY: 0.22,
          });
        } else if (cell === "T") {
          const model = this._trophyModel.clone(true);

          const trophy = new THREE.Group();
          trophy.add(model);

          // more readable
          trophy.scale.set(2.5, 2.5, 2.5);
          trophy.rotation.x = -Math.PI / 10;
          trophy.rotation.y = Math.PI / 4;
          trophy.rotation.z = Math.PI / 12;

          const root = new THREE.Group();
          root.position.set(x, 0.22, z);
          root.add(trophy);

          this.root.add(root);
          this.trophyMeshes.set(`${r},${c}`, {
            root,
            spin: trophy,
            baseY: 0.22,
          });
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

  collectKnifeAt(r, c) {
    const key = `${r},${c}`;
    const entry = this.knifeMeshes.get(key);
    if (!entry) return false;

    this.root.remove(entry.root);
    this.knifeMeshes.delete(key);

    this.grid[r][c] = " "; // tile becomes empty
    this.hasKnife = true; // level remembers
    return true;
  }

  collectTrophyAt(r, c) {
    const key = `${r},${c}`;
    const entry = this.trophyMeshes.get(key);
    if (!entry) return false;

    this.root.remove(entry.root);
    this.trophyMeshes.delete(key);

    this.grid[r][c] = " ";
    this.hasTrophy = true;
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
      // bobbing effect
      entry.root.position.y = entry.baseY + 0.05 * Math.sin(t * 4.0);

      // spin
      if (entry.spin.isMesh) {
        // prototype cylinder (lying flat): spin around Z looks best
        entry.spin.rotation.z += dt * 2.0;
      } else {
        // gltf model
        entry.spin.rotation.y += dt * 2.0;
      }
    }

    for (const entry of this.knifeMeshes.values()) {
      entry.root.position.y = entry.baseY + 0.04 * Math.sin(t * 5.0);
      entry.spin.rotation.y += dt * 2.5;
    }

    for (const entry of this.trophyMeshes.values()) {
      entry.root.position.y = entry.baseY + 0.05 * Math.sin(t * 3.5);
      entry.spin.rotation.y += dt * 2.0;
    }

    // Teleport pad effect: Full mode only, only when exit is unlocked
    if (this.isFullMode && this.exitUnlocked && this.exitMesh) {
      // spawn a few tiles per second
      this._teleportTimer += dt;
      while (this._teleportTimer > 0.08) {
        // ~12.5 per second
        this._teleportTimer -= 0.08;
        this._spawnTeleportTile();
      }
    }

    // animate existing tiles
    for (let i = this._teleportTiles.length - 1; i >= 0; i--) {
      const p = this._teleportTiles[i];
      p.life -= dt;

      // rise
      p.mesh.position.y += p.vy * dt;

      // fade out
      const a = Math.max(0, p.life / p.maxLife);
      p.mesh.material.opacity = 0.55 * a;

      if (p.life <= 0) {
        this.root.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this._teleportTiles.splice(i, 1);
      }
    }
  }

  ensureTexturesLoaded() {
    if (this._floorTex && this._wallTex) return;

    if (!this._texLoader) this._texLoader = new THREE.TextureLoader();

    // DEFAULTS (Level 1 & 2)
    let floorPath = "./assets/textures/floor.jpg";
    let wallPath = "./assets/textures/wall.jpg";

    // OVERRIDE (Level 3 only)
    if (this.textures) {
      if (this.textures.floor) floorPath = this.textures.floor;
      if (this.textures.wall) wallPath = this.textures.wall;
    }

    this._floorTex = this._texLoader.load(floorPath);
    this._wallTex = this._texLoader.load(wallPath);

    // tile nicely
    this._floorTex.wrapS = this._floorTex.wrapT = THREE.RepeatWrapping;
    this._wallTex.wrapS = this._wallTex.wrapT = THREE.RepeatWrapping;

    this._floorTex.repeat.set(1, 1);
    this._wallTex.repeat.set(1, 1);
  }

  async rebuild(isFull) {
    this.isFullMode = isFull;
    if (isFull) await this.buildFull();
    else this.buildPrototype();
  }

  _spawnTeleportTile() {
    if (!this.exitMesh) return;

    // random small square size
    const s = 0.15 + Math.random() * 0.2;

    const geom = new THREE.PlaneGeometry(s, s);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x66ffcc,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const tile = new THREE.Mesh(geom, mat);

    // spawn near the exit center with slight random offset
    const ox = (Math.random() - 0.5) * this.tileSize * 0.7;
    const oz = (Math.random() - 0.5) * this.tileSize * 0.7;

    tile.position.set(
      this.exitMesh.position.x + ox,
      this.exitMesh.position.y + 0.12,
      this.exitMesh.position.z + oz
    );

    // face upward
    tile.rotation.x = -Math.PI / 2;

    // store animation params
    this._teleportTiles.push({
      mesh: tile,
      vy: 0.8 + Math.random() * 0.6, // rise speed
      life: 0.7 + Math.random() * 0.6, // seconds
      maxLife: 0, // filled below
    });
    this._teleportTiles[this._teleportTiles.length - 1].maxLife =
      this._teleportTiles[this._teleportTiles.length - 1].life;

    this.root.add(tile);
  }
}
