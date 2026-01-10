# mafia-man

A Pac-Man–Style Web Game with Grid-Based AI and Dual Rendering Modes

MafiaMan is a browser-based Pac-Man–inspired game where players navigate different maps collecting money while evading intelligent enemies. The project focuses on game architecture, AI pathfinding, and performance-aware design, rather than just visuals.

Features

Grid-based BFS enemy AI
Enemies dynamically pathfind toward the player using breadth-first search, increasing difficulty and strategic gameplay.

Multiple difficulty modes
Easy - No AIs will spawn on the map.
Medium - AIs will now spawn on each level at a slower speed.
Hard - AIs will spawn the same as medium, but move much more quickly towards the player.

Dual game modes

Prototype mode: lightweight, primitive geometry for low-resource environments

Full mode: imported models, textures, and enhanced visuals

Cross-platform controls

Keyboard controls for desktop

Touch controls optimized for mobile devices

Modular level system
Levels are defined independently and loaded dynamically, making it easy to extend the game with new maps or mechanics.
