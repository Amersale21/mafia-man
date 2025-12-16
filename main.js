// main.js
import { Engine } from "./src/engine.js";
import { UI } from "./src/ui.js";
import { Game } from "./src/game.js";

const container = document.getElementById("container");
const ui = new UI();
const engine = new Engine(container);
const game = new Game({ engine, ui });

// For now: just build prototype maze
game.startPrototype();

engine.start();
