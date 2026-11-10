/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GAME_CONSTANTS, MACARON_THEMES } from './constants';
import { sound } from './sound';
import {
  FallingBlock,
  FloatingText,
  MacaronTheme,
  Particle,
  PowerUpType,
  SlicedDebris,
  TowerBlock,
} from './types';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number, height: number, combo: number) => void;
  onGameOver: (finalScore: number, finalHeight: number, maxCombo: number) => void;
  onPowerUpEarned?: (type: PowerUpType) => void;
  onPowerUpConsumed?: (type: PowerUpType) => void;
  onAutoPowerUpTriggered?: (type: PowerUpType, layers: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Running state
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // World dimensions
  private width: number = GAME_CONSTANTS.VIRTUAL_WIDTH;
  private height: number = GAME_CONSTANTS.VIRTUAL_HEIGHT;

  // Score & stats
  private score: number = 0;
  private heightCount: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private perfectCount: number = 0;

  // Tower blocks
  private blocks: TowerBlock[] = [];
  private baseHeight: number = 0;

  // Pendulum
  private pendulumAngle: number = 0;
  private pendulumTime: number = 0;
  private currentPendulumWidth: number = GAME_CONSTANTS.INITIAL_BLOCK_WIDTH;
  private currentThemeIdx: number = 0;

  // Falling block (null when hanging on pendulum)
  private fallingBlock: FallingBlock | null = null;

  // Sliced debris & particles
  private debrisList: SlicedDebris[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private textIdCounter: number = 0;

  // Camera
  private cameraY: number = 0;
  private targetCameraY: number = 0;
  private screenShake: number = 0;

  // Power-up active states
  private slowMoTimer: number = 0;
  private shieldActive: boolean = false;

  // Background decoration stars
  private bgStars: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = context;
    this.callbacks = callbacks;

    // Init background stars
    for (let i = 0; i < 35; i++) {
      this.bgStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 2 + Math.random() * 3,
        speed: 0.2 + Math.random() * 0.4,
        opacity: 0.25 + Math.random() * 0.45,
      });
    }

    this.reset();
  }

  public resize(displayWidth: number, displayHeight: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;
    this.ctx.scale(dpr, dpr);

    this.width = displayWidth;
    this.height = displayHeight;
  }

  public reset() {
    this.score = 0;
    this.heightCount = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.fallingBlock = null;
    this.debrisList = [];
    this.particles = [];
    this.floatingTexts = [];
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.screenShake = 0;
    this.slowMoTimer = 0;
    this.shieldActive = false;

    this.currentThemeIdx = 0;
    this.currentPendulumWidth = GAME_CONSTANTS.INITIAL_BLOCK_WIDTH;
    this.pendulumTime = 0;

    // Ground platform base
    this.baseHeight = this.height - 120;
    const baseWidth = GAME_CONSTANTS.INITIAL_BLOCK_WIDTH;
    const baseX = (this.width - baseWidth) / 2;

    this.blocks = [
      {
        id: 0,
        x: baseX,
        y: this.baseHeight,
        width: baseWidth,
        height: GAME_CONSTANTS.BLOCK_HEIGHT + 10,
        theme: MACARON_THEMES[0],
        squashY: 1,
        squashX: 1,
        squashVelocity: 0,
      },
    ];

    this.targetCameraY = 0;
    this.callbacks.onScoreUpdate(this.score, this.heightCount, this.combo);
  }

  public start() {
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop();
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.loop();
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public isGamePaused(): boolean {
    return this.isPaused;
  }

  // Activate power-up
  public activatePowerUp(type: PowerUpType) {
    if (this.isPaused || !this.isRunning) return;

    if (type === 'WIDEN') {
      // Widen the top block and current pendulum
      const top = this.getTopBlock();
      const addW = Math.round(top.width * GAME_CONSTANTS.WIDEN_PERCENTAGE);
      const newW = Math.min(GAME_CONSTANTS.INITIAL_BLOCK_WIDTH, top.width + addW);
      const diff = newW - top.width;

      top.width = newW;
      top.x = Math.max(10, top.x - diff / 2);
      this.currentPendulumWidth = newW;

      top.squashY = 0.75;
      top.squashVelocity = -2.5;

      this.addFloatingText('✨ 蛋糕加寬!', top.x + newW / 2, top.y - 30, '#10B981', 18);
      this.burstConfetti(top.x + newW / 2, top.y, '#10B981', 25);
      sound.playPowerUpUse();
      this.callbacks.onPowerUpConsumed?.('WIDEN');
    } else if (type === 'SLOW') {
      this.slowMoTimer = GAME_CONSTANTS.SLOW_MOTION_DURATION_SEC;
      const hook = this.getPendulumHookPos();
      this.addFloatingText('⏳ 慢動作開啟!', hook.x, hook.y + 40, '#F59E0B', 18);
      this.burstConfetti(hook.x, hook.y, '#F59E0B', 20);
      sound.playPowerUpUse();
      this.callbacks.onPowerUpConsumed?.('SLOW');
    } else if (type === 'SHIELD') {
      this.shieldActive = true;
      const top = this.getTopBlock();
      this.addFloatingText('🛡️ 甜心護盾生效!', top.x + top.width / 2, top.y - 35, '#EC4899', 18);
      this.burstConfetti(top.x + top.width / 2, top.y, '#EC4899', 25);
      sound.playPowerUpUse();
      this.callbacks.onPowerUpConsumed?.('SHIELD');
    }
  }

  public hasShield(): boolean {
    return this.shieldActive;
  }

  public getSlowTimer(): number {
    return Math.max(0, this.slowMoTimer);
  }

  // Player action: Tap or Space to drop
  public dropBlock() {
    if (this.isPaused || !this.isRunning) return;
    if (this.fallingBlock !== null) return; // Already falling

    const hook = this.getPendulumHookPos();
    const theme = MACARON_THEMES[(this.currentThemeIdx + 1) % MACARON_THEMES.length];

    this.fallingBlock = {
      x: hook.x - this.currentPendulumWidth / 2,
      y: hook.y + 8,
      width: this.currentPendulumWidth,
      height: GAME_CONSTANTS.BLOCK_HEIGHT,
      vy: 120,
      theme,
      wobble: 0,
    };

    sound.playDrop();
  }

  private getTopBlock(): TowerBlock {
    return this.blocks[this.blocks.length - 1];
  }

  private getPendulumHookPos() {
    const originX = this.width / 2;
    const originY = GAME_CONSTANTS.PENDULUM_ORIGIN_Y;
    const hookX = originX + Math.sin(this.pendulumAngle) * GAME_CONSTANTS.PENDULUM_ARM_LENGTH;
    const hookY = originY + Math.cos(this.pendulumAngle) * GAME_CONSTANTS.PENDULUM_ARM_LENGTH;
    return { x: hookX, y: hookY };
  }

  private loop = () => {
    if (!this.isRunning || this.isPaused) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05); // Clamp dt for smooth 60fps
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // 1. Slow motion countdown
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) {
        this.slowMoTimer = 0;
      }
    }

    // 2. Pendulum harmonic swing
    const currentSwingSpeed = this.slowMoTimer > 0
      ? GAME_CONSTANTS.BASE_SWING_SPEED * GAME_CONSTANTS.SLOW_MOTION_FACTOR
      : GAME_CONSTANTS.BASE_SWING_SPEED;

    this.pendulumTime += dt * currentSwingSpeed;
    this.pendulumAngle = GAME_CONSTANTS.MAX_SWING_ANGLE * Math.sin(this.pendulumTime);

    // 3. Falling block physics
    if (this.fallingBlock) {
      this.fallingBlock.vy += GAME_CONSTANTS.DROP_ACCELERATION * dt;
      this.fallingBlock.y += this.fallingBlock.vy * dt;

      const top = this.getTopBlock();
      const targetY = top.y - GAME_CONSTANTS.BLOCK_HEIGHT;

      // Check landing collision
      if (this.fallingBlock.y >= targetY) {
        this.handleBlockLanding(top);
      }
    }

    // 4. Update blocks squash & stretch animation
    for (const b of this.blocks) {
      if (b.squashVelocity !== 0 || b.squashY !== 1) {
        const spring = (1 - b.squashY) * 260;
        b.squashVelocity += spring * dt;
        b.squashVelocity *= Math.exp(-14 * dt); // Damping
        b.squashY += b.squashVelocity * dt;
        b.squashX = 1 + (1 - b.squashY) * 0.5;

        if (Math.abs(b.squashY - 1) < 0.01 && Math.abs(b.squashVelocity) < 0.05) {
          b.squashY = 1;
          b.squashX = 1;
          b.squashVelocity = 0;
        }
      }
    }

    // 5. Update sliced debris
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.vy += GAME_CONSTANTS.DEBRIS_GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.angle += d.vAngle * dt;

      // Fade out as it plunges down
      if (d.y - this.cameraY > this.height + 200) {
        this.debrisList.splice(i, 1);
      }
    }

    // 6. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt; // gravity
      p.alpha = 1 - p.life / p.maxLife;
      if (p.angle !== undefined && p.vAngle !== undefined) {
        p.angle += p.vAngle * dt;
      }
    }

    // 7. Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life += dt;
      t.y -= 45 * dt;
      t.scale = Math.min(1.2, 0.8 + t.life * 1.5);
      if (t.life > 0.6) {
        t.alpha = Math.max(0, 1 - (t.life - 0.6) / 0.5);
      }
      if (t.life >= 1.1) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 8. Camera tracking top block
    const top = this.getTopBlock();
    // Ideal camera position so top block sits around target view offset
    const desiredCameraY = Math.max(0, this.baseHeight - top.y - 200);
    this.targetCameraY = desiredCameraY;
    this.cameraY += (this.targetCameraY - this.cameraY) * GAME_CONSTANTS.CAMERA_SMOOTH_FACTOR;

    // 9. Camera screen shake decay
    if (this.screenShake > 0) {
      this.screenShake -= dt * 25;
      if (this.screenShake < 0) this.screenShake = 0;
    }
  }

  private handleBlockLanding(top: TowerBlock) {
    if (!this.fallingBlock) return;

    const dropLeft = this.fallingBlock.x;
    const dropRight = this.fallingBlock.x + this.fallingBlock.width;
    const targetLeft = top.x;
    const targetRight = top.x + top.width;

    const overlapLeft = Math.max(dropLeft, targetLeft);
    const overlapRight = Math.min(dropRight, targetRight);
    const overlapWidth = overlapRight - overlapLeft;

    // A. COMPLETELY MISSED
    if (overlapWidth <= 0) {
      if (this.shieldActive) {
        // Shield saves the block!
        this.shieldActive = false;
        sound.playShieldUse();
        this.screenShake = 8;

        // Auto-center on top block with current width
        const safeWidth = Math.max(GAME_CONSTANTS.MIN_BLOCK_WIDTH, Math.min(top.width, this.fallingBlock.width));
        const safeX = top.x + (top.width - safeWidth) / 2;

        this.addNewTowerBlock(safeX, top.y - GAME_CONSTANTS.BLOCK_HEIGHT, safeWidth, this.fallingBlock.theme, false);

        this.addFloatingText('🛡️ 護盾救援成功!', safeX + safeWidth / 2, top.y - 45, '#EC4899', 18);
        this.burstConfetti(safeX + safeWidth / 2, top.y - 20, '#EC4899', 30);
        this.fallingBlock = null;
        return;
      }

      // No shield -> Game Over
      sound.playMiss();
      this.screenShake = 12;

      // Let falling block continue to fall off screen as debris
      this.debrisList.push({
        x: this.fallingBlock.x,
        y: this.fallingBlock.y,
        width: this.fallingBlock.width,
        height: this.fallingBlock.height,
        vx: (Math.random() - 0.5) * 60,
        vy: this.fallingBlock.vy * 0.5,
        angle: 0,
        vAngle: (Math.random() - 0.5) * 4,
        theme: this.fallingBlock.theme,
        opacity: 1,
      });

      this.fallingBlock = null;
      this.isRunning = false;

      sound.playGameOver();
      setTimeout(() => {
        this.callbacks.onGameOver(this.score, this.heightCount, this.maxCombo);
      }, 500);
      return;
    }

    // B. OVERLAPPED - CHECK PERFECT VS SLICE
    const diff = Math.abs(dropLeft - targetLeft);
    const isPerfect = diff <= GAME_CONSTANTS.PERFECT_TOLERANCE_PX;

    if (isPerfect) {
      // 1. PERFECT ALIGNMENT!
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      this.perfectCount++;

      // Snapped to full top block dimensions
      const finalX = targetLeft;
      const finalWidth = top.width;

      this.addNewTowerBlock(finalX, top.y - GAME_CONSTANTS.BLOCK_HEIGHT, finalWidth, this.fallingBlock.theme, true);

      // Score bonus based on combo
      const addedScore = 100 + this.combo * 50;
      this.score += addedScore;

      sound.playPerfect(this.combo);
      this.screenShake = 3;

      // Visual fanfare
      const comboText = this.combo > 1 ? `PERFECT x${this.combo}! +${addedScore}` : `PERFECT! +${addedScore}`;
      this.addFloatingText(comboText, finalX + finalWidth / 2, top.y - 40, '#F59E0B', 20);
      this.burstConfetti(finalX + finalWidth / 2, top.y - 15, '#F59E0B', 30);
    } else {
      // 2. SLICED EXCESS (Partial overlap)
      this.combo = 0;
      this.score += 50;

      const finalWidth = Math.max(GAME_CONSTANTS.MIN_BLOCK_WIDTH, overlapWidth);
      const finalX = overlapLeft;

      // Spawn sliced chunk falling down
      if (dropLeft < targetLeft) {
        // Left side sliced off
        const sliceWidth = targetLeft - dropLeft;
        this.debrisList.push({
          x: dropLeft,
          y: top.y - GAME_CONSTANTS.BLOCK_HEIGHT,
          width: sliceWidth,
          height: GAME_CONSTANTS.BLOCK_HEIGHT,
          vx: -(60 + Math.random() * 50),
          vy: -60,
          angle: 0,
          vAngle: -3.5,
          theme: this.fallingBlock.theme,
          opacity: 1,
        });
      } else if (dropRight > targetRight) {
        // Right side sliced off
        const sliceWidth = dropRight - targetRight;
        this.debrisList.push({
          x: targetRight,
          y: top.y - GAME_CONSTANTS.BLOCK_HEIGHT,
          width: sliceWidth,
          height: GAME_CONSTANTS.BLOCK_HEIGHT,
          vx: 60 + Math.random() * 50,
          vy: -60,
          angle: 0,
          vAngle: 3.5,
          theme: this.fallingBlock.theme,
          opacity: 1,
        });
      }

      this.addNewTowerBlock(finalX, top.y - GAME_CONSTANTS.BLOCK_HEIGHT, finalWidth, this.fallingBlock.theme, false);

      sound.playSlice();
      this.screenShake = 5;

      this.addFloatingText('+50', finalX + finalWidth / 2, top.y - 30, '#94A3B8', 16);
      this.burstCrumbs(finalX, top.y - GAME_CONSTANTS.BLOCK_HEIGHT, this.fallingBlock.theme.body, 14);
    }

    // Prepare next pendulum block width & theme
    this.currentPendulumWidth = this.getTopBlock().width;
    this.currentThemeIdx = (this.currentThemeIdx + 1) % MACARON_THEMES.length;

    this.fallingBlock = null;
    this.callbacks.onScoreUpdate(this.score, this.heightCount, this.combo);
  }

  private addNewTowerBlock(x: number, y: number, width: number, theme: MacaronTheme, isPerfect: boolean) {
    this.heightCount++;

    const newBlock: TowerBlock = {
      id: this.heightCount,
      x,
      y,
      width,
      height: GAME_CONSTANTS.BLOCK_HEIGHT,
      theme,
      squashY: isPerfect ? 0.72 : 0.82,
      squashX: isPerfect ? 1.25 : 1.15,
      squashVelocity: -2.8,
      isPerfect,
    };

    this.blocks.push(newBlock);

    // Give below block a little shockwave squash too
    if (this.blocks.length >= 2) {
      const prev = this.blocks[this.blocks.length - 2];
      prev.squashY = 0.9;
      prev.squashVelocity = -1.2;
    }

    // Check 5 layers milestone: automatically grant and activate a power-up!
    if (this.heightCount > 0 && this.heightCount % 5 === 0) {
      this.triggerFiveLayersAutoReward(this.heightCount);
    }
  }

  private triggerFiveLayersAutoReward(layers: number) {
    const cycle = Math.floor(layers / 5);
    let chosen: PowerUpType = 'WIDEN';
    if (cycle % 3 === 1) {
      chosen = 'WIDEN';
    } else if (cycle % 3 === 2) {
      chosen = 'SHIELD';
    } else {
      chosen = 'SLOW';
    }

    // If shield already active and chosen is SHIELD, grant WIDEN instead
    if (chosen === 'SHIELD' && this.shieldActive) {
      chosen = 'WIDEN';
    }

    const top = this.getTopBlock();

    // Immediately execute the power up effect
    if (chosen === 'WIDEN') {
      const addW = Math.round(top.width * GAME_CONSTANTS.WIDEN_PERCENTAGE);
      const newW = Math.min(GAME_CONSTANTS.INITIAL_BLOCK_WIDTH, top.width + addW);
      const diff = newW - top.width;

      top.width = newW;
      top.x = Math.max(10, top.x - diff / 2);
      this.currentPendulumWidth = newW;

      top.squashY = 0.72;
      top.squashVelocity = -2.6;

      this.addFloatingText(`🎉 達成 ${layers} 層！【方塊加寬】`, top.x + newW / 2, top.y - 45, '#10B981', 19);
      this.burstConfetti(top.x + newW / 2, top.y, '#10B981', 35);
    } else if (chosen === 'SLOW') {
      this.slowMoTimer = GAME_CONSTANTS.SLOW_MOTION_DURATION_SEC;
      const hook = this.getPendulumHookPos();
      this.addFloatingText(`🎉 達成 ${layers} 層！【慢動作時間】`, hook.x, hook.y + 45, '#F59E0B', 19);
      this.burstConfetti(hook.x, hook.y, '#F59E0B', 30);
    } else if (chosen === 'SHIELD') {
      this.shieldActive = true;
      this.addFloatingText(`🎉 達成 ${layers} 層！【甜心護盾】`, top.x + top.width / 2, top.y - 45, '#EC4899', 19);
      this.burstConfetti(top.x + top.width / 2, top.y - 25, '#EC4899', 35);
    }

    sound.playPowerUpGain();
    this.screenShake = 4;

    if (this.callbacks.onAutoPowerUpTriggered) {
      this.callbacks.onAutoPowerUpTriggered(chosen, layers);
    }
  }

  private burstConfetti(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.4 ? color : '#FFF',
        alpha: 1,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        shape: Math.random() > 0.5 ? 'star' : 'circle',
        angle: Math.random() * Math.PI,
        vAngle: (Math.random() - 0.5) * 8,
      });
    }
  }

  private burstCrumbs(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 40 + Math.random() * 100;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: Math.cos(angle) * speed,
        vy: -Math.abs(Math.sin(angle) * speed) - 40,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        shape: 'crumb',
      });
    }
  }

  private addFloatingText(text: string, x: number, y: number, color: string, fontSize: number) {
    this.floatingTexts.push({
      id: ++this.textIdCounter,
      text,
      x,
      y,
      color,
      fontSize,
      alpha: 1,
      scale: 0.8,
      life: 0,
    });
  }

  // ===================== RENDERING =====================
  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();

    // Screen shake
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // Draw background
    this.drawBackground(ctx);

    // Apply Camera translation
    ctx.save();
    ctx.translate(0, this.cameraY);

    // 1. Draw bakery pedestal plate
    this.drawPedestal(ctx);

    // 2. Draw tower blocks
    for (const block of this.blocks) {
      this.drawMacaronBlock(ctx, block.x, block.y, block.width, block.height, block.theme, block.squashX, block.squashY);
    }

    // 3. Draw sliced debris
    for (const d of this.debrisList) {
      this.drawDebris(ctx, d);
    }

    // 4. Draw sweet shield visual around top block
    if (this.shieldActive) {
      this.drawShieldBubble(ctx);
    }

    // 5. Draw particles
    this.drawParticles(ctx);

    // 6. Draw floating text
    this.drawFloatingTexts(ctx);

    // 7. Draw falling block (in camera coordinates)
    if (this.fallingBlock) {
      this.drawMacaronBlock(
        ctx,
        this.fallingBlock.x,
        this.fallingBlock.y,
        this.fallingBlock.width,
        this.fallingBlock.height,
        this.fallingBlock.theme,
        1,
        1
      );
    }

    ctx.restore(); // restore camera

    // Pendulum (drawn in screen space at the top)
    this.drawPendulum(ctx);

    // Slow-mo golden trail visual overlay
    if (this.slowMoTimer > 0) {
      this.drawSlowMoIndicator(ctx);
    }

    ctx.restore(); // restore screen shake
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    // Gentle pastel gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#FFFDF9');
    bgGrad.addColorStop(0.5, '#FFF6ED');
    bgGrad.addColorStop(1, '#FFEFE4');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Floating sugar sparkles in background
    for (const s of this.bgStars) {
      s.y -= s.speed;
      if (s.y < 0) s.y = this.height;

      ctx.fillStyle = `rgba(255, 182, 193, ${s.opacity})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPedestal(ctx: CanvasRenderingContext2D) {
    const tableY = this.baseHeight + GAME_CONSTANTS.BLOCK_HEIGHT + 10;
    const tableWidth = this.width * 0.88;
    const tableX = (this.width - tableWidth) / 2;

    // Pedestal cake plate
    ctx.save();
    ctx.fillStyle = '#F8E9DE';
    ctx.shadowColor = 'rgba(180, 140, 130, 0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;

    this.roundRect(ctx, tableX, tableY, tableWidth, 24, 12);
    ctx.fill();
    ctx.restore();

    // Cute scalloped decorative dots below plate
    ctx.fillStyle = '#EBD5C6';
    const dotCount = 14;
    for (let i = 0; i <= dotCount; i++) {
      const dx = tableX + (tableWidth / dotCount) * i;
      ctx.beginPath();
      ctx.arc(dx, tableY + 24, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMacaronBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    theme: MacaronTheme,
    squashX: number = 1,
    squashY: number = 1
  ) {
    ctx.save();

    // Apply squash and stretch anchored at the bottom center of the block
    const cx = x + width / 2;
    const bottomY = y + height;
    ctx.translate(cx, bottomY);
    ctx.scale(squashX, squashY);
    ctx.translate(-cx, -bottomY);

    const radius = Math.min(10, width / 4);

    // 1. Soft ambient drop shadow under the block
    ctx.save();
    ctx.fillStyle = 'rgba(140, 100, 90, 0.12)';
    this.roundRect(ctx, x, y + 4, width, height, radius);
    ctx.fill();
    ctx.restore();

    // 2. Base cookie shell gradient
    const grad = ctx.createLinearGradient(x, y, x, y + height);
    grad.addColorStop(0, theme.body);
    grad.addColorStop(0.35, theme.crust);
    grad.addColorStop(0.65, theme.crust);
    grad.addColorStop(1, theme.body);

    ctx.fillStyle = grad;
    this.roundRect(ctx, x, y, width, height, radius);
    ctx.fill();

    // 3. Middle creamy filling
    const creamHeight = Math.max(6, height * 0.28);
    const creamY = y + (height - creamHeight) / 2;

    ctx.fillStyle = theme.cream;
    this.roundRect(ctx, x + 2, creamY, width - 4, creamHeight, 4);
    ctx.fill();

    // 4. Macaron top glossy highlight shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    this.roundRect(ctx, x + 6, y + 3, Math.max(8, width - 12), 4, 2);
    ctx.fill();

    // 5. Delicate pied (crust texture) bumps
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.5;
    const dotSpacing = 16;
    const dots = Math.floor((width - 12) / dotSpacing);
    for (let i = 0; i <= dots; i++) {
      const dotX = x + 6 + i * dotSpacing;
      ctx.beginPath();
      ctx.arc(dotX, creamY - 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX + 4, creamY + creamHeight + 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  private drawDebris(ctx: CanvasRenderingContext2D, d: SlicedDebris) {
    ctx.save();
    ctx.globalAlpha = d.opacity;
    ctx.translate(d.x + d.width / 2, d.y + d.height / 2);
    ctx.rotate(d.angle);

    const halfW = d.width / 2;
    const halfH = d.height / 2;
    const radius = Math.min(6, d.width / 3);

    // Debris body
    ctx.fillStyle = d.theme.crust;
    this.roundRect(ctx, -halfW, -halfH, d.width, d.height, radius);
    ctx.fill();

    // Cream slice
    ctx.fillStyle = d.theme.cream;
    this.roundRect(ctx, -halfW, -2, d.width, 5, 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPendulum(ctx: CanvasRenderingContext2D) {
    const originX = this.width / 2;
    const originY = GAME_CONSTANTS.PENDULUM_ORIGIN_Y;
    const hook = this.getPendulumHookPos();

    // 1. Top pivot brass fixture
    ctx.save();
    ctx.fillStyle = '#E2B878';
    ctx.beginPath();
    ctx.arc(originX, originY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF8EE';
    ctx.beginPath();
    ctx.arc(originX, originY, 4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Pendulum ribbon string
    ctx.strokeStyle = '#D9A464';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(hook.x, hook.y);
    ctx.stroke();

    // 3. Hanging golden hook / clasp
    ctx.fillStyle = '#C89355';
    ctx.beginPath();
    ctx.arc(hook.x, hook.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // 4. Currently attached macaron block on hook (if not currently falling)
    if (!this.fallingBlock) {
      const nextTheme = MACARON_THEMES[(this.currentThemeIdx + 1) % MACARON_THEMES.length];
      const blockX = hook.x - this.currentPendulumWidth / 2;
      const blockY = hook.y + 8;

      this.drawMacaronBlock(
        ctx,
        blockX,
        blockY,
        this.currentPendulumWidth,
        GAME_CONSTANTS.BLOCK_HEIGHT,
        nextTheme,
        1,
        1
      );

      // Subtle release hint dotted guide line directly downward
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hook.x, blockY + GAME_CONSTANTS.BLOCK_HEIGHT + 4);
      ctx.lineTo(hook.x, this.height - 80);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  private drawShieldBubble(ctx: CanvasRenderingContext2D) {
    const top = this.getTopBlock();
    const cx = top.x + top.width / 2;
    const cy = top.y;
    const r = Math.max(top.width * 0.65, 45);

    ctx.save();
    const pulse = Math.sin(performance.now() * 0.006) * 4;

    const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r + pulse);
    grad.addColorStop(0, 'rgba(236, 72, 153, 0.05)');
    grad.addColorStop(0.7, 'rgba(236, 72, 153, 0.2)');
    grad.addColorStop(1, 'rgba(244, 114, 182, 0.6)');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#F472B6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Floating shield icon
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️', cx, cy - r - 8);

    ctx.restore();
  }

  private drawSlowMoIndicator(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Warm golden vignette border
    const grad = ctx.createLinearGradient(0, 0, 0, 60);
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, 60);
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'star') {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.angle !== undefined) ctx.rotate(p.angle);
        this.drawStar(ctx, 0, 0, 5, p.size * 1.5, p.size * 0.7);
        ctx.restore();
      } else if (p.shape === 'crumb') {
        this.roundRect(ctx, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, 1);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerR: number,
    innerR: number
  ) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerR;
      y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = t.alpha;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      ctx.font = `800 ${t.fontSize}px 'Fredoka', 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text stroke outline for high readability
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeText(t.text, 0, 0);

      // Text fill
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);

      ctx.restore();
    }
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
