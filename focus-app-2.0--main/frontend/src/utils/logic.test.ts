import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTime,
  calculateCircumference,
  calculateProgressOffset,
  calculateEfficiency,
  getDiagnosticRecommendation,
  getRandomNudge,
  FOCUS_NUDGES,
  createDefaultStreakData,
  evaluateStreakOnLoad,
  recordCompletedSessionInStreak,
  getLast7DaysStatus,
  formatAwayTime,
  calculateFocusIntegrity,
} from './logic.ts';

test('formatTime formats seconds into mm:ss with zero-padding', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(5), '00:05');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(1500), '25:00');
  assert.equal(formatTime(3600), '60:00');
  assert.equal(formatTime(-10), '00:00');
});

test('calculateCircumference calculates 2 * pi * r', () => {
  const r = 100;
  const expected = 2 * Math.PI * 100;
  assert.ok(Math.abs(calculateCircumference(r) - expected) < 0.001);
});

test('calculateProgressOffset correctly computes svg stroke dash offset', () => {
  const circ = 100;
  // Full time remaining: offset should be 0 (full circle visible)
  assert.equal(calculateProgressOffset(100, 100, circ), 0);
  // Half time remaining: offset should be 50
  assert.equal(calculateProgressOffset(50, 100, circ), 50);
  // Zero time remaining: offset should be full circumference
  assert.equal(calculateProgressOffset(0, 100, circ), 100);
});

test('calculateEfficiency scales with focus time and distractions', () => {
  // No distractions -> 100%
  assert.equal(calculateEfficiency(50, 0), 100);
  // Distraction reduces efficiency
  const withOne = calculateEfficiency(50, 1);
  const withThree = calculateEfficiency(50, 3);
  assert.ok(withOne < 100);
  assert.ok(withThree < withOne);
  assert.ok(withThree >= 15);
});

test('getDiagnosticRecommendation returns structured advice for valid & fallback reasons', () => {
  const overwhelmed = getDiagnosticRecommendation('overwhelmed');
  assert.equal(overwhelmed.category, 'Overwhelmed');
  assert.ok(overwhelmed.sampleStep.length > 0);

  const fallback = getDiagnosticRecommendation('non_existent');
  assert.equal(fallback.category, 'Resistance');
  assert.equal(fallback.suggestedDurationMinutes, 2);
});

test('getRandomNudge returns valid nudge from catalogue', () => {
  const nudge = getRandomNudge();
  assert.ok(FOCUS_NUDGES.includes(nudge.text));
  assert.ok(nudge.index >= 0 && nudge.index < FOCUS_NUDGES.length);
});

test('evaluateStreakOnLoad preserves streak if last achieved was today or yesterday', () => {
  const initial = createDefaultStreakData();
  initial.currentStreak = 3;
  initial.bestStreak = 5;
  initial.lastGoalAchievedDate = '2026-10-14';

  // If today is 2026-10-15 and yesterday was 2026-10-14, streak is preserved
  const evaluated = evaluateStreakOnLoad(initial, '2026-10-15', '2026-10-14');
  assert.equal(evaluated.currentStreak, 3);

  // If last achieved date was 3 days ago (e.g. 2026-10-10), streak resets to 0 but bestStreak remains 5
  const broken = evaluateStreakOnLoad(initial, '2026-10-15', '2026-10-14');
  initial.lastGoalAchievedDate = '2026-10-10';
  const brokenEvaluated = evaluateStreakOnLoad(initial, '2026-10-15', '2026-10-14');
  assert.equal(brokenEvaluated.currentStreak, 0);
  assert.equal(brokenEvaluated.bestStreak, 5);
});

test('recordCompletedSessionInStreak increments streak upon reaching daily goal', () => {
  const data = createDefaultStreakData();
  data.dailyGoal = 2;
  data.currentStreak = 1;
  data.bestStreak = 1;
  data.lastGoalAchievedDate = '2026-10-14';

  // Session 1 completed today: count is 1 (< 2 goal), no goal reached yet
  const res1 = recordCompletedSessionInStreak(data, '2026-10-15', '2026-10-14');
  assert.equal(res1.goalJustAchieved, false);
  assert.equal(res1.updated.currentStreak, 1);
  assert.equal(res1.updated.history['2026-10-15'], 1);

  // Session 2 completed today: count is 2 (>= 2 goal), goal achieved!
  const res2 = recordCompletedSessionInStreak(res1.updated, '2026-10-15', '2026-10-14');
  assert.equal(res2.goalJustAchieved, true);
  assert.equal(res2.updated.currentStreak, 2);
  assert.equal(res2.updated.bestStreak, 2);
  assert.equal(res2.updated.lastGoalAchievedDate, '2026-10-15');

  // Session 3 completed today: already achieved today, does not double increment streak
  const res3 = recordCompletedSessionInStreak(res2.updated, '2026-10-15', '2026-10-14');
  assert.equal(res3.goalJustAchieved, false);
  assert.equal(res3.updated.currentStreak, 2);
  assert.equal(res3.updated.history['2026-10-15'], 3);
});

test('getLast7DaysStatus returns array of 7 consecutive day objects', () => {
  const history = { '2026-10-15': 4, '2026-10-14': 2 };
  const refDate = new Date('2026-10-15T12:00:00Z');
  const days = getLast7DaysStatus(history, 4, refDate);
  assert.equal(days.length, 7);
  assert.equal(days[6].isToday, true);
  assert.equal(days[6].count, 4);
  assert.equal(days[6].goalMet, true);
  assert.equal(days[5].count, 2);
  assert.equal(days[5].goalMet, false);
});

test('formatAwayTime formats seconds into readable strings', () => {
  assert.equal(formatAwayTime(5), '5s');
  assert.equal(formatAwayTime(45), '45s');
  assert.equal(formatAwayTime(60), '1m');
  assert.equal(formatAwayTime(85), '1m 25s');
  assert.equal(formatAwayTime(120), '2m');
});

test('calculateFocusIntegrity computes flow rating based on tab switches and away duration', () => {
  // Perfect session: 0 switches, 0 away
  const perfect = calculateFocusIntegrity(1500, 0, 0);
  assert.equal(perfect.score, 100);
  assert.equal(perfect.badge, 'Impenetrable Flow');

  // Slight switch (1 switch for 10s)
  const slight = calculateFocusIntegrity(1500, 1, 10);
  assert.ok(slight.score >= 80 && slight.score < 100);
  assert.equal(slight.badge, 'High Discipline');

  // Heavy switches (4 switches for 200s)
  const heavy = calculateFocusIntegrity(1500, 4, 200);
  assert.ok(heavy.score < 60);
  assert.equal(heavy.badge, 'Fragmented Attention');
});


