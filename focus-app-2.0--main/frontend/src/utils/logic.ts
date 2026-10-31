/**
 * Core business and calculation logic for Focus Studio
 */

export interface Task {
  id: string;
  text: string;
  done: boolean;
  isPriority?: boolean;
  pomodorosEstimated?: number;
  pomodorosCompleted?: number;
  createdAt: number;
}

export interface DistractionLog {
  id: string;
  reason: string;
  timestamp: number;
}

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface DiagnosticResult {
  category: string;
  title: string;
  strategy: string;
  actionPrompt: string;
  sampleStep: string;
  suggestedDurationMinutes: number;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  dailyGoal: number;
  lastGoalAchievedDate: string | null;
  history: Record<string, number>;
}

export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateKey(): string {
  return formatDateKey(new Date());
}

export function getYesterdayDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
}

export function createDefaultStreakData(): StreakData {
  return {
    currentStreak: 0,
    bestStreak: 0,
    dailyGoal: 4,
    lastGoalAchievedDate: null,
    history: {},
  };
}

export function evaluateStreakOnLoad(
  data: StreakData,
  todayKey: string = getTodayDateKey(),
  yesterdayKey: string = getYesterdayDateKey()
): StreakData {
  if (!data.lastGoalAchievedDate) {
    return { ...data, currentStreak: 0 };
  }
  // If the last achieved date was today or yesterday, streak is alive
  if (data.lastGoalAchievedDate === todayKey || data.lastGoalAchievedDate === yesterdayKey) {
    return data;
  }
  // Otherwise, streak is broken
  return {
    ...data,
    currentStreak: 0,
  };
}

export function recordCompletedSessionInStreak(
  data: StreakData,
  todayKey: string = getTodayDateKey(),
  yesterdayKey: string = getYesterdayDateKey()
): { updated: StreakData; goalJustAchieved: boolean } {
  const currentCount = (data.history[todayKey] || 0) + 1;
  const newHistory = { ...data.history, [todayKey]: currentCount };
  let newCurrentStreak = data.currentStreak;
  let newBestStreak = data.bestStreak;
  let newLastDate = data.lastGoalAchievedDate;
  let goalJustAchieved = false;

  if (currentCount >= data.dailyGoal && data.lastGoalAchievedDate !== todayKey) {
    goalJustAchieved = true;
    newLastDate = todayKey;
    if (data.lastGoalAchievedDate === yesterdayKey) {
      newCurrentStreak = data.currentStreak + 1;
    } else {
      newCurrentStreak = 1;
    }
    newBestStreak = Math.max(newBestStreak, newCurrentStreak);
  }

  return {
    updated: {
      ...data,
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
      lastGoalAchievedDate: newLastDate,
      history: newHistory,
    },
    goalJustAchieved,
  };
}

export interface DayStreakStatus {
  dateKey: string;
  dayLabel: string;
  count: number;
  goalMet: boolean;
  isToday: boolean;
}

export function getLast7DaysStatus(
  history: Record<string, number>,
  dailyGoal: number,
  todayDate: Date = new Date()
): DayStreakStatus[] {
  const days: DayStreakStatus[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const dateKey = formatDateKey(d);
    const count = history[dateKey] || 0;
    days.push({
      dateKey,
      dayLabel: i === 0 ? 'Today' : dayNames[d.getDay()],
      count,
      goalMet: count >= dailyGoal,
      isToday: i === 0,
    });
  }
  return days;
}

export function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return `${mm}:${ss}`;
}

export function calculateCircumference(radius: number): number {
  return 2 * Math.PI * radius;
}

export function calculateProgressOffset(
  remainingSeconds: number,
  totalSeconds: number,
  circumference: number
): number {
  if (totalSeconds <= 0) return circumference;
  const progressRatio = Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  return circumference * (1 - progressRatio);
}

export function calculateEfficiency(focusMinutes: number, distractionsCount: number): number {
  if (focusMinutes <= 0) {
    return distractionsCount === 0 ? 100 : Math.max(0, 100 - distractionsCount * 15);
  }
  // Formula: Distractions penalize focus proportional to hours worked
  // 1 distraction per 25 min session gives ~88% efficiency
  const penalty = (distractionsCount * 12) / Math.max(1, focusMinutes / 25);
  const efficiency = Math.max(15, Math.round(100 - penalty));
  return Math.min(100, efficiency);
}

export const PROCRASTINATION_REASONS: Record<string, DiagnosticResult> = {
  overwhelmed: {
    category: 'Overwhelmed',
    title: 'The Monster is Too Big',
    strategy: 'Radical Task Shrinking',
    actionPrompt: 'Pick the single easiest 2-minute action. Do not think about finishing the whole project.',
    sampleStep: 'Open the document and write 1 rough bullet point.',
    suggestedDurationMinutes: 5,
  },
  perfectionism: {
    category: 'Perfectionism',
    title: 'Fear of Bad Quality',
    strategy: 'Permission to Produce Trash',
    actionPrompt: 'Intentionally write an ugly, flawed first pass. Nobody has to see it except you.',
    sampleStep: 'Draft a messy 3-sentence summary with zero self-editing.',
    suggestedDurationMinutes: 10,
  },
  lowEnergy: {
    category: 'Low Energy',
    title: 'Cognitive Battery Depleted',
    strategy: 'Physical Reset & Low-Stakes Entry',
    actionPrompt: 'Drink a glass of water, do 5 deep breaths, then work for just 5 minutes without pressure.',
    sampleStep: 'Organize or review notes for 3 minutes before doing any heavy lifting.',
    suggestedDurationMinutes: 10,
  },
  distracted: {
    category: 'Distracted Mind',
    title: 'Dopamine Loop & Tab Hopping',
    strategy: 'Friction & Airplane Simulation',
    actionPrompt: 'Close all irrelevant tabs, flip your phone screen-down across the room, and put on ambient noise.',
    sampleStep: 'Clear desk surface and fullscreen your current work window.',
    suggestedDurationMinutes: 15,
  },
};

export function getDiagnosticRecommendation(reasonKey: string): DiagnosticResult {
  return (
    PROCRASTINATION_REASONS[reasonKey] || {
      category: 'Resistance',
      title: 'Starting Friction',
      strategy: 'The 2-Minute Commitment',
      actionPrompt: 'Commit to just 120 seconds. If you still want to stop after 2 minutes, you have permission to stop.',
      sampleStep: 'Take one tiny physical action on your task right now.',
      suggestedDurationMinutes: 2,
    }
  );
}

export const FOCUS_NUDGES: string[] = [
  'Starting is 80% of the battle. Once in motion, staying in motion takes 4x less effort.',
  'Shrink the definition of done: "Write 1 messy paragraph" is infinitely better than "Write essay".',
  'Out of sight, out of mind: Place your phone in another room or out of arm reach.',
  'You do not need to feel inspired to start. Action produces motivation, not the other way around.',
  'Make the next step so ridiculously small that it is impossible to say no to.',
  'Forgive yourself for the last 30 minutes. The present minute is completely unruined.',
  'One tab, one task. Multitasking is just rapid distraction switching.',
  'When resistance feels high, take three slow diaphragmatic breaths and just open the file.',
];

export function getRandomNudge(excludeIndex = -1): { text: string; index: number } {
  const availableIndices = FOCUS_NUDGES.map((_, i) => i).filter((i) => i !== excludeIndex);
  const targetIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  return {
    text: FOCUS_NUDGES[targetIndex],
    index: targetIndex,
  };
}

export function formatAwayTime(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export interface FocusIntegrity {
  score: number;
  badge: 'Impenetrable Flow' | 'High Discipline' | 'Moderate Focus' | 'Fragmented Attention';
  description: string;
}

export function calculateFocusIntegrity(
  sessionSeconds: number,
  tabSwitchesCount: number,
  awaySecondsTotal: number
): FocusIntegrity {
  if (tabSwitchesCount === 0 && awaySecondsTotal === 0) {
    return {
      score: 100,
      badge: 'Impenetrable Flow',
      description: 'Zero tab switches. Full cognitive presence maintained throughout the sprint.',
    };
  }

  const switchPenalty = tabSwitchesCount * 15;
  const timePenalty = (awaySecondsTotal / Math.max(60, sessionSeconds)) * 50;
  const score = Math.max(10, Math.round(100 - switchPenalty - timePenalty));

  if (score >= 85) {
    return {
      score,
      badge: 'High Discipline',
      description: 'Minor tab switch quickly recovered. Excellent focus retention.',
    };
  }
  if (score >= 60) {
    return {
      score,
      badge: 'Moderate Focus',
      description: 'Some attention drift detected. Practice closing distracting background tabs.',
    };
  }
  return {
    score,
    badge: 'Fragmented Attention',
    description: 'Multiple workspace exits during this session. Consider enabling Hardcore Lock.',
  };
}

