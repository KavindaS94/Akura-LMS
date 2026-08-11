/** Phase 6 built-in letter scale when exams.default_grade_scale === "letter". */

export function percentage(score: number, maxMarks: number): number {
  if (maxMarks <= 0) return 0;
  return Math.round((score / maxMarks) * 1000) / 10;
}

export function letterFromPercent(pct: number): string {
  if (pct >= 75) return "A";
  if (pct >= 65) return "B";
  if (pct >= 55) return "C";
  if (pct >= 40) return "S";
  return "F";
}

/**
 * Competition ranking: equal scores share rank; next rank skips.
 * Input should be sorted by score descending.
 */
export function competitionRanks(scoresDesc: number[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < scoresDesc.length; i++) {
    if (i > 0 && scoresDesc[i] === scoresDesc[i - 1]) {
      ranks.push(ranks[i - 1]!);
    } else {
      ranks.push(i + 1);
    }
  }
  return ranks;
}
