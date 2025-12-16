// src/game.js

// REMEMBER TO INCLUDE ATTRIBUTION
// Cash Stacks: Poly Pizza “Coin” by Quaternius
// https://poly.pizza/m/aLp0P2nXJ2

// PolyHaven Planks
// https://polyhaven.com/a/dark_wooden_planks

// Walls - White washed brick
// https://polyhaven.com/a/whitewashed_brick
// Enemy - NA
// Wall2 -https://polyhaven.com/a/dark_brick_wall
// Floor2 - https://polyhaven.com/a/plank_flooring_04
// Trophy by Casey Tumbers [CC-BY] (https://creativecommons.org/licenses/by/3.0/) via Poly Pizza (https://poly.pizza/m/6Xu7mttjodo)

import { Level } from "./level.js";
import { Player } from "./player.js";
import { Enemy } from "./enemy.js";
import * as THREE from "three";

export class Game {
  constructor({ engine, ui }) {
    this.engine = engine;
    this.ui = ui;
    // Do not start until user hits play
    this.started = false;
    this.difficulty = "easy";
    // easy mode will have no enemies
    this.ended = false;

    // system object that Engine can add safely
    this._system = {
      root: new THREE.Object3D(), // empty placeholder so scene.add works
      timeStep: (dt, t) => this._checkEndStates(),
    };

    // credits accessible
    if (this.ui.btnCredits) {
      this.ui.btnCredits.addEventListener("click", () => {
        this.ui.showCredits();
      });
    }

    if (this.ui.btnBackFromCredits) {
      this.ui.btnBackFromCredits.addEventListener("click", () => {
        this.ui.hideCredits();
      });
    }

    this.engine.add(this._system);
    this.enemies = [];
    // 1) Define the grid FIRST
    // keep a template so we can reset later
    this.levels = [
      {
        name: "Office I",
        grid: [
          "#####################",
          "#P.................E#",
          "#.#####.#######.#####",
          "#.....#.....#.......#",
          "###.#.#####.#.#####.#",
          "#...#.......#.....#.#",
          "#.#########.#####.#.#",
          "#.................#.#",
          "#####################",
        ],
      },
      {
        name: "Office II",
        grid: [
          "#########################",
          "#P..........#...........#",
          "#.#########.#.#########.#",
          "#.....#.....#.....#.....#",
          "###.#.#.#########.#.#.###",
          "#...#.#.....#.....#.#...#",
          "#.###.#####.#.#####.###.#",
          "#.....#...#.#.#...#.....#",
          "#.#####.#.#.#.#.#.#####.#",
          "#.......#.#...#.#.......#",
          "###.#####.#####.#####.###",
          "#.................E.....#",
          "#########################",
        ],
      },
      {
        name: "High Stakes",
        grid: [
          "#############################",
          "#P...........#.............E#",
          "#.#####.#####.#.#####.#####.#",
          "#.......#.....#.....#.......#",
          "###.###.#.###.###.#.###.###.#",
          "#.....#.#...#.....#...#.#...#",
          "#.###.#.###.#######.###.#.###",
          "#...#.#.....#...#...#.....#.#",
          "###.#.#####.#.#.#.#####.###.#",
          "#...#.....#.#.#.#.....#.....#",
          "#.#####.#.#.#.#.###.#.#####.#",
          "#.....#.#.#...#.....#.#.....#",
          "#.###.#.#.#####.#####.#.###.#",
          "#.....#.....K.........#.....#",
          "#############################",
        ],
      },
      {
        name: "Trophy Room",
        grid: [
          "###############",
          "#P            #",
          "#             #",
          "#             #",
          "#      T      #",
          "#             #",
          "#             #",
          "#             #",
          "###############",
        ],
      },
    ];

    this.levelIndex = 0;
    this.levelTemplate = this.levels[this.levelIndex].grid;
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
    // 8) Back to main menu
    if (this.ui.btnBackToMenu) {
      this.ui.btnBackToMenu.addEventListener("click", () => {
        this._won = false;
        this.started = false;
        this.ended = false;

        // reset to level 1 when you go back to menu
        this._setToLevel1();

        this.ui.hideWin();
        this.ui.hideLevelComplete?.();
        this.ui.showMenu();
        this.ui.setStatus("Choose difficulty and mode.");
        this.ui.setScore(0);
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
      // starts at level 0
      this.levelIndex = 0;
      this.levelTemplate = this.levels[this.levelIndex].grid;
      this.score = 0;
      this.ui.setScore(0);

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

    if (this.ui.btnNextLevel) {
      this.ui.btnNextLevel.addEventListener("click", async () => {
        this.ui.hideLevelComplete?.();
        await this.loadLevel(this.levelIndex + 1, { keepScore: true });
      });
    }

    if (this.ui.btnBackToMenu2) {
      this.ui.btnBackToMenu2.addEventListener("click", () => {
        this._won = false;
        this.started = false;
        this.ended = false;

        // IMPORTANT: reset to Level 1 for the next run
        this._setToLevel1();

        this.ui.hideLevelComplete?.();
        this.ui.hideWin();
        this.ui.showMenu();
        this.ui.setStatus("Choose difficulty and mode.");
        this.ui.setScore(0);
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
    // knife pickup (Level 3 behavior)
    if (
      this.levelIndex === 2 &&
      this.level.collectKnifeAt(this.player.r, this.player.c)
    ) {
      this.ui.setStatus("Picked up the knife! One enemy has been taken out.");

      // remove exactly ONE enemy if any exist
      const victim = this.enemies.pop();
      if (victim) {
        victim.setPaused(true);
        if (victim.root) this.engine.scene.remove(victim.root);
      }
    }

    // trophy pickup (Level 4)
    if (
      this.levelIndex === 3 &&
      this.level.collectTrophyAt(this.player.r, this.player.c)
    ) {
      this._won = true;
      this.ended = true;

      // stop enemies (should be none, but safe)
      for (const e of this.enemies) e.setPaused(true);

      // show special mafia message
      this.ui.showWin(0);
      if (this.ui.winText) {
        this.ui.winText.textContent =
          "Congratulations, you are now a part of The Mafia!";
      }

      // only option: back to menu
      if (this.ui.btnReplay) this.ui.btnReplay.style.display = "none";
      if (this.ui.btnBackToMenu)
        this.ui.btnBackToMenu.style.display = "inline-block";

      this.ui.setStatus("Trophy claimed.");
      return true;
    }

    // unlock exit when all coins are collected
    if (
      this.levelIndex <= 2 &&
      !this.level.exitUnlocked &&
      this.level.coinCount === 0
    ) {
      this.level.setExitUnlocked(true);
      this.ui.setStatus("All coins collected! Head to the exit!");
    }
    // win condition
    if (
      this.levelIndex <= 2 &&
      this.level.exitUnlocked &&
      this.level.isExitTile(this.player.r, this.player.c)
    ) {
      this._won = true;
      this.ended = true;
      for (const e of this.enemies) e.setPaused(true);

      const hasNext = this.levelIndex + 1 < this.levels.length;
      this._updateLevelButtons();

      if (hasNext) {
        this.ui.setStatus(`${this.levels[this.levelIndex].name} complete!`);
        this.ui.showLevelComplete?.(
          `${this.levels[this.levelIndex].name} Complete`,
          `Score so far: ${this.score}`
        );
      } else {
        this.ui.setStatus(`You escaped! Final score: ${this.score}`);
        this.ui.showWin(this.score);
      }
      return true;
    }

    // lose condition (enemy reaches player tile)
    if (this._enemyTouchesPlayer()) {
      this._won = true;
      this.ended = true;
      for (const e of this.enemies) e.setPaused(true);

      this.ui.setStatus("You got caught!");
      this._updateLevelButtons();
      this.ui.showWin(0);
      if (this.ui.winText)
        this.ui.winText.textContent = "You got caught. Try again.";
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
    const level3Textures =
      this.levelIndex === 2
        ? {
            floor: "./assets/textures/gold_color.jpg",
            wall: "./assets/textures/wall2.jpg",
          }
        : null;

    this.level = new Level(this.grid, 1, level3Textures);

    // recreate player bound to this.level
    this.player = new Player({ level: this.level });
    this.player.setGridPos(pr, pc);
  }

  // see if killer touched player
  _checkEndStates() {
    // don’t do anything if game hasn’t started or already ended
    if (!this.started || this.ended) return;

    // lose: enemy touches player
    if (this._enemyTouchesPlayer()) {
      this.ended = true;
      this._won = true;

      for (const e of this.enemies) e.setPaused(true);

      this.ui.setStatus("You got caught!");
      this.ui.showWin(0);
      if (this.ui.winText)
        this.ui.winText.textContent = "You got caught. Try again.";
      return;
    }
  }

  async resetGame({ keepScore = false } = {}) {
    // stop win state + hide overlays
    this._won = false;
    this.ended = false;
    this.ui.hideWin();
    this.ui.hideLevelComplete?.();
    // restore buttons (trophy room hides replay)
    if (this.ui.btnReplay) this.ui.btnReplay.style.display = "inline-block";
    if (this.ui.btnBackToMenu)
      this.ui.btnBackToMenu.style.display = "inline-block";

    // score: only reset if not keeping it
    if (!keepScore) {
      this.score = 0;
      this.ui.setScore(this.score);
    } else {
      this.ui.setScore(this.score);
    }

    // remove old objects
    if (this.level?.root) this.engine.scene.remove(this.level.root);
    if (this.player?.root) this.engine.scene.remove(this.player.root);
    for (const e of this.enemies) {
      if (e?.root) this.engine.scene.remove(e.root);
    }
    this.enemies = [];

    // rebuild fresh game objects for current template
    this.resetLevelStateFromTemplate();

    this.isFullMode = this.ui.modeToggle?.checked ?? false;
    await this.level.rebuild(this.isFullMode);

    this.engine.add(this.level);
    this.engine.add(this.player);

    // spawn enemies
    const count = this._enemyCount();
    if (count > 0) {
      const rng = this.ui.getEnemyRng?.() ?? false;

      for (let i = 0; i < count; i++) {
        const stepInterval = this._enemyInterval();

        const enemy = new Enemy({
          level: this.level,
          stepInterval,
          color: i === 0 ? 0xcc2222 : 0x991111, // second killer darker red
          getTargetRC: () => ({ r: this.player.r, c: this.player.c }),
        });

        // pick spawn
        let spawn = null;

        if (rng && enemy.pickSpawnRandomAtLeastStepsAway) {
          spawn = enemy.pickSpawnRandomAtLeastStepsAway(
            this.player.r,
            this.player.c,
            5
          );
        } else {
          spawn = enemy.pickSpawnFarFrom(this.player.r, this.player.c);
        }

        // avoid two killers spawning on same tile
        const occupied = new Set(this.enemies.map((e) => `${e.r},${e.c}`));
        let safety = 0;
        // Multiple enemy spawn handlers
        while (occupied.has(`${spawn.r},${spawn.c}`) && safety < 80) {
          if (enemy.pickSpawnRandomAtLeastStepsAway) {
            // keep them reasonably far from player but allow variety
            spawn = enemy.pickSpawnRandomAtLeastStepsAway(
              this.player.r,
              this.player.c,
              4
            );
          } else {
            // fallback
            spawn = enemy.pickSpawnFarFrom(this.player.r, this.player.c);
          }
          safety++;
        }

        enemy.setGridPos(spawn.r, spawn.c);
        this.enemies.push(enemy);
        this.engine.add(enemy);
      }
    }

    this.level.setExitUnlocked(false);
    this._updateLevelButtons();
    this.ui.setStatus(
      `${this.levels[this.levelIndex].name} — ` +
        (this.isFullMode ? "Full mode" : "Prototype mode")
    );
  }

  // ENEMY LOGIC
  _enemyEnabled() {
    return this.difficulty === "medium" || this.difficulty === "hard";
  }

  _enemyInterval() {
    return this.difficulty === "hard" ? 0.25 : 0.45; // hard faster
  }
  // Helper to switch level templates
  async loadLevel(index, { keepScore = true } = {}) {
    this.levelIndex = index;
    this.levelTemplate = this.levels[this.levelIndex].grid;
    await this.resetGame({ keepScore });
  }

  // Going back to main menu should lose your progress
  _setToLevel1() {
    this.levelIndex = 0;
    this.levelTemplate = this.levels[this.levelIndex].grid;
  }

  _enemyCount() {
    if (!this._enemyEnabled()) return 0;

    // Level 4: no enemies
    if (this.levelIndex === 3) return 0;

    // Level 1 => 1, Level 2 => 2, Level 3 => 3
    if (this.levelIndex === 0) return 1;
    if (this.levelIndex === 1) return 2;
    return 3;
  }

  _enemyTouchesPlayer() {
    return this.enemies?.some(
      (e) => e && e.r === this.player.r && e.c === this.player.c
    );
  }

  _getLevelName(i = this.levelIndex) {
    return this.levels?.[i]?.name ?? `Level ${i + 1}`;
  }

  _updateLevelButtons() {
    const cur = this._getLevelName(this.levelIndex);
    const next =
      this.levelIndex + 1 < this.levels.length
        ? this._getLevelName(this.levelIndex + 1)
        : null;

    // Win screen replay button
    if (this.ui?.btnReplay) this.ui.btnReplay.textContent = `Replay ${cur}`;

    // Level-complete screen continue button
    if (this.ui?.btnNextLevel) {
      this.ui.btnNextLevel.textContent = next
        ? `Advance to ${next}`
        : "Back to Menu";
    }
  }
}
