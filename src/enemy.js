// src/enemy.js
import * as THREE from "three";

export class Enemy {
  constructor({ level, getTargetRC, color = 0xcc2222, stepInterval = 0.45 }) {
    this.level = level;
    this.getTargetRC = getTargetRC; // () => ({r,c})
    this.stepInterval = stepInterval;

    this.r = 0;
    this.c = 0;

    this._acc = 0; // timer for stepping
    this._walkPhase = 0; // animation
    this._walkTimer = 0; // animate shortly after step

    this.root = new THREE.Group();

    // --- simple lego-ish body ---
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.05,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffd7a8,
      roughness: 0.9,
      metalness: 0.0,
    });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.55, 0.3),
      bodyMat
    );
    torso.position.set(0, 0.55, 0);
    this.root.add(torso);

    // legs
    const legGeom = new THREE.BoxGeometry(0.18, 0.34, 0.2);
    const legL = new THREE.Mesh(legGeom, bodyMat);
    const legR = new THREE.Mesh(legGeom, bodyMat);
    legL.position.set(-0.12, 0.18, 0);
    legR.position.set(0.12, 0.18, 0);
    this.root.add(legL, legR);

    // arms with pivots
    const armGeom = new THREE.BoxGeometry(0.12, 0.34, 0.16);
    this.armLPivot = new THREE.Group();
    this.armRPivot = new THREE.Group();
    this.armLPivot.position.set(-0.32, 0.72, 0);
    this.armRPivot.position.set(0.32, 0.72, 0);

    const armL = new THREE.Mesh(armGeom, bodyMat);
    const armR = new THREE.Mesh(armGeom, bodyMat);
    armL.position.set(0, -0.17, 0);
    armR.position.set(0, -0.17, 0);
    this.armLPivot.add(armL);
    this.armRPivot.add(armR);
    this.root.add(this.armLPivot, this.armRPivot);

    // head + face
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.28),
      headMat
    );
    head.position.set(0, 0.98, 0);
    this.root.add(head);

    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), eyeMat);
    const eye2 = eye1.clone();
    eye1.position.set(-0.06, 1.02, 0.16);
    eye2.position.set(0.06, 1.02, 0.16);
    this.root.add(eye1, eye2);

    // “nose” so forward direction is obvious
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.09, 10),
      headMat
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.98, 0.19);
    this.root.add(nose);

    this.root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
  }

  setGridPos(r, c) {
    this.r = r;
    this.c = c;
    const { x, z } = this.level.gridToWorld(r, c);
    this.root.position.set(x, 0.0, z);
  }

  // pick a spawn that’s far-ish from player: scan for walkable cells and choose max Manhattan distance
  pickSpawnFarFrom(tr, tc) {
    let best = null;
    let bestD = -1;
    for (let r = 0; r < this.level.grid.length; r++) {
      for (let c = 0; c < this.level.grid[r].length; c++) {
        if (!this.level.isWalkable(r, c)) continue;
        // avoid exit tile
        if (this.level.isExitTile(r, c)) continue;

        const d = Math.abs(r - tr) + Math.abs(c - tc);
        if (d > bestD) {
          bestD = d;
          best = { r, c };
        }
      }
    }
    return best ?? { r: 1, c: 1 };
  }

  // BFS shortest path: returns next step as {r,c} or null
  _nextStepToward(tr, tc) {
    const R = this.level.grid.length;
    const C = this.level.grid[0].length;

    const q = [];
    const parent = Array.from({ length: R }, () =>
      Array.from({ length: C }, () => null)
    );

    q.push({ r: this.r, c: this.c });
    parent[this.r][this.c] = { r: this.r, c: this.c }; // mark visited

    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    let found = false;
    while (q.length) {
      const cur = q.shift();
      if (cur.r === tr && cur.c === tc) {
        found = true;
        break;
      }
      for (const d of dirs) {
        const nr = cur.r + d.dr;
        const nc = cur.c + d.dc;
        if (!this.level.isWalkable(nr, nc)) continue;
        if (parent[nr]?.[nc]) continue; // visited

        parent[nr][nc] = cur;
        q.push({ r: nr, c: nc });
      }
    }

    if (!found) return null;

    // backtrack from target to find the step after enemy
    let cur = { r: tr, c: tc };
    let prev = parent[cur.r][cur.c];
    while (prev && !(prev.r === this.r && prev.c === this.c)) {
      cur = prev;
      prev = parent[cur.r][cur.c];
    }
    return cur; // this is the tile to move into
  }

  _faceToward(nr, nc) {
    const dr = nr - this.r;
    const dc = nc - this.c;

    // model forward = +Z
    let facingY = this.root.rotation.y;
    if (dr === -1 && dc === 0) facingY = Math.PI; // up (-Z)
    else if (dr === 1 && dc === 0) facingY = 0; // down (+Z)
    else if (dr === 0 && dc === 1) facingY = Math.PI / 2; // right (+X)
    else if (dr === 0 && dc === -1) facingY = -Math.PI / 2; // left (-X)

    this.root.rotation.y = facingY;
  }

  step() {
    const { r: tr, c: tc } = this.getTargetRC();

    const next = this._nextStepToward(tr, tc);
    if (!next) return;

    this._faceToward(next.r, next.c);
    this.setGridPos(next.r, next.c);

    // animate briefly after each step
    this._walkTimer = 0.18;
  }

  setPaused(p) {
    this.paused = p;
  }

  timeStep(dt, t) {
    if (this.paused) return;
    this._acc += dt;
    if (this._acc >= this.stepInterval) {
      this._acc = 0;
      this.step();
    }

    // small walk animation
    if (this._walkTimer > 0) {
      this._walkTimer -= dt;
      this._walkPhase += dt * 14.0;

      const bob = 0.05 * Math.abs(Math.sin(this._walkPhase));
      this.root.position.y = bob;

      const swing = 0.7 * Math.sin(this._walkPhase);
      this.armLPivot.rotation.x = swing;
      this.armRPivot.rotation.x = -swing;
    } else {
      this.root.position.y = 0;
      this.armLPivot.rotation.x *= 0.85;
      this.armRPivot.rotation.x *= 0.85;
    }
  }
}
