/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { sound } from './game/sound';
import { GameState, PowerUpType } from './game/types';
import { useOrientationDrop } from './game/useOrientationDrop';
import { HUD } from './components/HUD';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { TitleScreen } from './components/TitleScreen';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const bannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Game UI state
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());

  // Active status
  const [activeShield, setActiveShield] = useState<boolean>(false);
  const [slowTimer, setSlowTimer] = useState<number>(0);
  const [milestoneBanner, setMilestoneBanner] = useState<string | null>(null);

  // Mobile tilt/orientation detection: "手機垂直變水平，往前翻的時候就墮落"
  const orientation = useOrientationDrop({
    enabled: gameState === 'PLAYING',
    onDrop: () => {
      if (gameState === 'PLAYING' && engineRef.current) {
        engineRef.current.dropBlock();
      }
    },
  });

  // Load high score from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('macaron_best_score');
      if (saved) {
        setBestScore(parseInt(saved, 10) || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  // Update high score helper
  const checkAndUpdateHighScore = useCallback((currentScore: number) => {
    setBestScore((prev) => {
      if (currentScore > prev) {
        setIsNewHigh(true);
        try {
          localStorage.setItem('macaron_best_score', String(currentScore));
        } catch {
          // ignore
        }
        return currentScore;
      }
      return prev;
    });
  }, []);

  // Initialize Game Engine
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const handleScoreUpdate = (newScore: number, newHeight: number, newCombo: number) => {
      setScore(newScore);
      setHeight(newHeight);
      setCombo(newCombo);
      checkAndUpdateHighScore(newScore);

      if (engineRef.current) {
        setActiveShield(engineRef.current.hasShield());
        setSlowTimer(engineRef.current.getSlowTimer());
      }
    };

    const handleGameOver = (finalScore: number, finalHeight: number, finalMaxCombo: number) => {
      sound.pauseBGM();
      setScore(finalScore);
      setHeight(finalHeight);
      setMaxCombo(finalMaxCombo);
      checkAndUpdateHighScore(finalScore);
      setGameState('GAMEOVER');
    };

    const handleAutoPowerUpTriggered = (type: PowerUpType, layers: number) => {
      const name = type === 'WIDEN' ? '方塊加寬' : type === 'SHIELD' ? '甜心護盾' : '慢動作時間';
      setMilestoneBanner(`達成 ${layers} 層！獲得【${name}】`);

      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
      bannerTimeoutRef.current = setTimeout(() => {
        setMilestoneBanner(null);
      }, 2800);

      if (engineRef.current) {
        setActiveShield(engineRef.current.hasShield());
        setSlowTimer(engineRef.current.getSlowTimer());
      }
    };

    const engine = new GameEngine(canvas, {
      onScoreUpdate: handleScoreUpdate,
      onGameOver: handleGameOver,
      onAutoPowerUpTriggered: handleAutoPowerUpTriggered,
    });

    engineRef.current = engine;

    // Handle container resize
    const updateSize = () => {
      if (!container || !engine) return;
      const rect = container.getBoundingClientRect();
      engine.resize(rect.width, rect.height);
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      engine.stop();
      engineRef.current = null;
      sound.stopBGM();
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, [checkAndUpdateHighScore]);

  // Keep shield and slowTimer synced periodically
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const timer = setInterval(() => {
      if (engineRef.current) {
        setActiveShield(engineRef.current.hasShield());
        setSlowTimer(engineRef.current.getSlowTimer());
      }
    }, 150);
    return () => clearInterval(timer);
  }, [gameState]);

  // Game flow controllers
  const startGame = useCallback(() => {
    if (!engineRef.current) return;
    setIsNewHigh(false);
    setScore(0);
    setHeight(0);
    setCombo(0);
    setMaxCombo(0);
    setMilestoneBanner(null);

    // Request orientation permission on mobile
    orientation.requestPermission();

    // Start background music
    sound.startBGM();

    engineRef.current.reset();
    engineRef.current.start();
    setGameState('PLAYING');
  }, [orientation]);

  const pauseGame = useCallback(() => {
    if (gameState !== 'PLAYING' || !engineRef.current) return;
    sound.pauseBGM();
    engineRef.current.pause();
    setGameState('PAUSED');
  }, [gameState]);

  const resumeGame = useCallback(() => {
    if (gameState !== 'PAUSED' || !engineRef.current) return;
    sound.resumeBGM();
    engineRef.current.resume();
    setGameState('PLAYING');
  }, [gameState]);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const toggleSound = useCallback(() => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  // Primary user interaction: click/tap to drop
  const handleInteraction = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      // Prevent double trigger if target is button
      const target = e.target as HTMLElement;
      if (target.closest('button')) {
        return;
      }
    }

    if (gameState === 'PLAYING' && engineRef.current) {
      engineRef.current.dropBlock();
    }
  }, [gameState]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'MENU') {
          startGame();
        } else if (gameState === 'PLAYING' && engineRef.current) {
          engineRef.current.dropBlock();
        } else if (gameState === 'GAMEOVER') {
          restartGame();
        }
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'PLAYING') {
          pauseGame();
        } else if (gameState === 'PAUSED') {
          resumeGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, pauseGame, resumeGame, restartGame]);

  return (
    <div className="min-h-screen w-full bg-[#FFF5EE] flex items-center justify-center p-0 sm:p-4 select-none overflow-hidden">
      {/* Phone container shell */}
      <div className="relative w-full h-screen sm:h-[840px] sm:max-w-[420px] bg-white sm:rounded-[40px] shadow-2xl sm:border-[8px] sm:border-white/80 overflow-hidden flex flex-col">
        {/* Dynamic Canvas Container */}
        <div
          ref={containerRef}
          onClick={handleInteraction}
          className="relative w-full flex-1 touch-none cursor-pointer"
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* HUD Overlay (Playing state) */}
          {gameState === 'PLAYING' && (
            <HUD
              score={score}
              height={height}
              combo={combo}
              bestScore={bestScore}
              isMuted={isMuted}
              onToggleSound={toggleSound}
              onPause={pauseGame}
              activeShield={activeShield}
              slowTimer={slowTimer}
              milestoneBanner={milestoneBanner}
              currentBeta={orientation.currentBeta}
              isUpright={orientation.isUpright}
              justTriggered={orientation.justTriggered}
              onSimulateFlip={orientation.simulateForwardFlip}
            />
          )}

          {/* Title Screen Overlay */}
          {gameState === 'MENU' && (
            <TitleScreen
              bestScore={bestScore}
              isMuted={isMuted}
              onToggleSound={toggleSound}
              onStart={startGame}
            />
          )}

          {/* Pause Modal Overlay */}
          {gameState === 'PAUSED' && (
            <PauseModal
              score={score}
              height={height}
              isMuted={isMuted}
              onResume={resumeGame}
              onRestart={restartGame}
              onToggleSound={toggleSound}
            />
          )}

          {/* Game Over Modal Overlay */}
          {gameState === 'GAMEOVER' && (
            <GameOverModal
              score={score}
              height={height}
              maxCombo={maxCombo}
              bestScore={bestScore}
              isNewHigh={isNewHigh}
              onRestart={restartGame}
            />
          )}
        </div>
      </div>
    </div>
  );
}
