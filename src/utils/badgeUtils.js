export function calculateCollectionBadgeStats(history = [], userData = {}) {
  const scoredQuizEntries = (history || []).filter(entry => {
    const type = entry?.type || 'quiz';
    return (type === 'quiz' || type === 'workbook') && typeof entry.score === 'number';
  });

  const bestScoreByUnit = new Map();
  scoredQuizEntries.forEach(entry => {
    if (!entry.unitId) return;
    const previous = bestScoreByUnit.get(entry.unitId) ?? -Infinity;
    bestScoreByUnit.set(entry.unitId, Math.max(previous, entry.score));
  });

  const bestScores = Array.from(bestScoreByUnit.values());
  const quizScoreSum = scoredQuizEntries.reduce((sum, entry) => sum + Number(entry.score || 0), 0);

  return {
    quizAttempts: scoredQuizEntries.length,
    quizScoreSum,
    quizAverageScore: scoredQuizEntries.length ? quizScoreSum / scoredQuizEntries.length : 0,
    perfectAttempts: scoredQuizEntries.filter(entry => Number(entry.score) === 100).length,
    uniqueQuizUnits: bestScoreByUnit.size,
    averageScore: bestScores.length
      ? bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length
      : 0,
    perfectUnits: bestScores.filter(score => score === 100).length,
  };
}

export function buildCollectionBadges(userData = {}, history = []) {
  const quizStats = calculateCollectionBadgeStats(history, userData);

  return [
    { title: '코스모스 입문', icon: '🌌', unlocked: quizStats.uniqueQuizUnits > 0, desc: '첫 번째 수학 탐사를 성공적으로 마쳤습니다.' },
    { title: '광석 수집가', icon: '💎', unlocked: (userData?.crystals || 0) >= 500, desc: '광석을 500개 이상 모았습니다. (중급 대원)' },
    { title: '은하 학자', icon: '📜', unlocked: quizStats.averageScore >= 95, desc: '평균 정답률 95% 이상을 유지 중인 엘리트 대원입니다.' },
    { title: '우주 비행사', icon: '👨‍🚀', unlocked: quizStats.uniqueQuizUnits >= 30, desc: '탐험을 30번 이상 완료한 숙련된 비행사입니다.' },
    { title: '행성 개척자', icon: '🚩', unlocked: quizStats.uniqueQuizUnits >= 70, desc: '수많은 행성을 개척한 위대한 탐험가입니다.' },
    { title: '태양계 마스터', icon: '☀️', unlocked: quizStats.uniqueQuizUnits >= 132 && quizStats.averageScore >= 99, desc: '132개 모든 세트의 탐사를 마친 전설의 마스터입니다.' },
    { title: '무결점 궤도', icon: '🛰️', unlocked: (userData?.consecutiveGood || 0) >= 10, desc: '연속 10세트 동안 정답률 90% 이상을 유지했습니다.' },
    { title: '슈퍼노바', icon: '💥', unlocked: (userData?.dailyQuizCount || 0) >= 5, desc: '하루에 5세트 이상의 탐사를 완수했습니다.' },
    { title: '심우주 항해사', icon: '🌠', unlocked: quizStats.uniqueQuizUnits >= 100, desc: '누적 퀴즈 100세트를 돌파한 베테랑 항해사입니다.' },
    { title: '수학의 수호자', icon: '🛡️', unlocked: (userData?.shieldDefended || 0) >= 200, desc: '광자 실드로 에너지(광석) 손실을 200회 이상 방어했습니다.' },
    { title: '완벽한 도약', icon: '⚡', unlocked: quizStats.perfectUnits >= 20, desc: '백점 보너스(+10)를 20회 달성한 완벽주의 대원입니다.' },
    { title: '항해의 시작', icon: '🕯️', unlocked: (userData?.longestStreak || 0) >= 3, desc: '3일 연속 학습을 달성했습니다.' },
    { title: '궤도 진입', icon: '🔵', unlocked: (userData?.longestStreak || 0) >= 7, desc: '7일 연속 학습! 안정 궤도에 진입했습니다.' },
    { title: '항성풍 서퍼', icon: '🟣', unlocked: (userData?.longestStreak || 0) >= 30, desc: '30일 연속! 항성풍을 타고 항해 중입니다.' },
    { title: '초신성 폭발', icon: '💫', unlocked: (userData?.longestStreak || 0) >= 100, desc: '100일 연속! 초신성급 에너지를 방출합니다.' },
    { title: '영원한 항해사', icon: '🌌', unlocked: (userData?.longestStreak || 0) >= 365, desc: '365일 연속! 은하핵에 도달한 전설의 항해사.' },
  ];
}
