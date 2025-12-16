// src/ui.js
export class UI {
  constructor() {
    this.statusEl = document.getElementById("status");
    this.scoreEl = document.getElementById("score");
    this.modeToggle = document.getElementById("modeToggle");
    // Level = win
    this.winScreen = document.getElementById("winScreen");
    this.winText = document.getElementById("winText");
    this.btnReplay = document.getElementById("btnReplay");
    this.btnBackToMenu = document.getElementById("btnBackToMenu");
    // Main menu, I added this after designing level 1
    this.menuScreen = document.getElementById("menuScreen");
    this.btnStart = document.getElementById("btnStart");
    this.difficultySelect = document.getElementById("difficultySelect");

    // === Persist Full mode across reloads ===
    if (this.modeToggle) {
      const saved = localStorage.getItem("mafiaManFullMode");
      if (saved !== null) {
        this.modeToggle.checked = saved === "1";
      }

      this.modeToggle.addEventListener("change", () => {
        localStorage.setItem(
          "mafiaManFullMode",
          this.modeToggle.checked ? "1" : "0"
        );
      });
    }
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

  showMenu() {
    if (this.menuScreen) this.menuScreen.style.display = "flex";
  }

  hideMenu() {
    if (this.menuScreen) this.menuScreen.style.display = "none";
  }

  getSelectedDifficulty() {
    return this.difficultySelect ? this.difficultySelect.value : "easy";
  }

  getSelectedStartMode() {
    const picked = document.querySelector('input[name="startMode"]:checked');
    return picked ? picked.value : "prototype"; // "prototype" or "full"
  }
}
