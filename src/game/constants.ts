/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MacaronTheme } from './types';

// Warm Pastel Macaron color themes
export const MACARON_THEMES: MacaronTheme[] = [
  {
    name: '草莓甜心',
    body: '#FF9AA2',
    cream: '#FFF0F3',
    crust: '#FF808C',
    accent: '#FF4D6D',
  },
  {
    name: '蜜桃奶霜',
    body: '#FFB7B2',
    cream: '#FFF7ED',
    crust: '#FFA099',
    accent: '#FB923C',
  },
  {
    name: '香草芒果',
    body: '#FFEAA7',
    cream: '#FFFFFA',
    crust: '#FDCB6E',
    accent: '#F59E0B',
  },
  {
    name: '抹茶雪絨',
    body: '#B5EAD7',
    cream: '#F2FAF7',
    crust: '#95D5C0',
    accent: '#10B981',
  },
  {
    name: '海鹽薄荷',
    body: '#A8E6CF',
    cream: '#F0FDF8',
    crust: '#8CD4BA',
    accent: '#059669',
  },
  {
    name: '藍莓輕乳',
    body: '#C7CEEA',
    cream: '#F8F9FE',
    crust: '#AEB8DE',
    accent: '#6366F1',
  },
  {
    name: '香芋布蕾',
    body: '#E2B6CF',
    cream: '#FDF7FB',
    crust: '#D09EBC',
    accent: '#A855F7',
  },
  {
    name: '杏仁太妃',
    body: '#FFDAC1',
    cream: '#FFF8F2',
    crust: '#F7C4A5',
    accent: '#EA580C',
  },
];

export const GAME_CONSTANTS = {
  // Arena reference dimensions (internal logical coordinates)
  VIRTUAL_WIDTH: 420,
  VIRTUAL_HEIGHT: 750,

  // Blocks
  INITIAL_BLOCK_WIDTH: 220,
  BLOCK_HEIGHT: 38,
  MIN_BLOCK_WIDTH: 24,
  PERFECT_TOLERANCE_PX: 4.5, // Deviation threshold to trigger PERFECT alignment

  // Pendulum
  PENDULUM_ORIGIN_Y: 70,
  PENDULUM_ARM_LENGTH: 140,
  BASE_SWING_SPEED: 2.4, // rad/s
  MAX_SWING_ANGLE: 0.68, // ~39 degrees

  // Physics
  DROP_ACCELERATION: 1600, // px/s^2
  DEBRIS_GRAVITY: 1200,    // px/s^2

  // Camera
  CAMERA_VIEW_OFFSET_Y: 460, // Where the top block stays relative to canvas top
  CAMERA_SMOOTH_FACTOR: 0.12,

  // Power-up durations / effects
  SLOW_MOTION_FACTOR: 0.45,
  SLOW_MOTION_DURATION_SEC: 7.0,
  WIDEN_PERCENTAGE: 0.30,
};
