/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  score: number;
  height: number;
  isMuted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  score,
  height,
  isMuted,
  onResume,
  onRestart,
  onToggleSound,
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-pink-100 flex flex-col items-center text-center">
        {/* Title */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3 text-2xl shadow-inner">
          ☕
        </div>
        <h2 className="text-2xl font-black font-display text-slate-800 tracking-wide mb-1">
          遊戲暫停
        </h2>
        <p className="text-xs text-slate-500 mb-5">享受一口馬卡龍，休息一下再繼續！</p>

        {/* Current status stats */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100/60">
            <span className="text-[10px] font-bold text-amber-700/70 block">當前得分</span>
            <span className="text-xl font-extrabold text-slate-800 font-display tabular-nums">
              {score}
            </span>
          </div>
          <div className="bg-pink-50/60 p-3 rounded-2xl border border-pink-100/60">
            <span className="text-[10px] font-bold text-pink-700/70 block">當前高度</span>
            <span className="text-xl font-extrabold text-pink-600 font-display tabular-nums">
              {height} <span className="text-xs font-semibold">層</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-2xl font-display font-black text-base shadow-lg shadow-pink-300/40 hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>繼續遊戲</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-display font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重新開始</span>
          </button>

          <button
            onClick={onToggleSound}
            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>音效：{isMuted ? '已靜音' : '已開啟'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
