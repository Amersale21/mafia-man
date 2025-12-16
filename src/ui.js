// src/ui.js
export class UI {
  constructor() {
    this.statusEl = document.getElementById("status");
    this.scoreEl = document.getElementById("score");
    this.modeToggle = document.getElementById("modeToggle");

    this.winScreen = document.getElementById("winScreen");
    this.winText = document.getElementById("winText");
    this.btnReplay = document.getElementById("btnReplay");
  }

  setStatus(s) {
    if (this.statusEl) this.statusEl.textContent = s;
  }

  setScore(n) {
    if (this.scoreEl) this.scoreEl.textContent = `Score: ${n}`;
  }

  showWin(score) {
    if (this.winText) this.winText.textContent = `Your score was: ${score}`;
    if (this.winScreen) this.winScreen.style.display = "flex";
  }

  hideWin() {
    if (this.winScreen) this.winScreen.style.display = "none";
  }
}
