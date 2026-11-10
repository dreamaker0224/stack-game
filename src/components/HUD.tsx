/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pause, Volume2, VolumeX, Shield, Clock, Gift, Smartphone } from 'lucide-react';

interface HUDProps {
  score: number;
  height: number;
  combo: number;
  bestScore: number;
  isMuted: boolean;
  onToggleSound: () => void;
  onPause: () => void;
  activeShield: boolean;
  slowTimer: number;
  milestoneBanner: string | null;
  // Mobile orientation detection
  currentBeta: number;
  isUpright: boolean;
  justTriggered: boolean;
  onSimulateFlip?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  height,
  combo,
  isMuted,
  onToggleSound,
  onPause,
  activeShield,
  slowTimer,
  milestoneBanner,
  currentBeta,
  isUpright,
  justTriggered,
  onSimulateFlip,
}) => {
  const layersToNextReward = 5 - (height % 5);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between w-full">
          {/* Score & Height Stats */}
          <div className="flex items-center gap-2.5">
            <div className="bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-2xl shadow-sm border border-orange-100 flex flex-col">
              <span className="text-[10px] font-bold text-amber-700/80 tracking-wider">SCORE</span>
              <span className="text-xl font-extrabold text-slate-800 font-display tabular-nums leading-tight">
                {score}
              </span>
            </div>

            <div className="bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-2xl shadow-sm border border-orange-100 flex flex-col">
              <span className="text-[10px] font-bold text-amber-700/80 tracking-wider">LAYERS</span>
              <span className="text-xl font-extrabold text-pink-600 font-display tabular-nums leading-tight">
                {height} <span className="text-xs font-semibold text-pink-400">層</span>
              </span>
            </div>
          </div>

          {/* Action Buttons: Sound & Pause & Active Buffs */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Active Status Badges */}
            {activeShield && (
              <div className="flex items-center gap-1 bg-pink-500 text-white border border-pink-400 px-2.5 py-1.5 rounded-xl text-xs font-black animate-pulse shadow-md">
                <Shield className="w-3.5 h-3.5" />
                <span>護盾中</span>
              </div>
            )}

            {slowTimer > 0 && (
              <div className="flex items-center gap-1 bg-amber-500 text-white border border-amber-400 px-2.5 py-1.5 rounded-xl text-xs font-black shadow-md">
                <Clock className="w-3.5 h-3.5" />
                <span>{Math.ceil(slowTimer)}s</span>
              </div>
            )}

            <button
              onClick={onToggleSound}
              aria-label={isMuted ? '開啟音樂音效' : '靜音'}
              title={isMuted ? '開啟音樂音效' : '靜音'}
              className="w-10 h-10 rounded-2xl bg-white/95 border border-orange-100 shadow-sm flex items-center justify-center text-slate-700 active:scale-95 transition-transform cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Volume2 className="w-5 h-5 text-amber-600" />}
            </button>

            <button
              onClick={onPause}
              aria-label="暫停遊戲"
              className="w-10 h-10 rounded-2xl bg-white/95 border border-orange-100 shadow-sm flex items-center justify-center text-slate-700 active:scale-95 transition-transform cursor-pointer"
            >
              <Pause className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>

        {/* Status Indicators Row: Milestone & Phone Orientation Sensor */}
        <div className="flex items-center justify-between w-full gap-2">
          {/* 5-Layer Milestone Progress Indicator */}
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-pink-100/80 shadow-xs text-[11px] font-bold text-amber-900/75">
            <Gift className="w-3.5 h-3.5 text-pink-500" />
            <span>每 5 層自動獲得道具</span>
            <span className="text-pink-600">（差 {layersToNextReward} 層）</span>
          </div>

          {/* Orientation Sensor Detection Badge */}
          <button
            onClick={onSimulateFlip}
            title="點擊可手動模擬手機前翻姿勢"
            className={`pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-xs ${
              justTriggered
                ? 'bg-rose-500 text-white border-rose-400 scale-105 animate-pulse'
                : isUpright
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Smartphone className={`w-3.5 h-3.5 transition-transform duration-300 ${isUpright ? 'rotate-0' : 'rotate-45'}`} />
            <span>
              {justTriggered ? '⚡ 前翻釋放!' : isUpright ? '手機直立中' : '水平前傾'}
            </span>
            <span className="text-[10px] opacity-70">({currentBeta}°)</span>
          </button>
        </div>
      </div>

      {/* Mid Floating Alerts: Combo or 5-Layer Milestone Banner */}
      <div className="self-center flex flex-col items-center gap-2 my-auto">
        {milestoneBanner && (
          <div className="animate-in zoom-in-90 duration-300">
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-display font-black text-sm sm:text-base px-5 py-2 rounded-2xl shadow-xl border-2 border-white/60 tracking-wide flex items-center gap-2">
              <span className="text-lg">🎉</span>
              <span>{milestoneBanner}</span>
            </div>
          </div>
        )}

        {combo > 1 && (
          <div className="animate-bounce">
            <div className="bg-gradient-to-r from-amber-400 to-pink-500 text-white font-display font-black text-xs sm:text-sm px-4 py-1 rounded-full shadow-md tracking-wider flex items-center gap-1">
              <span>✨ PERFECT COMBO</span>
              <span className="text-sm font-black">x{combo}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area is completely clean with dual-control hint */}
      <div className="w-full flex justify-center pb-2">
        <div className="text-[11px] font-medium text-amber-900/60 bg-white/60 px-3.5 py-1.5 rounded-full backdrop-blur-xs border border-orange-100/40 text-center shadow-xs">
          📱 手機垂直往前翻平放即可下落 · 亦可點擊螢幕任意處或空白鍵
        </div>
      </div>
    </div>
  );
};
