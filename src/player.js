// src/player.js
import * as THREE from "three";

export class Player {
  constructor({ level }) {
    this.level = level;

    // grid position
    this.r = 0;
    this.c = 0;

    // facing direction (for visuals)
    // 0 = +Z (down), PI = -Z (up), -PI/2 = +X (right), PI/2 = -X (left)
    this.facingY = 0;

    // animation state
    this.baseY = 0.0;
    this.walkPhase = 0;
    this.isWalking = false;
    this.walkTimer = 0; // seconds remaining to walk after a move

    // Build Mafia Man as a Group
    this.root = new THREE.Group();

    // MATERIALS
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x111418,
      roughness: 0.85,
      metalness: 0.05,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      roughness: 0.9,
      metalness: 0.0,
    });
    const tieMat = new THREE.MeshStandardMaterial({
      color: 0xbb1e2d,
      roughness: 0.75,
      metalness: 0.05,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe8c39e,
      roughness: 0.95,
      metalness: 0.0,
    });
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x0b0b0b,
      roughness: 0.9,
      metalness: 0.0,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.6,
      metalness: 0.1,
    });

    // body
    this.bodyGroup = new THREE.Group();
    this.root.add(this.bodyGroup);

    // Body (suit torso)
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.6, 0.28),
      suitMat
    );
    torso.position.set(0, 0.55, 0);
    this.bodyGroup.add(torso);

    // Shirt panel (front)
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.38, 0.01),
      shirtMat
    );
    shirt.position.set(0, 0.56, 0.145);
    this.bodyGroup.add(shirt);

    // Tie - simple wedge
    const tie = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 3), tieMat);
    tie.rotation.x = Math.PI; // point down
    tie.position.set(0, 0.52, 0.155);
    this.bodyGroup.add(tie);

    // Legs
    const legGeom = new THREE.BoxGeometry(0.16, 0.35, 0.18);
    const legL = new THREE.Mesh(legGeom, suitMat);
    const legR = new THREE.Mesh(legGeom, suitMat);
    legL.position.set(-0.11, 0.18, 0);
    legR.position.set(0.11, 0.18, 0);
    this.bodyGroup.add(legL, legR);

    // Arms swing
    const armGeom = new THREE.BoxGeometry(0.12, 0.36, 0.14);

    this.armL = new THREE.Mesh(armGeom, suitMat);
    this.armR = new THREE.Mesh(armGeom, suitMat);

    // pivot arms from shoulder
    this.armLPivot = new THREE.Group();
    this.armRPivot = new THREE.Group();

    this.armLPivot.position.set(-0.3, 0.73, 0);
    this.armRPivot.position.set(0.3, 0.73, 0);

    this.armL.position.set(0, -0.18, 0);
    this.armR.position.set(0, -0.18, 0);

    this.armLPivot.add(this.armL);
    this.armRPivot.add(this.armR);

    this.bodyGroup.add(this.armLPivot, this.armRPivot);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 16),
      skinMat
    );
    head.position.set(0, 0.98, 0);
    this.root.add(head);

    // Facet o make direction obvious
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), eyeMat);
    const eye2 = eye.clone();
    eye.position.set(-0.07, 1.02, 0.18);
    eye2.position.set(0.07, 1.02, 0.18);
    this.root.add(eye, eye2);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 10), skinMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.98, 0.21);
    this.root.add(nose);

    // Hat: brim + crown
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 0.04, 18),
      hatMat
    );
    brim.position.set(0, 1.16, 0);
    this.root.add(brim);

    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.18, 18),
      hatMat
    );
    crown.position.set(0, 1.25, 0);
    this.root.add(crown);

    // hat band
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.23, 0.03, 18),
      tieMat
    );
    band.position.set(0, 1.19, 0);
    this.root.add(band);

    // Shadows off
    this.root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
  }

  /**
   * Set player grid position + move mesh to correct world position
   */
  setGridPos(r, c) {
    this.r = r;
    this.c = c;
    const { x, z } = this.level.gridToWorld(r, c);

    // a little above ground
    this.baseY = 0.0;
    this.root.position.set(x, 0.0, z);
  }

  /**
   * movement (tile step)
   */
  tryMove(dr, dc) {
    const nr = this.r + dr;
    const nc = this.c + dc;
    if (!this.level.isWalkable(nr, nc)) return false;

    // set facing based on direction (so face points where moving)
    if (dr === -1 && dc === 0) this.facingY = Math.PI; // up (-Z)
    else if (dr === 1 && dc === 0) this.facingY = 0; // down (+Z)
    else if (dr === 0 && dc === -1) this.facingY = -Math.PI / 2; // right (+X)
    else if (dr === 0 && dc === 1) this.facingY = Math.PI / 2; // left (-X)

    this.root.rotation.y = this.facingY;

    this.setGridPos(nr, nc);

    // trigger a short walk animation burst
    this.isWalking = true;
    this.walkTimer = 0.18; // seconds
    return true;
  }

  /**
   * Simple walk animation:
   * - body bob
   * - arms swing
   */
  timeStep(dt, t) {
    if (this.walkTimer > 0) {
      this.walkTimer -= dt;
      this.isWalking = true;
    } else {
      this.isWalking = false;
    }

    if (this.isWalking) {
      this.walkPhase += dt * 14.0; // speed of swing
      const bob = 0.05 * Math.abs(Math.sin(this.walkPhase));
      this.root.position.y = this.baseY + bob;

      const swing = 0.6 * Math.sin(this.walkPhase);
      this.armLPivot.rotation.x = swing;
      this.armRPivot.rotation.x = -swing;
    } else {
      // settle
      this.root.position.y = this.baseY;
      this.armLPivot.rotation.x *= 0.85;
      this.armRPivot.rotation.x *= 0.85;
    }
  }
}
