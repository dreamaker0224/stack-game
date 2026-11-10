/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  bestScore: number;
  isMuted: boolean;
  onToggleSound: () => void;
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  bestScore,
  isMuted,
  onToggleSound,
  onStart,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between items-center p-6 text-center select-none bg-gradient-to-b from-[#FFFDF9] via-[#FFF5ED] to-[#FFEFE4]">
      {/* Top Bar Status */}
      <div className="w-full flex justify-between items-center">
        <div className="bg-white/80 border border-pink-100 rounded-full px-3 py-1 text-xs font-bold text-pink-700 shadow-xs flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>最佳紀錄：{bestScore}</span>
        </div>

        <button
          onClick={onToggleSound}
          className="w-10 h-10 rounded-full bg-white/80 border border-orange-100 shadow-xs flex items-center justify-center text-slate-600 active:scale-95 transition-transform cursor-pointer"
          aria-label={isMuted ? '開啟聲音' : '靜音'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-600" />}
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke Macaron Lockup */}
      <div className="flex flex-col items-center my-auto">
        <div className="relative mb-5 animate-bounce" style={{ animationDuration: '3s' }}>
          {/* Decorative layered macaron illustration */}
          <svg width="140" height="110" viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g filter="drop-shadow(0px 8px 16px rgba(244, 114, 182, 0.25))">
              {/* Top shell */}
              <ellipse cx="70" cy="38" rx="55" ry="24" fill="#FF9AA2" />
              <ellipse cx="70" cy="34" rx="44" ry="16" fill="#FFAEC0" />
              <ellipse cx="55" cy="28" rx="20" ry="6" fill="#FFFFFF" fillOpacity="0.45" />

              {/* Cream layer */}
              <rect x="22" y="46" width="96" height="14" rx="7" fill="#FFFDF5" />
              <circle cx="34" cy="53" r="3" fill="#FFEAA7" />
              <circle cx="50" cy="53" r="2.5" fill="#B5EAD7" />
              <circle cx="68" cy="53" r="3" fill="#FFB7B2" />
              <circle cx="86" cy="53" r="2.5" fill="#C7CEEA" />
              <circle cx="104" cy="53" r="3" fill="#FFEAA7" />

              {/* Bottom shell */}
              <ellipse cx="70" cy="68" rx="55" ry="24" fill="#FF9AA2" />
              <ellipse cx="70" cy="64" rx="52" ry="18" fill="#FF808C" />
            </g>
          </svg>
        </div>

        <h1 className="text-3xl font-black font-display tracking-tight text-slate-800 leading-tight mb-1">
          Macaron Sweet Tower
        </h1>
        <p className="text-sm font-bold text-pink-600 tracking-wide mb-3">
          溫暖馬卡龍 · 2D 擺鐘疊疊樂
        </p>

        {/* Feature Highlights */}
        <div className="flex flex-wrap justify-center items-center gap-1.5 text-[11px] font-semibold text-amber-900/75 bg-amber-50/80 px-3.5 py-2 rounded-2xl border border-amber-200/50 mb-6 max-w-xs">
          <span>🍓 擺鐘精準掉落</span>
          <span>·</span>
          <span>🍮 果凍切片回彈</span>
          <span>·</span>
          <span>📱 手機前翻感應</span>
          <span>·</span>
          <span>🎵 甜點治癒音樂</span>
        </div>

        {/* Start Game CTA */}
        <button
          onClick={onStart}
          className="w-56 py-4 px-6 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white rounded-3xl font-display font-black text-lg shadow-xl shadow-pink-300/40 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>開始堆疊</span>
        </button>
      </div>

      {/* Control Hint Line */}
      <div className="text-xs font-semibold text-slate-500 pb-2">
        手機垂直往前翻平放即可下落 · 點擊螢幕任意處釋放 · P 鍵暫停
      </div>
    </div>
  );
};
