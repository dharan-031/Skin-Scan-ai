import React, { useEffect } from 'react';
import {
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
} from 'lucide-react';
import { TimerMode, Task, formatTime, calculateProgressOffset } from '../utils/logic';
import { soundEngine } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';

interface ZenOverlayProps {
  mode: TimerMode;
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  onStartPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onClose: () => void;
  activeTask?: Task;
  onCompleteTask?: (task: Task) => void;
}

export const ZenOverlay: React.FC<ZenOverlayProps> = ({
  mode,
  remainingSeconds,
  totalSeconds,
  isRunning,
  onStartPause,
  onReset,
  onSkip,
  onClose,
  activeTask,
  onCompleteTask,
}) => {
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = calculateProgressOffset(remainingSeconds, totalSeconds, circumference);

  const isBreak = mode === 'shortBreak' || mode === 'longBreak';
  const modeTitle = mode === 'focus' ? 'Deep Work Flow' : mode === 'shortBreak' ? 'Short Break' : 'Restorative Break';

  // Listen for Escape key to exit Zen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        onStartPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onStartPause]);

  const handleFinishTask = (e: React.MouseEvent) => {
    if (!activeTask || !onCompleteTask) return;
    soundEngine.playTaskSuccess();
    triggerConfetti(window.innerWidth / 2, window.innerHeight / 2);
    onCompleteTask(activeTask);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000]/95 backdrop-blur-3xl flex flex-col items-center justify-between p-6 sm:p-12 text-white animate-fade-in">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#30d158] animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-[#8e8e93] font-semibold">
            Zen Mode · Press ESC to exit
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Exit Zen Mode"
          className="px-4 py-2 rounded-full border border-white/15 bg-[#1c1c1e] hover:bg-[#2c2c2e] text-xs text-white flex items-center gap-2 transition-all active:scale-95"
        >
          <Minimize2 className="w-4 h-4" />
          Exit Zen
        </button>
      </div>

      {/* Main Big Centerpiece */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center glow-ring mb-6">
          <svg
            className="w-full h-full -rotate-90 transform"
            viewBox="0 0 300 300"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="zenFocusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff9f0a" />
                <stop offset="100%" stopColor="#ff453a" />
              </linearGradient>
              <linearGradient id="zenBreakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#30d158" />
                <stop offset="100%" stopColor="#0a84ff" />
              </linearGradient>
            </defs>

            <circle
              cx="150"
              cy="150"
              r={radius}
              fill="none"
              stroke="#2a2e6b"
              strokeWidth="12"
              className="opacity-30"
            />
            <circle
              cx="150"
              cy="150"
              r={radius}
              fill="none"
              stroke={isBreak ? 'url(#zenBreakGrad)' : 'url(#zenFocusGrad)'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center select-none text-center">
            <span className="text-xs uppercase tracking-widest text-[#8e8e93] font-semibold mb-2">
              {modeTitle}
            </span>
            <span className="text-6xl sm:text-7xl font-bold tracking-tight text-white font-mono drop-shadow-lg">
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-xs text-[#8e8e93] mt-3">
              {isRunning ? 'Flow state active' : 'Paused · Space to toggle'}
            </span>
          </div>
        </div>

        {/* Current Active Step Callout */}
        {activeTask && (
          <div className="max-w-md w-full bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 text-left">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#ff9f0a] block">
                Single Focus Goal
              </span>
              <p className="text-sm font-medium text-white truncate mt-0.5">{activeTask.text}</p>
            </div>
            {!activeTask.done && onCompleteTask && (
              <button
                onClick={handleFinishTask}
                className="px-3 py-1.5 rounded-xl bg-[#30d158]/20 hover:bg-[#30d158]/30 border border-[#30d158]/40 text-[#30d158] text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Done!
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={onReset}
          aria-label="Reset timer"
          className="p-3.5 rounded-full border border-white/15 bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white transition-all active:scale-95"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={onStartPause}
          className={`px-8 py-3.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-xl ${
            isRunning
              ? 'bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white border border-white/20'
              : isBreak
              ? 'bg-[#30d158] hover:bg-[#34c759] text-black shadow-[#30d158]/25'
              : 'bg-[#ff9f0a] hover:bg-[#ffb340] text-black shadow-[#ff9f0a]/25'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5 fill-current" /> Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" /> Resume
            </>
          )}
        </button>

        <button
          onClick={onSkip}
          aria-label="Skip session"
          className="p-3.5 rounded-full border border-white/15 bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white transition-all active:scale-95"
          title="Skip"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
