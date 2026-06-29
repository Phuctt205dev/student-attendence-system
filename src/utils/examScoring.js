/** Chuyển điểm đạt được / tổng điểm bài thi sang thang 10. */
export const toScale10 = (earned, total) => {
  const e = Number(earned);
  const t = Number(total);
  if (!t || t <= 0 || Number.isNaN(e)) return null;
  return Math.round((e / t) * 1000) / 100;
};

export const formatScale10 = (earned, total) => {
  const value = toScale10(earned, total);
  if (value === null) return '—';
  return value.toFixed(1);
};

export const getAttemptScoreBreakdown = (attempt, exam) => {
  if (!attempt) {
    return {
      hasAttempt: false,
      mcqScore: 0,
      mcqTotal: 0,
      essayScore: null,
      essayTotal: 0,
      earned: 0,
      totalRaw: exam?.totalPoints ?? 0,
      scale10: null,
      essayPending: false
    };
  }

  const totalRaw = attempt.totalScore ?? exam?.totalPoints ?? 0;
  const earned = attempt.score ?? 0;
  const mcqScore = attempt.mcqScore ?? earned;
  const mcqTotal = attempt.mcqTotalPoints ?? 0;
  const essayTotal = attempt.essayTotalPoints ?? 0;
  const essayScore =
    attempt.essayScore !== null && attempt.essayScore !== undefined
      ? attempt.essayScore
      : null;
  const essayPending = Boolean(attempt.essayPending);

  return {
    hasAttempt: true,
    mcqScore,
    mcqTotal,
    essayScore,
    essayTotal,
    earned,
    totalRaw,
    scale10: toScale10(earned, totalRaw),
    essayPending,
    isSubmitted: attempt.status === 'submitted' || attempt.status === 'graded'
  };
};

export const getPassingScale10 = (exam) => {
  const passing = exam?.passingScore;
  const total = exam?.totalPoints;
  return toScale10(passing, total);
};

export const getAttemptExamCodeLabel = (attempt) => {
  if (!attempt) return '—';

  const codeLabel =
    attempt.printVersionName ||
    attempt.printVersionCode ||
    attempt.codeLabel ||
    attempt.versionName ||
    attempt.examCode ||
    attempt.paperCode ||
    attempt.printVersionId;

  const source = String(attempt.source || attempt.submissionSource || '').toLowerCase();
  const isPaperAttempt = source === 'omr' || source === 'paper' || Boolean(codeLabel);

  if (isPaperAttempt) {
    return codeLabel ? String(codeLabel) : 'OMR';
  }

  return 'Online';
};
