import React, { useState, useEffect } from 'react';
import {
  Headphones,
  CloudRain,
  Radio,
  Waves,
  Trees,
  Volume2,
  VolumeX,
  Square,
  Play,
} from 'lucide-react';
import { soundEngine } from '../utils/audio';

type TrackType = 'rain' | 'alpha' | 'noise' | 'stream';

interface TrackDef {
  id: TrackType;
  name: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}

const TRACKS: TrackDef[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    desc: 'Soft steady rainfall on glass',
    icon: <CloudRain className="w-4 h-4" />,
    color: '#0a84ff',
  },
  {
    id: 'alpha',
    name: 'Alpha Binaural',
    desc: '10Hz deep flow brainwave sync',
    icon: <Radio className="w-4 h-4" />,
    color: '#ff9f0a',
  },
  {
    id: 'noise',
    name: 'Pink Focus',
    desc: 'Smooth frequency background blocker',
    icon: <Waves className="w-4 h-4" />,
    color: '#bf5af2',
  },
  {
    id: 'stream',
    name: 'Forest Stream',
    desc: 'Peaceful woodland water flow',
    icon: <Trees className="w-4 h-4" />,
    color: '#30d158',
  },
];

export const AmbientSoundscape: React.FC = () => {
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0.4);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const handleToggleTrack = (trackId: TrackType) => {
    soundEngine.playAmbient(trackId);
    setActiveTrack(soundEngine.getCurrentTrack());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundEngine.setVolume(val);
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleStopAll = () => {
    soundEngine.stopAmbient();
    setActiveTrack(null);
  };

  return (
    <div className="glass-panel p-6 flex flex-col justify-between gap-4 h-full rounded-[24px]">
      {/* Header with audio visualizer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-[#ff9f0a]" />
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Focus Soundscapes
              {activeTrack && (
                <div className="flex items-center gap-0.5 h-4 ml-1">
                  <span className="w-1 bg-[#ff9f0a] rounded-full wave-bar" />
                  <span className="w-1 bg-[#ff9f0a] rounded-full wave-bar" />
                  <span className="w-1 bg-[#ff9f0a] rounded-full wave-bar" />
                  <span className="w-1 bg-[#ff9f0a] rounded-full wave-bar" />
                </div>
              )}
            </h2>
            <p className="text-xs text-[#8e8e93]">
              Procedural Web Audio soundscapes to block environmental distractions.
            </p>
          </div>
        </div>

        {activeTrack && (
          <button
            onClick={handleStopAll}
            className="px-3 py-1 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-[11px] text-[#ff453a] border border-white/10 flex items-center gap-1 transition-colors font-medium active:scale-95"
          >
            <Square className="w-3 h-3 fill-current" />
            Stop
          </button>
        )}
      </div>

      {/* Sound Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {TRACKS.map((t) => {
          const isPlaying = activeTrack === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleToggleTrack(t.id)}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-95 ${
                isPlaying
                  ? 'border-[#ff9f0a] bg-[#ff9f0a]/15 shadow-md shadow-[#ff9f0a]/20 scale-[1.01]'
                  : 'border-white/10 bg-[#1c1c1e] hover:bg-[#2c2c2e]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className="p-1.5 rounded-xl text-white"
                  style={{ backgroundColor: `${t.color}25` }}
                >
                  {t.icon}
                </span>
                {isPlaying ? (
                  <span className="text-[10px] font-bold text-[#ff9f0a] uppercase tracking-wider animate-pulse">
                    Playing
                  </span>
                ) : (
                  <Play className="w-3 h-3 text-[#8e8e93] opacity-60" />
                )}
              </div>
              <div>
                <span className="font-semibold text-xs text-white block truncate">{t.name}</span>
                <span className="text-[10px] text-[#8e8e93] line-clamp-1">{t.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Volume Slider Bar */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs text-[#8e8e93]">
        <button
          onClick={handleToggleMute}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-[#ff453a]" /> : <Volume2 className="w-4 h-4" />}
          <span className="text-[11px]">{isMuted ? 'Muted' : 'Volume'}</span>
        </button>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Soundscape volume"
            className="w-full accent-[#ff9f0a] h-1.5 bg-[#1c1c1e] rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[11px] font-mono text-white w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
