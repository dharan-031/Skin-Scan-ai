import React from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Compass,
  VolumeX,
  Siren,
} from 'lucide-react';
import { formatAwayTime } from '../utils/logic';

interface FocusLockAlertProps {
  isOpen: boolean;
  awaySeconds: number;
  onDismiss: () => void;
  activeTaskText?: string;
  isSirenActive?: boolean;
}

export const FocusLockAlert: React.FC<FocusLockAlertProps> = ({
  isOpen,
  awaySeconds,
  onDismiss,
  activeTaskText,
  isSirenActive,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel p-6 sm:p-8 max-w-lg w-full bg-[#1c1c1e] border-white/15 shadow-2xl rounded-[26px] flex flex-col gap-5 text-white">
        {/* Header with glowing shield */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#ff453a]/20 border border-[#ff453a]/40 flex items-center justify-center text-[#ff453a] shadow-lg shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-[#ff453a]">
              Attention Drift Detected
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              Focus Lock: Tab Switch Logged
            </h3>
          </div>
        </div>

        {/* Emergency Ambulance Siren Banner */}
        <div className="p-3.5 rounded-2xl bg-[#ff453a]/20 border border-[#ff453a]/40 text-white flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff453a] animate-ping shrink-0" />
            <span className="text-xs font-bold flex items-center gap-1.5 text-white">
              <Siren className="w-4 h-4 text-[#ff453a] animate-bounce" />
              Emergency Ambulance Siren Active
            </span>
          </div>
          <span className="text-[11px] text-[#ff453a] font-mono font-semibold">
            Sounding
          </span>
        </div>

        {/* Away metric callout */}
        <div className="p-4 rounded-2xl bg-[#2c2c2e] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#ff9f0a]" />
            <span className="text-xs text-[#8e8e93]">Time away from workspace:</span>
          </div>
          <span className="text-base font-extrabold text-[#ff453a] font-mono">
            {formatAwayTime(awaySeconds)}
          </span>
        </div>

        {/* Psychological Reframing */}
        <div className="p-4 rounded-2xl bg-[#2c2c2e]/60 border border-white/10 text-xs text-[#8e8e93] leading-relaxed">
          <p className="font-semibold text-white mb-1">Why did this happen?</p>
          <p>
            The urge to open another tab or check apps is a normal reaction to cognitive resistance.
            Recognize the urge without self-criticism, take one slow breath, and refocus on your micro-step.
          </p>
        </div>

        {activeTaskText && (
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center gap-2 text-xs">
            <span className="text-[#ff9f0a] font-semibold shrink-0">Your single mission:</span>
            <span className="text-white truncate font-medium">"{activeTaskText}"</span>
          </div>
        )}

        {/* Action button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onDismiss}
            className="w-full px-6 py-3.5 rounded-2xl bg-[#ff9f0a] hover:bg-[#ffb340] text-black font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <VolumeX className="w-4 h-4" />
            Silence Siren & Resume Deep Flow
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
