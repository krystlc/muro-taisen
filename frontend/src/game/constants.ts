// frontend/src/game/constants.ts
export const GRID_WIDTH  = 6;
export const GRID_HEIGHT = 12;
export const FALL_SPEED  = 500;

// Dynamically compute CELL_SIZE to fill the viewport, but cap at 64px:
export const CELL_SIZE = Math.min(
  Math.floor(Math.min(
    window.innerWidth  / GRID_WIDTH,
    window.innerHeight / GRID_HEIGHT
  )),
  64
);
