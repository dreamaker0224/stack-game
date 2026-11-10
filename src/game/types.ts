/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type PowerUpType = 'WIDEN' | 'SLOW' | 'SHIELD';

export interface PowerUpItem {
  id: PowerUpType;
  name: string;
  shortDesc: string;
  iconName: string;
  count: number;
}

export interface MacaronTheme {
  name: string;
  body: string;       // main pastel color
  cream: string;      // inner cream layer
  crust: string;      // bottom/top biscuit texture
  accent: string;     // sprinkle or highlight
}

export interface TowerBlock {
  id: number;
  x: number;          // left edge
  y: number;          // top edge
  width: number;
  height: number;
  theme: MacaronTheme;
  squashY: number;    // vertical scale ratio (1.0 default)
  squashX: number;    // horizontal scale ratio (1.0 default)
  squashVelocity: number;
  isPerfect?: boolean;
}

export interface FallingBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  theme: MacaronTheme;
  wobble: number;
}

export interface SlicedDebris {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  theme: MacaronTheme;
  opacity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'star' | 'crumb';
  angle?: number;
  vAngle?: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  alpha: number;
  scale: number;
  life: number;
}
