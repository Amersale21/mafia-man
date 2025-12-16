// src/level.js
import * as THREE from "three";

export class Level {
  constructor(grid, tileSize = 1) {
    this.grid = grid;
    this.tileSize = tileSize;
    this.root = new THREE.Group();

    // Keep references if we want to remove coins later
    this.coinMeshes = new Map(); // key "r,c" -> mesh
    this.coinCount = 0;
  }

  buildPrototype() {
    this.root.clear();
    this.coinMeshes.clear();
    this.coinCount = 0;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a3340 });
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd34d });
    const exitMat = new THREE.MeshStandardMaterial({ color: 0x33cc66 });

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
          const coin = new THREE.Mesh(coinGeom, coinMat);
          coin.rotation.x = Math.PI / 2;
          coin.position.set(x, 0.15, z);
          this.root.add(coin);
          this.coinMeshes.set(`${r},${c}`, coin);
          this.coinCount++;
        } else if (cell === "E") {
          const exit = new THREE.Mesh(
            new THREE.BoxGeometry(this.tileSize, 0.1, this.tileSize),
            exitMat
          );
          exit.position.set(x, 0.05, z);
          this.root.add(exit);
        }
      }
    }
  }

  // helper for later
  isWall(r, c) {
    return this.grid?.[r]?.[c] === "#";
  }
}
