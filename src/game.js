// src/game.js
import { Level } from "./level.js";
import { Player } from "./player.js";

export class Game {
  constructor({ engine, ui }) {
    this.engine = engine;
    this.ui = ui;

    // 1) Define the grid FIRST
    this.grid = [
      "#####################",
      "#P.................E#",
      "#.#####.#######.#####",
      "#.....#.....#.......#",
      "###.#.#####.#.#####.#",
      "#...#.......#.....#.#",
      "#.#########.#####.#.#",
      "#.................#.#",
      "#####################",
    ].map((row) => row.split(""));

    // 2) Find spawn (P), then turn it into normal floor
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

    // 3) Create level
    this.level = new Level(this.grid, 1);

    // 4) Create player and place it, initialize their score to 0
    this.player = new Player({ level: this.level });
    this.player.setGridPos(pr, pc);
    this.score = 0;
    this.ui.setScore(0);

    // 5) add movement for the player - event listener
    this._onKeyDown = (e) => {
      // prevent arrow keys from scrolling the page
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();

      let moved = false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W")
        this.movePlayer(-1, 0);
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
        this.movePlayer(1, 0);
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
        this.movePlayer(0, -1);
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
        this.movePlayer(0, 1);

      if (moved)
        if (this.level.collectCoinAt(this.player.r, this.player.c)) {
          this.score += 10;
          this.ui.setScore(this.score);
          this.ui.setStatus(
            `Coin collected! Coins left: ${this.level.coinCount}`
          );
        } else {
          this.ui.setStatus(`Player: (${this.player.r}, ${this.player.c})`);
        }
    };
    // 7) Replay level feature
    if (this.ui.btnReplay) {
      this.ui.btnReplay.addEventListener("click", () =>
        window.location.reload()
      );
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

    this.score = 0;
    this.ui.setScore(0);
  }

  movePlayer(dr, dc) {
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

  startPrototype() {
    // camera: top-down-ish
    this.engine.camera.position.set(0, 20, 8);
    this.engine.camera.lookAt(0, 0, 0);

    this.level.buildPrototype();
    this.engine.add(this.level);

    this.engine.add(this.player);
    this.level.setExitUnlocked(false);
    this.ui.setStatus("Prototype ready (player spawned).");
  }
}
