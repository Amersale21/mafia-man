// src/player.js
import * as THREE from "three";

export class Player {
  constructor({ level, color = 0x4aa3ff }) {
    this.level = level;

    // grid position
    this.r = 0;
    this.c = 0;

    // 3D representation
    const geom = new THREE.SphereGeometry(0.35, 24, 16);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.1,
    });
    this.root = new THREE.Mesh(geom, mat);
    this.root.castShadow = false;
    this.root.receiveShadow = false;
  }

  /**
   * Set player grid position + move mesh to correct world position
   */
  setGridPos(r, c) {
    this.r = r;
    this.c = c;
    const { x, z } = this.level.gridToWorld(r, c);
    this.root.position.set(x, 0.35, z);
  }
  /**
   * adds movement to player
   * @param {*} dr - direction row
   * @param {*} dc - direction column
   * @returns
   */
  tryMove(dr, dc) {
    const nr = this.r + dr;
    const nc = this.c + dc;
    if (this.level.isWalkable(nr, nc)) {
      this.setGridPos(nr, nc);
      return true;
    }
    return false;
  }
  // later we can animate bobbing/turning here
  timeStep(dt, t) {}
}
