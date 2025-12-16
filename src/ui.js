// src/ui.js
export class UI {
  constructor() {
    this.statusEl = document.getElementById("status");
    this.scoreEl = document.getElementById("score");
    this.modeToggle = document.getElementById("modeToggle");
  }
  setStatus(s) {
    if (this.statusEl) this.statusEl.textContent = s;
  }
  setScore(n) {
    if (this.scoreEl) this.scoreEl.textContent = `Score: ${n}`;
  }
}
