const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const getTeamMomentum = (team, score, winScore) => {
  const safeWinScore = Math.max(1, Math.abs(winScore || 1));
  const normalized = clamp(score / safeWinScore, -1, 1);
  const teamMomentum = team === 'blue' ? -normalized : normalized;
  return Number(clamp(teamMomentum, 0, 1).toFixed(2));
};

export const getSpectacleIntensity = ({
  team,
  score,
  winScore,
  streak = 0,
  lastCorrectAt = 0,
  now = Date.now(),
}) => {
  const freshness = lastCorrectAt > 0
    ? clamp(1 - ((now - lastCorrectAt) / 1200), 0, 1)
    : 0;
  const streakBoost = clamp(streak / 6, 0, 1);
  const momentum = getTeamMomentum(team, score, winScore);

  return Number(clamp((freshness * 0.35) + (streakBoost * 0.5) + (momentum * 0.25), 0, 1).toFixed(2));
};

export const getParticleCount = (intensity, compact = false) => {
  const safeIntensity = clamp(intensity || 0, 0, 1);
  const base = compact ? 4 : 6;
  const range = compact ? 8 : 14;
  return Math.round(base + (safeIntensity * range));
};

export const getSpectacleGlyphs = (subjectMode) => (
  subjectMode === 'word'
    ? ['A', 'B', 'C', 'W', 'O', 'R', 'D']
    : ['+', '-', 'x', '/', '=', '10', '20']
);
