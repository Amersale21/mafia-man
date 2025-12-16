// src/game.js
import * as THREE from "three";
import { Level } from "./level.js";

export class Game {
  constructor({ engine, ui }) {
    this.engine = engine;
    this.ui = ui;

    // Simple level to start (you can change later)
    this.grid = [
      "#####################",
      "#P....#.......#....E#",
      "#.##..#..###..#..##.#",
      "#......#...#.......##",
      "###.####.#.####.###.#",
      "#.......#.#.........#",
      "#.#####.#.#.#####.#.#",
      "#.....#...#.....#...#",
      "#####################",
    ].map((row) => row.split(""));

    this.level = new Level(this.grid, 1);
  }

  startPrototype() {
    // camera: top-down-ish
    this.engine.camera.position.set(0, 18, 12);
    this.engine.camera.lookAt(0, 0, 0);

    this.level.buildPrototype();
    this.engine.add(this.level);

    this.ui.setStatus("Prototype ready (maze built).");
  }
}
