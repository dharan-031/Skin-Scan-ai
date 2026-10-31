import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Start / Pause the timer' },
  { key: 'R', desc: 'Reset timer to current mode default' },
  { key: 'S', desc: 'Skip to next session (Focus ↔ Break)' },
  { key: 'Z', desc: 'Toggle Fullscreen Zen Mode' },
  { key: 'D', desc: 'Open Distraction Logger' },
  { key: 'M', desc: 'Mute / Unmute audio soundscapes' },
  { key: '?', desc: 'Show this keyboard guide' },
  { key: 'Esc', desc: 'Close dialogs or exit Zen Mode' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 max-w-md w-full bg-[#1c1c1e] border-white/15 shadow-2xl rounded-[26px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#ff9f0a]" />
            Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8e8e93] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-white/10 text-xs">
          {SHORTCUTS.map((item) => (
            <div key={item.key} className="py-2.5 flex items-center justify-between">
              <span className="text-[#8e8e93] font-medium">{item.desc}</span>
              <kbd className="px-2 py-1 rounded-lg bg-[#2c2c2e] border border-white/15 text-white font-mono font-semibold shadow-sm">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#2c2c2e] hover:bg-[#3a3a3c] text-xs text-white font-medium transition-all active:scale-95 border border-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
