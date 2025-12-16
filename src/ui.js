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
    //Level transition
    this.levelScreen = document.getElementById("levelScreen");
    this.levelTitle = document.getElementById("levelTitle");
    this.levelText = document.getElementById("levelText");
    this.btnNextLevel = document.getElementById("btnNextLevel");
    this.btnBackToMenu2 = document.getElementById("btnBackToMenu2");
    // RNG mode added
    this.rngEnemySpawn = document.getElementById("rngSpawn");
    // credits screen
    this.creditsScreen = document.getElementById("creditsScreen");
    this.btnCredits = document.getElementById("btnCredits");
    this.btnBackFromCredits = document.getElementById("btnBackFromCredits");
    // Hide Hud when looking at credits
    this.hud = document.getElementById("hud");

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

  showLevelComplete(title, text) {
    if (this.levelTitle) this.levelTitle.textContent = title;
    if (this.levelText) this.levelText.textContent = text;
    if (this.levelScreen) this.levelScreen.style.display = "flex";
  }
  hideLevelComplete() {
    if (this.levelScreen) this.levelScreen.style.display = "none";
  }
  getEnemyRng() {
    return this.rngEnemySpawn ? this.rngEnemySpawn.checked : false;
  }

  showCredits() {
    if (this.menuScreen) this.menuScreen.style.display = "none";
    if (this.hud) this.hud.style.display = "none";
    if (this.creditsScreen) this.creditsScreen.style.display = "flex";
  }

  hideCredits() {
    if (this.creditsScreen) this.creditsScreen.style.display = "none";
    if (this.menuScreen) this.menuScreen.style.display = "flex";
    if (this.hud) this.hud.style.display = "block";
  }
}
