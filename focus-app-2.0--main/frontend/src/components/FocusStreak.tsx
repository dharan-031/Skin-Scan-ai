import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  CheckCircle2,
  Calendar,
  Settings2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { StreakData, DayStreakStatus, getLast7DaysStatus } from '../utils/logic';

interface FocusStreakProps {
  streakData: StreakData;
  onUpdateDailyGoal: (newGoal: number) => void;
  todayCompletedCount: number;
}

export const FocusStreak: React.FC<FocusStreakProps> = ({
  streakData,
  onUpdateDailyGoal,
  todayCompletedCount,
}) => {
  const [showGoalSettings, setShowGoalSettings] = useState(false);

  const goal = streakData.dailyGoal || 4;
  const progressRatio = Math.min(1, todayCompletedCount / goal);
  const progressPercent = Math.round(progressRatio * 100);
  const isGoalAchieved = todayCompletedCount >= goal;
  const days: DayStreakStatus[] = getLast7DaysStatus(streakData.history, goal);

  return (
    <div
      data-testid="focus-streak-indicator"
      className="glass-panel p-5 sm:p-6 w-full flex flex-col gap-4 relative overflow-hidden transition-all duration-300 rounded-[24px]"
    >
      {/* Background ambient decorative iOS glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-[#ff9f0a]/12 via-[#ff453a]/8 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Main Top Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Streak Flame & Title */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
              streakData.currentStreak > 0
                ? 'bg-[#ff9f0a]/15 border-[#ff9f0a]/40 shadow-sm text-[#ff9f0a]'
                : 'bg-[#1c1c1e] border-white/10 text-[#8e8e93]'
            }`}
          >
            <Flame
              className={`w-6 h-6 transition-transform ${
                streakData.currentStreak > 0
                  ? 'text-[#ff9f0a] fill-[#ff9f0a] scale-105'
                  : 'text-[#8e8e93]'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {streakData.currentStreak > 0
                  ? `${streakData.currentStreak} Day${streakData.currentStreak > 1 ? 's' : ''} Focus Streak`
                  : 'Daily Focus Streak'}
              </span>
              {streakData.currentStreak > 0 && (
                <span className="text-xs font-semibold text-[#ff9f0a]">
                  · Active
                </span>
              )}
            </div>

            <p className="text-xs text-[#8e8e93] mt-0.5 flex items-center gap-2">
              <span>Goal: {goal} pomodoros per day</span>
              <span aria-hidden="true">·</span>
              {streakData.bestStreak > 0 ? (
                <span className="inline-flex items-center gap-1 text-[#30d158] font-medium">
                  <Trophy className="w-3 h-3" /> Best: {streakData.bestStreak}d
                </span>
              ) : (
                <span>Build your consistency</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick Goal Action & Today's Status */}
        <div className="flex items-center gap-2.5 self-stretch md:self-auto justify-between md:justify-end">
          {isGoalAchieved ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#30d158] px-3 py-1.5 rounded-xl bg-[#30d158]/15 border border-[#30d158]/30">
              <CheckCircle2 className="w-4 h-4 text-[#30d158]" />
              Daily Goal Complete
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-[#1c1c1e] border border-white/10 text-xs text-[#8e8e93] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff9f0a]" />
              <span>
                <strong className="text-white">{goal - todayCompletedCount}</strong> more to keep streak
              </span>
            </div>
          )}

          <button
            onClick={() => setShowGoalSettings(!showGoalSettings)}
            aria-label="Adjust daily pomodoro goal"
            className="p-2 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] text-[#8e8e93] hover:text-white border border-white/10 transition-colors active:scale-95"
            title="Configure Daily Goal"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Goal Adjustment Drawer (toggleable) */}
      {showGoalSettings && (
        <div className="p-3 rounded-2xl bg-[#1c1c1e] border border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in">
          <span className="text-[#8e8e93] flex items-center gap-1.5 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#ff9f0a]" /> Set daily target:
          </span>
          <div className="ios-segmented flex items-center gap-1">
            {[2, 3, 4, 6, 8].map((g) => (
              <button
                key={g}
                onClick={() => {
                  onUpdateDailyGoal(g);
                  setShowGoalSettings(false);
                }}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  goal === g
                    ? 'bg-[#ff9f0a] text-black font-semibold shadow-sm'
                    : 'text-[#8e8e93] hover:text-white'
                }`}
              >
                {g} pomos
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Middle Row: Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8e8e93] font-medium flex items-center gap-1.5">
            Today's Progress:
            <strong className="text-white font-mono">{todayCompletedCount}</strong> /{' '}
            <span className="text-[#8e8e93]">{goal} pomodoros</span>
          </span>
          <span className="font-mono text-[#ff9f0a] font-semibold">{progressPercent}%</span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2.5 rounded-full bg-[#1c1c1e] overflow-hidden relative border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isGoalAchieved
                ? 'bg-gradient-to-r from-[#30d158] to-[#34c759]'
                : 'bg-gradient-to-r from-[#ff9f0a] to-[#ff453a]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Bottom Row: 7-Day Mini Calendar Strip */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none">
        {days.map((d) => (
          <div
            key={d.dateKey}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl flex-1 min-w-[50px] transition-all border ${
              d.isToday
                ? 'bg-[#2c2c2e] border-[#ff9f0a]/50 shadow-sm'
                : d.goalMet
                ? 'bg-[#30d158]/10 border-[#30d158]/30'
                : 'bg-[#1c1c1e] border-white/5 opacity-80'
            }`}
          >
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                d.isToday ? 'text-[#ff9f0a]' : 'text-[#8e8e93]'
              }`}
            >
              {d.dayLabel}
            </span>

            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs">
              {d.goalMet ? (
                <Flame className="w-4 h-4 text-[#ff9f0a] fill-[#ff9f0a]" />
              ) : d.count > 0 ? (
                <span className="font-mono font-bold text-white text-[11px]">{d.count}</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              )}
            </div>

            <span className="text-[9px] text-[#8e8e93] mt-0.5">
              {d.count > 0 ? `${d.count} done` : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
