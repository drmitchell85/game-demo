import Phaser from 'phaser';

export const GAME_WIDTH  = 960;
export const GAME_HEIGHT = 540;

// Grid dimensions — 24×16 exceeds the 960×540 viewport, requiring camera pan/zoom.
export const GRID_COLS = 24;
export const GRID_ROWS = 16;
export const HEX_SIZE  = 36;

// Camera pan speed in world pixels per frame (at 60fps ≈ 360px/s).
export const PAN_SPEED = 6;

// Scroll-wheel zoom constants.
export const ZOOM_STEP = 0.1;  // zoom change per wheel click
export const MIN_ZOOM  = 0.5;  // farthest out — whole grid visible
export const MAX_ZOOM  = 2.0;  // closest in — pixel-art detail

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,

  // Pixel art rendering — must be set before the game instance is created
  pixelArt: true,       // Sets NEAREST texture filter on all textures (no blurring)
  antialias: false,     // Disables WebGL antialiasing
  roundPixels: true,    // Snaps game objects to integer pixel positions (prevents shimmer)

  backgroundColor: '#1a1a2e',

  scale: {
    mode: Phaser.Scale.FIT,             // Scale to fill container, maintain aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
};
