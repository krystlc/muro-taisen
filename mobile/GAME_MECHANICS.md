# Mobile Core Game Mechanics

This document outlines the core game mechanics of the mobile Tetris-like game, as implemented in the `mobile/core` directory.

## 1. Overview

The game is a falling block puzzle game played on a 6x12 grid. The core objective is to clear blocks by creating groups of same-colored blocks, triggered by special "Orb" blocks. The game features gravity, chain reactions, and piece rotation.

## 2. The Game Grid

- **Dimensions**: The grid is `6` columns wide and `12` rows high (`GRID_WIDTH` x `GRID_HEIGHT`).
- **Implementation**: The `GameGrid` class (`gameGrid.ts`) manages the 2D array of `IBlock` objects that represents the game state.
- **Blocks**: Each cell in the grid can contain a block. Blocks have several properties, defined in `models/block.ts`:
    - `color`: The color of the block (e.g., `RED`, `BLUE`, `GREEN`).
    - `type`: Can be `NORMAL`, `ORB`, or `EMPTY`.
    - `isLocked`: A boolean indicating if the block is part of the static grid.

## 3. Game Pieces

- **Structure**: Falling pieces are composed of two blocks, an "anchor" block (A) and an "attached" block (B). This is defined as an `IFallingPiece` in `models/shape.ts`.
- **Spawning**: A new two-block piece is spawned at the top-center of the grid using the `spawnPiece` method in `GameEngine`.

## 4. Core Game Loop & Gravity

The game progresses in ticks, primarily managed by the `GameEngine` (`gameEngine.ts`).

1.  **Gravity Tick (`gravityTick`)**:
    - The current falling piece moves down one row.
    - **Collision Detection**: The engine checks if the piece's new position would collide with locked blocks on the grid or the floor.
    - **Lockdown**: If a block cannot move down, it becomes "locked" into the grid (`lockBlock`).
    - **Cascading Fall**: If one block of a piece lands while the other can still fall, the second block detaches and continues to fall independently until it also locks (`cascadingFall`).

2.  **Player Actions**:
    - **Rotation (`tryRotate`)**: The player can rotate the attached block (B) clockwise around the anchor block (A). Rotation is prevented if it would cause a collision.
    - **Movement**: The player can move the piece left and right.

## 5. Block Matching and Clearing

Clearing blocks is not based on forming lines, but on color groups connected to an Orb.

1.  **Orbs**: A block can be of type `ORB`. When an orb lands and is locked, it triggers a check.
2.  **Explosion (`checkAndExplodeOrbs`)**:
    - The engine scans the grid for any `ORB` blocks.
    - For each `ORB` found, it uses `findContiguousBlocks` from `physics.ts` to find all adjacent blocks (up, down, left and right) of the *same color* as the orb.
    - All blocks in the contiguous group, including the orb itself, are marked for clearing.
    - The marked blocks are removed from the grid (set to `EMPTY`).

## 6. Chain Reactions & Gravity

After blocks are cleared, the grid must settle.

1.  **Apply Gravity (`applyGravity`)**:
    - After an explosion, this method is called.
    - It scans each column from the bottom up. Any blocks that are "floating" (i.e., have empty space beneath them) are moved down until they rest on another block or the floor.
2.  **Chain Reaction Loop (`executeChainReaction`)**:
    - This is the master loop that orchestrates the reaction sequence.
    - It repeatedly calls `checkAndExplodeOrbs` and `applyGravity` until a full pass occurs where no blocks are exploded and no blocks move.
    - This allows for "chains," where falling blocks form new groups with orbs, triggering subsequent explosions.

## 7. Implementing Touch Control Logic
To implement the horizontal movement and rotation, we'll leverage the PanGestureHandler and TapGestureHandler from React Native Gesture Handler.

1. Horizontal Swipe for Movement
This is the most critical control. You'll need to calculate movement based on how far the finger travels across the grid.

Gesture: PanGestureHandler

Logic: Track the translationX. When translationX crosses a threshold (e.g., half the TILE_SIZE), trigger a tryMove() call and reset the movement tracker to prevent continuous movement from a single, static touch.

2. Tap for Rotation
A dedicated tap handler over the entire game board is highly intuitive.

Gesture: TapGestureHandler (or a PanGestureHandler listening for a very short, non-moving touch).

Logic: On a successful tap event (or a short vertical swipe with very little horizontal movement), call engine.tryRotate().

3. The Game Loop & Continuous Movement
Unlike console games, holding a finger down doesn't inherently repeat the move. For continuous movement, you'll set a timer in the handleMove function that keeps calling tryMove() as long as the player's finger is within the gesture area.
