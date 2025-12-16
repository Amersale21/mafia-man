// src/game.js

// REMEMBER TO INCLUDE ATTRIBUTION
// Cash Stacks: Poly Pizza “Coin” by Quaternius
// https://poly.pizza/m/aLp0P2nXJ2

// PolyHaven Planks
// https://polyhaven.com/a/dark_wooden_planks

// Walls - White washed brick
// https://polyhaven.com/a/whitewashed_brick

import { Level } from "./level.js";
import { Player } from "./player.js";

export class Game {
  constructor({ engine, ui }) {
    this.engine = engine;
    this.ui = ui;
    // Do not start until user hits play
    this.started = false;
    this.difficulty = "easy";
    // 1) Define the grid FIRST
    // keep a template so we can reset later
    this.levelTemplate = [
      "#####################",
      "#P.................E#",
      "#.#####.#######.#####",
      "#.....#.....#.......#",
      "###.#.#####.#.#####.#",
      "#...#.......#.....#.#",
      "#.#########.#####.#.#",
      "#.................#.#",
      "#####################",
    ];
    // build initial state from template
    this.resetLevelStateFromTemplate();

    // 5) add movement for the player - event listener
    this._onKeyDown = (e) => {
      // prevent movement in menus
      if (!this.started) return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      ) {
        e.preventDefault();
      }

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W")
        this.movePlayer(-1, 0);
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
        this.movePlayer(1, 0);
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
        this.movePlayer(0, -1);
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
        this.movePlayer(0, 1);
    };
    // 7) Replay level feature, or back to menu. Going to add a next level feature as well.
    if (this.ui.btnReplay) {
      this.ui.btnReplay.addEventListener("click", async () => {
        await this.resetGame();
      });
    }
    // Back to main menu
    if (this.ui.btnBackToMenu) {
      this.ui.btnBackToMenu.addEventListener("click", () => {
        this._won = false;
        this.started = false;

        // hide win screen
        this.ui.hideWin();

        // show main menu again
        this.ui.showMenu();

        this.ui.setStatus("Choose difficulty and mode.");
      });
    }
    window.addEventListener("keydown", this._onKeyDown, { passive: false });
    // Hold, you can hold down a button to keep moving in the direction.
    const bindHoldButton = (id, dr, dc) => {
      const el = document.getElementById(id);
      if (!el) return;

      let intervalId = null;

      const start = (ev) => {
        ev.preventDefault();
        // move once immediately
        this.movePlayer(dr, dc);
        // then repeat while held
        intervalId = window.setInterval(() => this.movePlayer(dr, dc), 160);
      };

      const stop = (ev) => {
        ev.preventDefault();
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };

      // pointer events cover mouse + touch
      el.addEventListener("pointerdown", start);
      el.addEventListener("pointerup", stop);
      el.addEventListener("pointercancel", stop);
      el.addEventListener("pointerleave", stop);
    };

    bindHoldButton("btnUp", -1, 0);
    bindHoldButton("btnDown", 1, 0);
    bindHoldButton("btnLeft", 0, -1);
    bindHoldButton("btnRight", 0, 1);

    // 8. Prototype vs full model logic
    this.isFullMode = false;

    if (this.ui.modeToggle) {
      this.ui.modeToggle.addEventListener("change", async () => {
        this.isFullMode = this.ui.modeToggle.checked;
        await this.level.rebuild(this.isFullMode);
        this.level.setExitUnlocked(this.level.exitUnlocked);
        this.ui.setStatus(
          this.isFullMode ? "Full mode enabled." : "Prototype mode enabled."
        );
      });
    }

    // Start in menu, game begins when user presses Start
    this.ui.showMenu?.();

    if (this.ui.btnStart) {
      this.ui.btnStart.addEventListener("click", async () => {
        this.difficulty = this.ui.getSelectedDifficulty?.() ?? "easy";

        // Apply menu-chosen mode to the existing checkbox (so your existing pipeline works)
        const startMode = this.ui.getSelectedStartMode?.() ?? "prototype";
        if (this.ui.modeToggle)
          this.ui.modeToggle.checked = startMode === "full";

        this.ui.hideMenu?.();
        this.started = true;

        await this.startPrototype(); // sets camera + resetGame
        this.ui.setStatus(`Started: ${this.difficulty.toUpperCase()}`);
      });
    }
  }

  movePlayer(dr, dc) {
    // cant move under these conditions
    if (!this.started) return false;
    if (this._won) return false;
    const moved = this.player.tryMove(dr, dc);
    if (!moved) return false;

    // coin pickup
    if (this.level.collectCoinAt(this.player.r, this.player.c)) {
      this.score += 10;
      this.ui.setScore(this.score);
      this.ui.setStatus(`Coin collected! Coins left: ${this.level.coinCount}`);
    } else {
      this.ui.setStatus(`Player: (${this.player.r}, ${this.player.c})`);
    }
    // unlock exit when all coins are collected
    if (!this.level.exitUnlocked && this.level.coinCount === 0) {
      this.level.setExitUnlocked(true);
      this.ui.setStatus("All coins collected! Head to the exit!");
    }
    // win condition
    if (
      this.level.exitUnlocked &&
      this.level.isExitTile(this.player.r, this.player.c)
    ) {
      this._won = true;
      this.ui.setStatus(`You escaped! Final score: ${this.score}`);
      this.ui.showWin(this.score);
      return true;
    }
    return true;
  }

  async startPrototype() {
    this.engine.camera.position.set(0, 20, 8);
    this.engine.camera.lookAt(0, 0, 0);
    await this.resetGame();
  }

  resetLevelStateFromTemplate() {
    // deep grid copy from strings
    this.grid = this.levelTemplate.map((row) => row.split(""));

    // find spawn
    let pr = 0,
      pc = 0;
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c] === "P") {
          pr = r;
          pc = c;
          this.grid[r][c] = " "; // treat spawn as normal floor
        }
      }
    }

    // recreate level from fresh grid
    this.level = new Level(this.grid, 1);

    // recreate player bound to this.level
    this.player = new Player({ level: this.level });
    this.player.setGridPos(pr, pc);
  }

  async resetGame() {
    // stop win state + hide overlay
    this._won = false;
    this.ui.hideWin();

    // reset score
    this.score = 0;
    this.ui.setScore(this.score);

    // remove old objects from scene
    // (we added their root meshes to engine.scene)
    if (this.level?.root) this.engine.scene.remove(this.level.root);
    if (this.player?.root) this.engine.scene.remove(this.player.root);

    // rebuild fresh game objects
    this.resetLevelStateFromTemplate();

    // rebuild visuals based on current toggle
    this.isFullMode = this.ui.modeToggle?.checked ?? false;
    await this.level.rebuild(this.isFullMode);

    // add back to scene
    this.engine.add(this.level);
    this.engine.add(this.player);

    // lock exit visually
    this.level.setExitUnlocked(false);

    this.ui.setStatus(
      this.isFullMode ? "Full mode ready." : "Prototype ready."
    );
  }
}
