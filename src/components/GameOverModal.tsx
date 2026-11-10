/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, Award, Layers, Flame } from 'lucide-react';

interface GameOverModalProps {
  score: number;
  height: number;
  maxCombo: number;
  bestScore: number;
  isNewHigh: boolean;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  height,
  maxCombo,
  bestScore,
  isNewHigh,
  onRestart,
}) => {
  // Rank determination
  let rank = 'C';
  let rankColor = 'text-slate-500 bg-slate-100 border-slate-200';
  let rankTitle = '初學烘焙甜心';

  if (height >= 35) {
    rank = 'S+';
    rankColor = 'text-amber-600 bg-amber-50 border-amber-300';
    rankTitle = '傳奇甜點名匠 👑';
  } else if (height >= 25) {
    rank = 'S';
    rankColor = 'text-pink-600 bg-pink-50 border-pink-300';
    rankTitle = '頂級法式甜點師 ✨';
  } else if (height >= 16) {
    rank = 'A';
    rankColor = 'text-purple-600 bg-purple-50 border-purple-300';
    rankTitle = '熟練馬卡龍高手 🎀';
  } else if (height >= 8) {
    rank = 'B';
    rankColor = 'text-emerald-600 bg-emerald-50 border-emerald-300';
    rankTitle = '甜美烘焙新手 🧁';
  }

  return (
    <div className="absolute inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-pink-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="relative mb-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-400 to-rose-300 text-white flex items-center justify-center text-3xl shadow-lg shadow-pink-200">
            🍰
          </div>
          {isNewHigh && (
            <span className="absolute -top-2 -right-3 bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-bounce">
              NEW RECORD!
            </span>
          )}
        </div>

        <h2 className="text-2xl font-black font-display text-slate-800 tracking-wide">
          甜點塔完工！
        </h2>
        <p className="text-xs font-semibold text-pink-600 mb-4">{rankTitle}</p>

        {/* Rank Stamp */}
        <div className={`px-4 py-1.5 rounded-2xl border text-sm font-black font-display mb-4 flex items-center gap-2 ${rankColor}`}>
          <span>等級評定</span>
          <span className="text-xl font-extrabold">{rank}</span>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full mb-6">
          <div className="bg-orange-50/70 p-3 rounded-2xl border border-orange-100 text-left">
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700/80 mb-0.5">
              <Award className="w-3.5 h-3.5" />
              <span>本局得分</span>
            </div>
            <span className="text-2xl font-black font-display text-slate-900 tabular-nums">
              {score}
            </span>
          </div>

          <div className="bg-pink-50/70 p-3 rounded-2xl border border-pink-100 text-left">
            <div className="flex items-center gap-1 text-[10px] font-bold text-pink-700/80 mb-0.5">
              <Layers className="w-3.5 h-3.5" />
              <span>累積高度</span>
            </div>
            <span className="text-2xl font-black font-display text-pink-600 tabular-nums">
              {height} <span className="text-xs font-semibold">層</span>
            </span>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100 text-left">
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800/80 mb-0.5">
              <Flame className="w-3.5 h-3.5" />
              <span>最高連擊</span>
            </div>
            <span className="text-lg font-black font-display text-amber-600 tabular-nums">
              {maxCombo > 0 ? `${maxCombo} 次` : '0 次'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 mb-0.5">
              <span>歷史最高</span>
            </div>
            <span className="text-lg font-black font-display text-slate-700 tabular-nums">
              {bestScore}
            </span>
          </div>
        </div>

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="w-full py-4 px-4 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white rounded-2xl font-display font-black text-base shadow-xl shadow-pink-300/40 hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>再來一局</span>
        </button>
        <span className="text-[11px] text-slate-400 mt-2 font-medium">
          可按空白鍵（Space）快速重開
        </span>
      </div>
    </div>
  );
};
