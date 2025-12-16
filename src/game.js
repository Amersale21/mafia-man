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

    // 4) Create player and place it
    this.player = new Player({ level: this.level });
    this.player.setGridPos(pr, pc);
    // 5) add movement for the player - event listener
    this._onKeyDown = (e) => {
      // prevent arrow keys from scrolling the page
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();

      let moved = false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W")
        moved = this.player.tryMove(-1, 0);
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
        moved = this.player.tryMove(1, 0);
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
        moved = this.player.tryMove(0, -1);
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
        moved = this.player.tryMove(0, 1);

      if (moved)
        this.ui.setStatus(`Player: (${this.player.r}, ${this.player.c})`);
    };

    window.addEventListener("keydown", this._onKeyDown, { passive: false });
  }

  startPrototype() {
    // camera: top-down-ish
    this.engine.camera.position.set(0, 18, 12);
    this.engine.camera.lookAt(0, 0, 0);

    this.level.buildPrototype();
    this.engine.add(this.level);

    this.engine.add(this.player);

    this.ui.setStatus("Prototype ready (player spawned).");
  }
}
