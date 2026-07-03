import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, ChevronLeft, Eye, Lightbulb, RotateCcw, Save } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { buildStreakWriteAudit, calculateStreakUpdate, getTodayKST } from '../../utils/streakUtils';
import { calculateGrowthUpdates } from '../../utils/rankingUtils';
import { recordCrystalTransaction } from '../../utils/crystalLedger';
import { applyCrystalRewardMultiplier } from '../../utils/holidayUtils';
import soundManager from '../../utils/SoundManager';

const ANSWER_REVEAL_SECONDS = 30;
const STUDENT_INDENT = '  ';
const CODE_PANEL_MIN_HEIGHT = 300;
const CODE_PANEL_MAX_HEIGHT = 720;
const CODE_PANEL_LINE_HEIGHT_PX = 23;
const CODE_PANEL_VERTICAL_PADDING_PX = 32;

// 보상: 라인 수 비례 + 반복 연습 감쇠
// 기본 보상 = 코드 줄 수 × 1.5 (반올림, 최소 2)
// 같은 세트를 반복 통과할 때마다 보상이 2/3씩 감소 (사용자 예시 15→10→7)
// 최대 MAX_ATTEMPTS 회까지 보상 지급, 그 이후는 연습만 가능
const LINE_REWARD_RATE = 1.5;
const MIN_EXERCISE_REWARD = 2;
const MAX_ATTEMPTS = 3;
const DECAY_FACTOR = 2 / 3;

function normalizeNewlines(text = '') {
  return String(text).replace(/\r\n/g, '\n');
}

function trimTrailingWhitespace(line = '') {
  return line.replace(/\s+$/g, '');
}

function getLeadingWhitespace(line = '') {
  return String(line || '').match(/^\s*/)?.[0] || '';
}

function getIndentVisualWidth(indent = '') {
  return Array.from(indent).reduce((sum, char) => sum + (char === '\t' ? 2 : 1), 0);
}

function isAllowedIndent(indent = '') {
  if (!indent) return true;
  const chars = Array.from(indent);
  if (chars.every(char => char === '\t')) return true;
  if (chars.every(char => char === ' ')) return chars.length % 2 === 0;
  return getIndentVisualWidth(indent) % 2 === 0;
}

function buildIndentRankMap(lines = []) {
  const widths = new Set([0]);
  lines.forEach((line) => {
    const indent = getLeadingWhitespace(line);
    if (isAllowedIndent(indent)) widths.add(getIndentVisualWidth(indent));
  });
  return new Map([...widths].sort((a, b) => a - b).map((width, index) => [width, index]));
}

function normalizeIndentForCompare(line = '', indentRanks = null) {
  const indent = getLeadingWhitespace(line);
  const width = getIndentVisualWidth(indent);
  if (!indentRanks) return indent;
  if (!isAllowedIndent(indent)) return `__bad_indent_${width}__`;
  return `__indent_${indentRanks.get(width) ?? width}__`;
}

function normalizePythonLineForCompare(line = '', indentRanks = null) {
  const raw = trimTrailingWhitespace(String(line || ''));
  const indent = getLeadingWhitespace(raw);
  const body = raw.slice(indent.length);
  let result = normalizeIndentForCompare(raw, indentRanks);
  let quote = '';
  let escaped = false;

  for (const char of body) {
    if (quote) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }

    if (!/\s/.test(char)) {
      result += char;
    }
  }

  return result;
}

function hasOnlyQuotedWhitespaceDifference(answerLine = '', studentLine = '') {
  const normalizedAnswer = normalizePythonLineForCompare(answerLine);
  const normalizedStudent = normalizePythonLineForCompare(studentLine);
  if (normalizedAnswer === normalizedStudent) return false;
  if (!/["']/.test(normalizedAnswer) && !/["']/.test(normalizedStudent)) return false;
  return normalizedAnswer.replace(/\s/g, '') === normalizedStudent.replace(/\s/g, '');
}

function countChar(text, char) {
  return Array.from(text || '').filter(c => c === char).length;
}

function evaluateCode(answerCode, studentCode) {
  const answer = normalizeNewlines(answerCode);
  const student = normalizeNewlines(studentCode);
  const answerLines = answer.split('\n');
  const studentLines = student.split('\n');
  const targetIndexes = answerLines.map((_, index) => index);
  const answerIndentRanks = buildIndentRankMap(answerLines);
  const studentIndentRanks = buildIndentRankMap(studentLines);
  const targetAnswer = targetIndexes.map(index => normalizePythonLineForCompare(answerLines[index] || '', answerIndentRanks)).join('\n');
  const targetStudent = targetIndexes.map(index => normalizePythonLineForCompare(studentLines[index] || '', studentIndentRanks)).join('\n');
  const totalChars = Math.max(targetAnswer.length, targetStudent.length, 1);

  let sameChars = 0;
  for (let i = 0; i < Math.min(targetAnswer.length, targetStudent.length); i += 1) {
    if (targetAnswer[i] === targetStudent[i]) sameChars += 1;
  }

  let correctLines = 0;
  targetIndexes.forEach((index) => {
    const line = answerLines[index] || '';
    if (normalizePythonLineForCompare(line, answerIndentRanks) === normalizePythonLineForCompare(studentLines[index] || '', studentIndentRanks)) {
      correctLines += 1;
    }
  });

  const issues = [];
  targetIndexes.forEach((index) => {
    const answerLine = answerLines[index] || '';
    const studentLine = studentLines[index] || '';
    if (!studentLine && answerLine) {
      issues.push(`${index + 1}번째 줄이 비어 있습니다.`);
      return;
    }
    if (answerLine.trim().endsWith(':') && !studentLine.trim().endsWith(':')) {
      issues.push(`${index + 1}번째 줄 끝의 콜론(:)을 확인하세요.`);
    }
    const sameCodeWithDifferentIndent = normalizePythonLineForCompare(answerLine, answerIndentRanks) !== normalizePythonLineForCompare(studentLine, studentIndentRanks)
      && normalizePythonLineForCompare(answerLine).replace(/^\s*/, '') === normalizePythonLineForCompare(studentLine).replace(/^\s*/, '');
    if (sameCodeWithDifferentIndent) {
      issues.push(`${index + 1}번째 줄의 들여쓰기 단계를 확인하세요. 탭, 스페이스 2칸, 스페이스 4칸은 같은 단계로 인정됩니다.`);
    }
    if (hasOnlyQuotedWhitespaceDifference(answerLine, studentLine)) {
      issues.push(`${index + 1}번째 줄의 따옴표 안 공백은 출력되는 글자이므로 그대로 맞춰야 합니다.`);
    }
    if (countChar(studentLine, '(') !== countChar(studentLine, ')')) {
      issues.push(`${index + 1}번째 줄의 괄호 짝을 확인하세요.`);
    }
    if (countChar(studentLine, '"') % 2 !== 0 || countChar(studentLine, "'") % 2 !== 0) {
      issues.push(`${index + 1}번째 줄의 따옴표 짝을 확인하세요.`);
    }
  });

  return {
    perfect: correctLines === targetIndexes.length && targetIndexes.length > 0,
    accuracy: Math.max(0, Math.round((sameChars / totalChars) * 100)),
    correctLines,
    totalLines: targetIndexes.length,
    answerLines,
    studentLines,
    issues: issues.length ? issues.slice(0, 5) : ['특별한 문법 오류는 감지되지 않았습니다. 다른 글자나 공백을 정답 코드와 비교해 보세요.']
  };
}

function getModeCode(exercise, mode, visibleLines) {
  const answer = normalizeNewlines(exercise.answerCode || '');
  if (mode === 'line') return answer.split('\n').slice(0, visibleLines).join('\n');
  return answer;
}

function getExerciseId(exercise) {
  return exercise?.id || exercise?.docId || '';
}

// 정답 코드 줄 수 기반 기본 보상 (1회차). 라인×1.5, 반올림, 최소 2.
function getExerciseBaseReward(answerCode = '') {
  const lines = normalizeNewlines(answerCode).split('\n').length;
  const raw = lines * LINE_REWARD_RATE;
  return Math.max(MIN_EXERCISE_REWARD, Math.round(raw));
}

// 시도 횟수(1-base)에 따른 보상. 2/3 감쇠, 반올림. MAX_ATTEMPTS 초과 시 0.
function getAttemptReward(base, attempt) {
  const safeAttempt = Math.max(1, Math.floor(Number(attempt) || 1));
  if (safeAttempt > MAX_ATTEMPTS) return 0;
  return Math.round(base * Math.pow(DECAY_FACTOR, safeAttempt - 1));
}

// 시도 횟수 → 남은 보상 회차. 1=첫 보상, 2/3=감소된 보상, 0=보상 소진(연습만)
function remainingRewardedAttempts(attempt) {
  return Math.max(0, MAX_ATTEMPTS - Math.max(0, Math.floor(Number(attempt) || 0)));
}

function getLineCombo(answerCode = '', studentCode = '') {
  const answerLines = normalizeNewlines(answerCode).split('\n');
  const studentLines = normalizeNewlines(studentCode).split('\n');
  const answerIndentRanks = buildIndentRankMap(answerLines);
  const studentIndentRanks = buildIndentRankMap(studentLines);
  let combo = 0;

  for (let i = 0; i < answerLines.length; i += 1) {
    const answerLine = answerLines[i] || '';
    const studentLine = studentLines[i] || '';
    if (!studentLine && answerLine) break;
    if (normalizePythonLineForCompare(answerLine, answerIndentRanks) !== normalizePythonLineForCompare(studentLine, studentIndentRanks)) break;
    combo += 1;
  }
  return combo;
}

export default function CodeTracePlayer({
  exercises = [],
  unitId,
  unitTitle,
  activeUnit,
  clusterId,
  learningProgress,
  onClose
}) {
  const { user } = useAuth();
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [mode, setMode] = useState('recall');
  const [visibleLines, setVisibleLines] = useState(1);
  const [answerVisible, setAnswerVisible] = useState(true);
  const [revealSeconds, setRevealSeconds] = useState(ANSWER_REVEAL_SECONDS);
  const [studentCode, setStudentCode] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState(() => new Set(learningProgress?.codeTrace?.completedExerciseIds || []));
  // 세트별 작성 초안 보존. { [exerciseId]: studentCode }. 세트를 옮겨도 돌아오면 복원됨.
  const [drafts, setDrafts] = useState(() => ({ ...(learningProgress?.codeTrace?.drafts || {}) }));
  // exerciseAttempts: { [exerciseId]: 시도횟수 }. 레거시 earnedExerciseIds는 시도 1회로 간주.
  const [exerciseAttempts, setExerciseAttempts] = useState(() => {
    const attempts = { ...(learningProgress?.codeTrace?.exerciseAttempts || {}) };
    const legacyEarned = learningProgress?.codeTrace?.earnedExerciseIds;
    if (Array.isArray(legacyEarned)) {
      legacyEarned.forEach((id) => {
        if (id && !attempts[id]) attempts[id] = 1;
      });
    }
    return attempts;
  });
  const [crystalsEarnedTotal, setCrystalsEarnedTotal] = useState(() => Number(learningProgress?.codeTrace?.crystalsEarnedTotal || 0));
  const [completionState, setCompletionState] = useState(null);
  const [rewardBurst, setRewardBurst] = useState(null);
  const [linePulse, setLinePulse] = useState(null);
  const [saving, setSaving] = useState(false);
  const previousLineComboRef = useRef(0);

  useEffect(() => {
    const savedIds = learningProgress?.codeTrace?.completedExerciseIds;
    if (Array.isArray(savedIds)) {
      setCompletedIds(new Set(savedIds));
    }
  }, [learningProgress?.codeTrace?.completedExerciseIds]);

  useEffect(() => {
    const attempts = { ...(learningProgress?.codeTrace?.exerciseAttempts || {}) };
    const legacyEarned = learningProgress?.codeTrace?.earnedExerciseIds;
    if (Array.isArray(legacyEarned)) {
      legacyEarned.forEach((id) => {
        if (id && !attempts[id]) attempts[id] = 1;
      });
    }
    setExerciseAttempts(attempts);
  }, [learningProgress?.codeTrace?.exerciseAttempts, learningProgress?.codeTrace?.earnedExerciseIds]);

  useEffect(() => {
    setCrystalsEarnedTotal(Number(learningProgress?.codeTrace?.crystalsEarnedTotal || 0));
  }, [learningProgress?.codeTrace?.crystalsEarnedTotal]);

  const exercise = exercises[exerciseIndex] || null;
  const evaluation = useMemo(
    () => evaluateCode(exercise?.answerCode || '', studentCode),
    [exercise, studentCode]
  );
  const passingAccuracy = exercise?.passingAccuracy || 95;
  const currentPassed = evaluation.perfect || evaluation.accuracy >= passingAccuracy;
  const currentExerciseIds = useMemo(() => exercises.map(getExerciseId).filter(Boolean), [exercises]);
  const currentCompletedCount = useMemo(
    () => currentExerciseIds.filter(id => completedIds.has(id)).length,
    [currentExerciseIds, completedIds]
  );
  const allCompleted = currentExerciseIds.length > 0 && currentCompletedCount >= currentExerciseIds.length;
  const hint = exercise?.hints?.[Math.min(hintIndex, Math.max(0, (exercise?.hints?.length || 1) - 1))] || '';
  const currentExerciseId = getExerciseId(exercise);
  const currentAttemptCount = Number(exerciseAttempts[currentExerciseId] || 0);
  const exerciseBaseReward = getExerciseBaseReward(exercise?.answerCode || '');
  const nextAttemptNumber = currentAttemptCount + 1;
  // 이번 통과로 받을 보상(배율 적용 전). 4회차+는 0.
  const rawRewardForNextPass = getAttemptReward(exerciseBaseReward, nextAttemptNumber);
  const rewardStillAvailable = remainingRewardedAttempts(currentAttemptCount) > 0;
  const unitAlreadyCompleted = !!learningProgress?.codeTrace?.completed;
  const currentAlreadyCompleted = !!currentExerciseId && completedIds.has(currentExerciseId);
  const willCompleteOnPass = !unitAlreadyCompleted && currentPassed && currentExerciseId && !currentAlreadyCompleted && currentCompletedCount + 1 >= currentExerciseIds.length;
  const firstIncompleteIndex = useMemo(
    () => exercises.findIndex(item => !completedIds.has(getExerciseId(item))),
    [exercises, completedIds]
  );
  const hasIncomplete = firstIncompleteIndex >= 0;
  const hasIncompleteElsewhere = firstIncompleteIndex >= 0 && firstIncompleteIndex !== exerciseIndex;
  // 세트 이동은 항상 자유롭게. 단 다음/이전 인덱스 범위만 확인.
  const canGoPrev = exerciseIndex > 0;
  const canGoNext = exerciseIndex < exercises.length - 1;
  // 미완료 코드로 건너뛰기 강조 버튼: 미완료가 있고 현재가 아닐 때.
  const nextIncompleteIndex = useMemo(() => {
    if (firstIncompleteIndex < 0) return -1;
    const afterCurrent = exercises.findIndex((item, index) => index > exerciseIndex && !completedIds.has(getExerciseId(item)));
    return afterCurrent >= 0 ? afterCurrent : firstIncompleteIndex;
  }, [completedIds, exerciseIndex, exercises, firstIncompleteIndex]);
  const canMoveToIncompleteCode = hasIncompleteElsewhere && nextIncompleteIndex >= 0 && nextIncompleteIndex !== exerciseIndex;
  const lineCombo = useMemo(
    () => getLineCombo(exercise?.answerCode || '', studentCode),
    [exercise, studentCode]
  );

  // 현재 세트의 입력을 빈 상태로 되돌림 (초기화 버튼). 초안도 함께 비움.
  const resetExercise = () => {
    if (currentExerciseId) {
      setDrafts(prev => ({ ...prev, [currentExerciseId]: '' }));
    }
    setStudentCode('');
    setVisibleLines(1);
    setHintIndex(0);
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
    setLinePulse(null);
    previousLineComboRef.current = 0;
  };

  // 세트를 전환하되, 떠나는 세트의 작성 코드는 초안에 저장하고
  // 들어가는 세트의 저장된 초안을 복원한다. 통과한 세트는 초안을 비워 깔끔하게 시작.
  const goToExercise = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= exercises.length || nextIndex === exerciseIndex) return;
    const leavingId = currentExerciseId;
    setDrafts(prev => ({
      ...prev,
      [leavingId]: currentAlreadyCompleted ? '' : studentCode
    }));
    const targetId = getExerciseId(exercises[nextIndex]);
    setExerciseIndex(nextIndex);
    setStudentCode(drafts[targetId] || '');
    setVisibleLines(1);
    setHintIndex(0);
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
    setLinePulse(null);
    previousLineComboRef.current = 0;
  };

  useEffect(() => {
    previousLineComboRef.current = 0;
    setLinePulse(null);
  }, [exerciseIndex, mode]);

  useEffect(() => {
    if (lineCombo > previousLineComboRef.current && lineCombo > 0) {
      soundManager.playClick();
      setLinePulse({ id: Date.now(), count: lineCombo });
    }
    previousLineComboRef.current = lineCombo;
  }, [lineCombo]);

  useEffect(() => {
    if (!rewardBurst) return undefined;
    const timer = setTimeout(() => setRewardBurst(null), 1200);
    return () => clearTimeout(timer);
  }, [rewardBurst]);

  useEffect(() => {
    if (!exercises.length || unitAlreadyCompleted || firstIncompleteIndex < 0) return;
    const currentId = getExerciseId(exercises[exerciseIndex]);
    if (!currentId || completedIds.has(currentId)) {
      const targetId = getExerciseId(exercises[firstIncompleteIndex]);
      setExerciseIndex(firstIncompleteIndex);
      setStudentCode(drafts[targetId] || '');
      setVisibleLines(1);
      setHintIndex(0);
      setAnswerVisible(true);
      setRevealSeconds(ANSWER_REVEAL_SECONDS);
      setLinePulse(null);
      previousLineComboRef.current = 0;
    }
  }, [completedIds, exerciseIndex, exercises, firstIncompleteIndex, unitAlreadyCompleted, drafts]);

  useEffect(() => {
    if (!answerVisible) return undefined;
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
    const timer = setInterval(() => {
      setRevealSeconds(prev => {
        if (prev <= 1) {
          setAnswerVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [answerVisible, exerciseIndex, mode, visibleLines]);

  if (!exercise) {
    return (
      <div className="space-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 className="font-title" style={{ color: 'var(--crystal-cyan)' }}>CODE TRACE</h2>
          <p className="font-tech" style={{ color: 'var(--text-muted)' }}>등록된 코드 따라쓰기 항목이 없습니다.</p>
          <button className="hud-btn secondary glass" onClick={onClose}>돌아가기</button>
        </div>
      </div>
    );
  }

  const changeMode = (nextMode) => {
    if (currentExerciseId) {
      setDrafts(prev => ({ ...prev, [currentExerciseId]: '' }));
    }
    setMode(nextMode);
    setVisibleLines(1);
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
    setStudentCode('');
    setHintIndex(0);
  };

  const revealAnswer = () => {
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
  };

  // options.autoAdvance: 통과 후 자동으로 다음 미완료 세트로 이동할지.
  // 통과 버튼 직접 클릭 시엔 true(기본), leaveCurrentExercise로 이동 중엔 false(목적지를 직접 제어).
  const markCurrentPassed = async ({ autoAdvance = true } = {}) => {
    if (!user || !unitId || !currentPassed || !currentExerciseId || completionState === 'processing') return;
    setSaving(true);

    try {
      const today = getTodayKST();
      const userRef = doc(db, 'users', user.uid);
      const progressRef = doc(db, 'users', user.uid, 'learning_progress', unitId);
      const historyRef = doc(db, 'users', user.uid, 'history', `code_trace_${today}_${unitId}`);
      const unitTitleValue = unitTitle || activeUnit?.title || '코드 따라쓰기';
      const baseReward = getExerciseBaseReward(exercise?.answerCode || '');

      const result = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const progressSnap = await transaction.get(progressRef);
        const historySnap = await transaction.get(historyRef);
        if (!userSnap.exists()) throw new Error('User document not found');

        const freshUser = userSnap.data();
        const freshProgress = progressSnap.exists() ? progressSnap.data() : {};
        const freshCodeTrace = freshProgress.codeTrace || {};
        const freshCompletedIds = new Set(Array.isArray(freshCodeTrace.completedExerciseIds) ? freshCodeTrace.completedExerciseIds : []);
        // 시도 횟수 객체 (레거시 earnedExerciseIds는 1회로 간주)
        const freshAttempts = { ...(freshCodeTrace.exerciseAttempts || {}) };
        const legacyEarned = freshCodeTrace.earnedExerciseIds;
        if (Array.isArray(legacyEarned)) {
          legacyEarned.forEach((id) => { if (id && !freshAttempts[id]) freshAttempts[id] = 1; });
        }
        freshCompletedIds.add(currentExerciseId);

        // 이번 통과의 시도 번호(1-base)와 보상. 4회차+는 보상 0이지만 시도 횟수는 계속 증가.
        const attemptNumber = (Number(freshAttempts[currentExerciseId] || 0) || 0) + 1;
        freshAttempts[currentExerciseId] = attemptNumber;
        const rawReward = getAttemptReward(baseReward, attemptNumber);
        // 휴일/수업시간 외 배율 적용 (퀴즈·영상·데이터로그와 동일)
        const multiplierMeta = applyCrystalRewardMultiplier(rawReward, { clusterId: clusterId || 'python' });
        const actualReward = multiplierMeta.amount;

        const completedExerciseIds = currentExerciseIds.filter(id => freshCompletedIds.has(id));
        const completedExerciseCount = completedExerciseIds.length;
        const isNowCompleted = completedExerciseCount >= currentExerciseIds.length;
        const wasCompleted = !!freshCodeTrace.completed;
        const alreadyRecordedToday = historySnap.exists();
        const nextCrystalsEarnedTotal = Number(freshCodeTrace.crystalsEarnedTotal || 0) + actualReward;
        const bestAccuracy = Math.max(Number(freshCodeTrace.bestAccuracy || 0), evaluation.accuracy || 0);

        const userUpdates = {
          lastActive: serverTimestamp(),
        };

        if (isNowCompleted && !wasCompleted) {
          const streakCalc = calculateStreakUpdate(freshUser);
          const streakUpdates = streakCalc.streakUpdate || {};
          userUpdates.totalCodeTraces = (freshUser.totalCodeTraces || 0) + (alreadyRecordedToday ? 0 : 1);
          Object.assign(userUpdates, streakUpdates);
          if (Object.keys(streakUpdates).length > 0) {
            userUpdates.streakWriteAudit = buildStreakWriteAudit({
              source: 'code_trace_complete',
              writerUid: user.uid,
              prevState: freshUser,
              nextState: {
                currentStreak: streakUpdates.currentStreak,
                lastStreakDate: streakUpdates.lastStreakDate,
                streakFreezeCount: streakUpdates.streakFreezeCount,
              },
              writtenAt: serverTimestamp(),
              note: unitId,
            });
          }
        }

        if (actualReward > 0) {
          userUpdates.crystals = (freshUser.crystals || 0) + actualReward;
          Object.assign(userUpdates, calculateGrowthUpdates(freshUser, actualReward));
          recordCrystalTransaction(user.uid, {
            amount: actualReward,
            type: 'code_trace_exercise_reward',
            description: `${unitTitleValue} ${exerciseIndex + 1}/${exercises.length} 통과 (${attemptNumber}회차)`,
            metadata: {
              unitId,
              unitTitle: unitTitleValue,
              exerciseId: currentExerciseId,
              exerciseTitle: exercise.title || '',
              exerciseIndex: exerciseIndex + 1,
              exerciseCount: exercises.length,
              attemptNumber,
              baseAmount: multiplierMeta.baseAmount,
              bonusAmount: multiplierMeta.bonusAmount,
              rewardMultiplier: multiplierMeta.multiplier,
              rewardMultiplierLabel: multiplierMeta.label,
              accuracy: evaluation.accuracy,
              lineCombo,
            }
          }, transaction, `code_trace_${unitId}_${currentExerciseId}_attempt${attemptNumber}`);
        }

        transaction.update(userRef, userUpdates);
        transaction.set(progressRef, {
          unitTitle: unitTitleValue,
          codeTrace: {
            completed: isNowCompleted,
            ...(isNowCompleted ? { completedAt: serverTimestamp() } : {}),
            completedExerciseIds,
            exerciseAttempts: freshAttempts,
            completedExerciseCount,
            totalExerciseCount: exercises.length,
            crystalsEarnedTotal: nextCrystalsEarnedTotal,
            bestAccuracy,
            lastExerciseId: currentExerciseId,
            lastMode: mode,
            updatedAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        }, { merge: true });

        if (isNowCompleted) {
          transaction.set(historyRef, {
            type: 'code_trace',
            unitId,
            unitTitle: unitTitleValue,
            chapterId: activeUnit?.chapterId || '',
            clusterId: clusterId || 'python',
            score: bestAccuracy,
            accuracy: bestAccuracy,
            completedExerciseCount,
            totalExerciseCount: exercises.length,
            crystalsEarned: nextCrystalsEarnedTotal,
            timestamp: serverTimestamp()
          }, { merge: true });
        }

        return {
          actualReward,
          attemptNumber,
          completed: isNowCompleted,
          completedExerciseIds,
          exerciseAttempts: freshAttempts,
          completedExerciseCount,
          crystalsEarnedTotal: nextCrystalsEarnedTotal,
          bestAccuracy,
        };
      });

      setCompletedIds(new Set(result.completedExerciseIds));
      setExerciseAttempts(result.exerciseAttempts);
      setCrystalsEarnedTotal(result.crystalsEarnedTotal);

      if (result.actualReward > 0) {
        soundManager.playCrystal();
        setRewardBurst({ id: Date.now(), amount: result.actualReward, attempt: result.attemptNumber });
      } else {
        soundManager.playCorrect();
      }

      if (result.completed) {
        soundManager.playLevelUp();
        setCompletionState({
          actualReward: result.actualReward,
          totalEarned: result.crystalsEarnedTotal,
          accuracy: result.bestAccuracy,
        });
        return;
      }

      // 통과 후 자동으로 다음 미완료 세트로 이동 (첫 통과 시에만). 반복 연습 중엔 현재 세트에 머묾.
      // leaveCurrentExercise로 이동 중(autoAdvance=false)엔 목적지를 호출자가 제어하므로 건너뜀.
      if (autoAdvance && result.attemptNumber === 1) {
        const nextCompletedSet = new Set(result.completedExerciseIds);
        const nextIndex = exercises.findIndex((item, index) => index > exerciseIndex && !nextCompletedSet.has(getExerciseId(item)));
        const fallbackIndex = exercises.findIndex(item => !nextCompletedSet.has(getExerciseId(item)));
        const targetIndex = nextIndex >= 0 ? nextIndex : fallbackIndex;
        if (targetIndex >= 0 && targetIndex !== exerciseIndex) {
          goToExercise(targetIndex);
        }
      }
    } catch (err) {
      console.error(err);
      setCompletionState({ error: err.message });
    } finally {
      setSaving(false);
    }
  };

  // 통과 가능 상태에서 다른 세트로 이동하려 할 때 광석을 놓치지 않도록 자동 통과 처리.
  // 미통과 작성 중 이동이면 초안만 보존하고 이동.
  const leaveCurrentExercise = async (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= exercises.length || nextIndex === exerciseIndex) return;
    // 통과 기준 만족 + 아직 이번 회차 보상이 남은 세트 → 자동으로 통과 처리 후 목적지로 이동.
    // autoAdvance=false 로 두어 markCurrentPassed가 다른 세트로 멋대로 보내지 않게 함.
    if (currentPassed && rewardStillAvailable && currentExerciseId && !saving && completionState !== 'processing') {
      await markCurrentPassed({ autoAdvance: false });
    }
    goToExercise(nextIndex);
  };

  const savePartialProgress = async () => {
    if (!user || !unitId) return;
    setSaving(true);
    try {
      const progressRef = doc(db, 'users', user.uid, 'learning_progress', unitId);
      const filteredAttempts = {};
      const filteredDrafts = {};
      currentExerciseIds.forEach((id) => {
        if (id && exerciseAttempts[id]) filteredAttempts[id] = exerciseAttempts[id];
        if (id && drafts[id]) filteredDrafts[id] = drafts[id];
      });
      // 현재 세트의 작성 코드도 초안에 포함 (방금 친 코드 보존)
      if (currentExerciseId && studentCode && !currentAlreadyCompleted) {
        filteredDrafts[currentExerciseId] = studentCode;
      }
      await setDoc(progressRef, {
        unitTitle: unitTitle || activeUnit?.title || '',
        codeTrace: {
          completed: false,
          completedExerciseIds: currentExerciseIds.filter(id => completedIds.has(id)),
          exerciseAttempts: filteredAttempts,
          drafts: filteredDrafts,
          completedExerciseCount: currentCompletedCount,
          totalExerciseCount: exercises.length,
          crystalsEarnedTotal,
          bestAccuracy: Math.max(learningProgress?.codeTrace?.bestAccuracy || 0, evaluation.accuracy || 0),
          lastExerciseId: exercise.id || exercise.docId,
          lastMode: mode,
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const completeCodeTrace = async (completedIdSet = completedIds) => {
    const completedExerciseIds = currentExerciseIds.filter(id => completedIdSet.has(id));
    const completedExerciseCount = completedExerciseIds.length;
    if (!user || completedExerciseCount < currentExerciseIds.length || completionState === 'processing') return;
    setCompletionState('processing');
    try {
      const today = getTodayKST();
      const userRef = doc(db, 'users', user.uid);
      const progressRef = doc(db, 'users', user.uid, 'learning_progress', unitId);
      const historyRef = doc(db, 'users', user.uid, 'history', `code_trace_${today}_${unitId}`);

      const result = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const progressSnap = await transaction.get(progressRef);
        const historySnap = await transaction.get(historyRef);
        if (!userSnap.exists()) throw new Error('User document not found');

        const freshUser = userSnap.data();
        const freshProgress = progressSnap.exists() ? progressSnap.data() : {};
        const alreadyRecordedToday = historySnap.exists();
        const freshAttemptsRaw = freshProgress?.codeTrace?.exerciseAttempts || {};
        const filteredAttempts = {};
        currentExerciseIds.forEach((id) => {
          if (id && freshAttemptsRaw[id]) filteredAttempts[id] = freshAttemptsRaw[id];
        });
        const nextCrystalsEarnedTotal = Number(freshProgress?.codeTrace?.crystalsEarnedTotal || crystalsEarnedTotal || 0);
        const streakCalc = calculateStreakUpdate(freshUser);
        const streakUpdates = streakCalc.streakUpdate || {};

        const userUpdates = {
          lastActive: serverTimestamp(),
          totalCodeTraces: (freshUser.totalCodeTraces || 0) + (alreadyRecordedToday ? 0 : 1),
          ...streakUpdates
        };

        if (Object.keys(streakUpdates).length > 0) {
          userUpdates.streakWriteAudit = buildStreakWriteAudit({
            source: 'code_trace_complete',
            writerUid: user.uid,
            prevState: freshUser,
            nextState: {
              currentStreak: streakUpdates.currentStreak,
              lastStreakDate: streakUpdates.lastStreakDate,
              streakFreezeCount: streakUpdates.streakFreezeCount,
            },
            writtenAt: serverTimestamp(),
            note: unitId,
          });
        }

        transaction.update(userRef, userUpdates);
        transaction.set(progressRef, {
          unitTitle: unitTitle || activeUnit?.title || '',
          codeTrace: {
            completed: true,
            completedAt: serverTimestamp(),
            completedExerciseIds,
            exerciseAttempts: filteredAttempts,
            completedExerciseCount,
            totalExerciseCount: exercises.length,
            crystalsEarnedTotal: nextCrystalsEarnedTotal,
            bestAccuracy: Math.max(freshProgress?.codeTrace?.bestAccuracy || 0, evaluation.accuracy || 0),
            updatedAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        }, { merge: true });

        transaction.set(historyRef, {
          type: 'code_trace',
          unitId,
          unitTitle: unitTitle || activeUnit?.title || '코드 따라쓰기',
          chapterId: activeUnit?.chapterId || '',
          clusterId: clusterId || 'python',
          score: evaluation.accuracy,
          accuracy: evaluation.accuracy,
          completedExerciseCount,
          totalExerciseCount: exercises.length,
          crystalsEarned: nextCrystalsEarnedTotal,
          timestamp: serverTimestamp()
        }, { merge: true });

        return { actualReward: 0, totalEarned: nextCrystalsEarnedTotal, streak: streakUpdates.currentStreak || streakCalc.meta?.newStreak || freshUser.currentStreak || 0 };
      });

      soundManager.playLevelUp();
      setCompletionState(result);
    } catch (err) {
      console.error(err);
      setCompletionState({ error: err.message });
    }
  };

  const answerCode = getModeCode(exercise, mode, visibleLines);
  const totalLines = normalizeNewlines(exercise.answerCode || '').split('\n').length;
  const visibleAnswerLineCount = Math.max(1, normalizeNewlines(answerCode || '').split('\n').length);
  const codePanelHeight = Math.min(
    CODE_PANEL_MAX_HEIGHT,
    Math.max(
      CODE_PANEL_MIN_HEIGHT,
      (visibleAnswerLineCount * CODE_PANEL_LINE_HEIGHT_PX) + CODE_PANEL_VERTICAL_PADDING_PX
    )
  );
  const preventAnswerCopy = (event) => {
    event.preventDefault();
  };
  const preventAnswerCopyShortcut = (event) => {
    if ((event.metaKey || event.ctrlKey) && ['a', 'c', 'x'].includes(String(event.key || '').toLowerCase())) {
      event.preventDefault();
    }
  };
  const handleStudentKeyDown = (event) => {
    if (event.key === 'Enter') {
      soundManager.playClick();
      setLinePulse({ id: Date.now(), count: lineCombo, enter: true });
      return;
    }
    if (event.key !== 'Tab') return;
    event.preventDefault();

    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const hasSelection = selectionStart !== selectionEnd;

    if (!hasSelection) {
      const nextValue = `${value.slice(0, selectionStart)}${STUDENT_INDENT}${value.slice(selectionEnd)}`;
      setStudentCode(nextValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart + STUDENT_INDENT.length;
        textarea.selectionEnd = selectionStart + STUDENT_INDENT.length;
      });
      return;
    }

    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const lineEndIndex = value.indexOf('\n', selectionEnd);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const selectedBlock = value.slice(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');

    if (event.shiftKey) {
      let removedBeforeSelection = 0;
      let removedTotal = 0;
      const outdented = lines.map((line, index) => {
        let removed = 0;
        let nextLine = line;
        if (nextLine.startsWith(STUDENT_INDENT)) {
          removed = STUDENT_INDENT.length;
          nextLine = nextLine.slice(STUDENT_INDENT.length);
        } else if (nextLine.startsWith('\t')) {
          removed = 1;
          nextLine = nextLine.slice(1);
        } else if (nextLine.startsWith(' ')) {
          removed = 1;
          nextLine = nextLine.slice(1);
        }
        if (index === 0) removedBeforeSelection = removed;
        removedTotal += removed;
        return nextLine;
      }).join('\n');

      const nextValue = `${value.slice(0, lineStart)}${outdented}${value.slice(lineEnd)}`;
      setStudentCode(nextValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = Math.max(lineStart, selectionStart - removedBeforeSelection);
        textarea.selectionEnd = Math.max(textarea.selectionStart, selectionEnd - removedTotal);
      });
      return;
    }

    const indented = lines.map(line => `${STUDENT_INDENT}${line}`).join('\n');
    const nextValue = `${value.slice(0, lineStart)}${indented}${value.slice(lineEnd)}`;
    setStudentCode(nextValue);
    requestAnimationFrame(() => {
      textarea.selectionStart = selectionStart + STUDENT_INDENT.length;
      textarea.selectionEnd = selectionEnd + (lines.length * STUDENT_INDENT.length);
    });
  };

  return (
    <div className="space-bg" style={{ minHeight: '100vh', overflowY: 'auto', padding: '1rem 1rem 4rem' }}>
      <style>{`
        @keyframes codeTraceLinePulse {
          0% { transform: translateY(4px); opacity: 0; filter: blur(2px); }
          30% { transform: translateY(0); opacity: 1; filter: blur(0); }
          100% { transform: translateY(-8px); opacity: 0; filter: blur(2px); }
        }
        @keyframes codeTraceCrystalFly {
          0% { transform: translate(-50%, 8px) scale(0.9); opacity: 0; }
          20% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -72px) scale(1.08); opacity: 0; }
        }
        @keyframes codeTracePassGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(34,197,94,0); }
          50% { box-shadow: 0 0 24px rgba(34,197,94,0.35); }
        }
      `}</style>
      <div style={{ maxWidth: 1220, margin: '0 auto' }}>
        <button className="space-nav-link font-tech" onClick={onClose} style={{ marginBottom: '1rem' }}>
          <ChevronLeft size={16} /> RETURN TO MISSION CONTROL
        </button>

        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 className="font-title" style={{ color: 'var(--crystal-cyan)', margin: 0, fontSize: '1.8rem' }}>CODE TRACE: {unitTitle || activeUnit?.title}</h1>
            <p className="font-tech" style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
              DATA LOG의 정답 코드를 손으로 따라 쓰며 문법 패턴을 익힙니다.
            </p>
          </div>
          <button className="hud-btn secondary glass" onClick={savePartialProgress} disabled={saving}>
            <Save size={16} /> 오늘은 여기까지
          </button>
        </header>

        <div className="glass-card hud-border" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {exerciseIndex + 1} / {exercises.length} · {exercise.category} · Level {exercise.level}
              </div>
              <h2 style={{ margin: '0.35rem 0', color: 'var(--text-bright)' }}>{exercise.title}</h2>
              <p className="font-tech" style={{ color: 'var(--text-muted)', margin: 0 }}>{exercise.prompt}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['recall', 'line'].map(item => (
                <button
                  key={item}
                  className={`hud-btn ${mode === item ? 'primary' : 'secondary'} glass`}
                  onClick={() => changeMode(item)}
                  style={{ padding: '0.55rem 0.8rem' }}
                >
                  {item === 'line' ? '한 줄씩' : '가리고 쓰기'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 세트 스텝퍼 — 각 세트의 진행 상황과 연습 횟수를 한눈에. 클릭하여 자유롭게 이동 */}
        <div className="glass-card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.25rem' }}>세트</span>
          {exercises.map((item, index) => {
            const id = getExerciseId(item);
            const isCurrent = index === exerciseIndex;
            const isDone = id && completedIds.has(id);
            const attempts = Number(exerciseAttempts[id] || 0);
            const lineCount = normalizeNewlines(item?.answerCode || '').split('\n').length;
            return (
              <button
                key={id || index}
                onClick={() => { leaveCurrentExercise(index); }}
                className="font-tech"
                title={`${item?.title || `${index + 1}번`} · ${lineCount}줄${attempts > 0 ? ` · ${attempts}회 연습` : ''}`}
                style={{
                  minWidth: 36,
                  padding: '0.35rem 0.55rem',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  background: isCurrent
                    ? 'rgba(0,243,255,0.18)'
                    : isDone
                      ? 'rgba(34,197,94,0.12)'
                      : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isCurrent ? 'rgba(0,243,255,0.55)' : isDone ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: isCurrent ? 'var(--crystal-cyan)' : isDone ? '#22c55e' : 'var(--text-muted)',
                  boxShadow: isCurrent ? '0 0 12px rgba(0,243,255,0.25)' : 'none'
                }}
              >
                <span>{index + 1}</span>
                {isDone && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                {attempts > 1 && <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>×{attempts}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem' }}>
          <section className="glass-card" style={{ padding: '1rem', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="font-title" style={{ margin: 0, color: 'var(--planet-green)' }}>정답 코드</h3>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {mode === 'line' && (
                  <button className="hud-btn secondary glass" onClick={() => setVisibleLines(v => Math.min(totalLines, v + 1))} style={{ padding: '0.45rem 0.7rem' }}>
                    다음 줄
                  </button>
                )}
                {answerVisible ? (
                  <span className="font-tech" style={{ color: 'var(--text-muted)', padding: '0.45rem 0.2rem', fontSize: '0.82rem' }}>
                    자동 가림 {revealSeconds}s
                  </span>
                ) : (
                  <button className="hud-btn secondary glass" onClick={revealAnswer} style={{ padding: '0.45rem 0.7rem' }}>
                    <Eye size={15} /> 보이기 30초
                  </button>
                )}
              </div>
            </div>
            <pre
              tabIndex={0}
              onCopy={preventAnswerCopy}
              onCut={preventAnswerCopy}
              onPaste={preventAnswerCopy}
              onContextMenu={preventAnswerCopy}
              onSelect={preventAnswerCopy}
              onKeyDown={preventAnswerCopyShortcut}
              style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%', height: codePanelHeight, minHeight: CODE_PANEL_MIN_HEIGHT, maxHeight: CODE_PANEL_MAX_HEIGHT, margin: 0, padding: '1rem', borderRadius: 10, background: '#020617', color: '#e5e7eb', overflow: 'auto', whiteSpace: 'pre', filter: answerVisible ? 'none' : 'blur(5px)', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', fontSize: '0.92rem', lineHeight: 1.55 }}
            >
              {answerCode}
            </pre>
          </section>

          <section className="glass-card" style={{ padding: '1rem', minWidth: 0, position: 'relative' }}>
            <h3 className="font-title" style={{ margin: '0 0 0.75rem', color: 'var(--crystal-cyan)' }}>학생 입력</h3>
            {linePulse && (
              <div
                key={linePulse.id}
                className="font-tech"
                style={{
                  position: 'absolute',
                  right: '1.2rem',
                  top: '3.05rem',
                  zIndex: 2,
                  color: linePulse.enter ? 'var(--crystal-cyan)' : '#22c55e',
                  background: 'rgba(2,6,23,0.82)',
                  border: `1px solid ${linePulse.enter ? 'rgba(0,243,255,0.28)' : 'rgba(34,197,94,0.3)'}`,
                  borderRadius: 999,
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  animation: 'codeTraceLinePulse 1.1s ease-out forwards',
                  pointerEvents: 'none'
                }}
              >
                {linePulse.enter ? '라인 입력' : `${linePulse.count}줄 콤보`}
              </div>
            )}
            <textarea
              value={studentCode}
              onChange={e => setStudentCode(e.target.value)}
              onKeyDown={handleStudentKeyDown}
              spellCheck={false}
              wrap="off"
              placeholder="코드를 따라 쓰세요."
              style={{ boxSizing: 'border-box', display: 'block', width: '100%', maxWidth: '100%', height: codePanelHeight, minHeight: CODE_PANEL_MIN_HEIGHT, maxHeight: CODE_PANEL_MAX_HEIGHT, resize: 'vertical', background: '#020617', color: '#f8fafc', border: currentPassed ? '1px solid rgba(34,197,94,0.55)' : '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '1rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.92rem', lineHeight: 1.55, tabSize: 2, overflow: 'auto', whiteSpace: 'pre', animation: currentPassed ? 'codeTracePassGlow 1.6s ease-in-out infinite' : 'none' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', position: 'relative' }}>
              {rewardBurst && (
                <div
                  key={rewardBurst.id}
                  className="font-tech"
                  style={{
                    position: 'absolute',
                    left: '8rem',
                    top: '-0.35rem',
                    zIndex: 3,
                    color: 'var(--star-gold)',
                    fontWeight: 'bold',
                    textShadow: '0 0 14px rgba(251,191,36,0.75)',
                    animation: 'codeTraceCrystalFly 1.1s ease-out forwards',
                    pointerEvents: 'none'
                  }}
                >
                  +{rewardBurst.amount} 광석{rewardBurst.attempt ? ` (${rewardBurst.attempt}회차)` : ''}
                </div>
              )}
              <button className="hud-btn primary glass" onClick={markCurrentPassed} disabled={!currentPassed || completionState === 'processing' || saving}>
                <Check size={16} /> {
                  currentPassed
                    ? (rewardStillAvailable
                      ? `통과하고 +${rawRewardForNextPass}광석${nextAttemptNumber > 1 ? ` (${nextAttemptNumber}회차)` : ''} 획득`
                      : (currentAttemptCount > 0 ? '다시 통과하기 · 보상 완료' : `통과 기준 ${passingAccuracy}%`))
                    : `통과 기준 ${passingAccuracy}%`
                }
              </button>
              <button className="hud-btn secondary glass" onClick={() => {
                setHintIndex(i => i + 1);
              }}>
                <Lightbulb size={16} /> 힌트
              </button>
              <button className="hud-btn secondary glass" onClick={resetExercise}>
                <RotateCcw size={16} /> 초기화
              </button>
            </div>
          </section>
        </div>

        <section className="glass-card" style={{ padding: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              ['정확도', `${evaluation.accuracy}%`],
              ['맞은 줄', `${evaluation.correctLines}/${evaluation.totalLines}`],
              ['라인 콤보', `${lineCombo}/${evaluation.totalLines}`],
              ['연습', currentAttemptCount > 0 ? `${currentAttemptCount}회` : '—'],
              ['획득 광석', `${crystalsEarnedTotal}`],
              ['완료', `${currentCompletedCount}/${exercises.length}`]
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.85rem' }}>
                <strong style={{ display: 'block', color: 'var(--text-bright)', fontSize: '1.25rem' }}>{value}</strong>
                <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</span>
              </div>
            ))}
          </div>

          {hint && hintIndex > 0 && (
            <div className="font-tech" style={{ borderLeft: '3px solid var(--crystal-cyan)', background: 'rgba(0,243,255,0.08)', padding: '0.8rem', marginBottom: '1rem', color: '#dbeafe' }}>
              {hint}
            </div>
          )}

          <div className="font-tech" style={{ color: currentPassed ? 'var(--planet-green)' : 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {currentPassed
              ? (rewardStillAvailable
                ? (willCompleteOnPass
                  ? `마지막 세트입니다. 통과하면 +${rawRewardForNextPass}광석을 받고 CODE TRACE가 완료됩니다.`
                  : `통과 기준을 만족했습니다. 지금 +${rawRewardForNextPass}광석을 받을 수 있습니다.`)
                : (currentAttemptCount > 0
                  ? `이미 ${currentAttemptCount}회 통과했습니다. 다시 연습해도 광석은 더 나오지 않지만, 코드 감각을 익히는 데 도움이 됩니다.`
                  : `통과 기준: 정확도 ${passingAccuracy}% 이상`))
              : `통과 기준: 정확도 ${passingAccuracy}% 이상`}
          </div>

          {!currentPassed && (
            <ul className="font-tech" style={{ color: '#d1d5db', margin: 0, paddingLeft: '1.2rem' }}>
              {evaluation.issues.map((issue, index) => <li key={index}>{issue}</li>)}
            </ul>
          )}
        </section>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="hud-btn secondary glass" disabled={!canGoPrev || saving} onClick={() => leaveCurrentExercise(exerciseIndex - 1)}>
            <ChevronLeft size={16} /> 이전 코드
          </button>
          {allCompleted && !completionState && !unitAlreadyCompleted ? (
            <button className="hud-btn primary glass" onClick={completeCodeTrace} disabled={completionState === 'processing'}>
              <Check size={17} /> 완료 기록 마무리
            </button>
          ) : null}
          <button className="hud-btn secondary glass" disabled={!canGoNext || saving} onClick={() => leaveCurrentExercise(exerciseIndex + 1)}>
            다음 코드 <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        {hasIncomplete && canMoveToIncompleteCode && !allCompleted && !completionState && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
            <button className="hud-btn primary glass" disabled={saving} onClick={() => leaveCurrentExercise(nextIncompleteIndex)}>
              {hasIncompleteElsewhere ? '미통과 코드로 건너뛰기' : '미통과 코드로 이동'}
            </button>
          </div>
        )}

        {completionState && completionState !== 'processing' && (
          <div className="glass-card hud-border" style={{ marginTop: '1rem', padding: '1rem', textAlign: 'center' }}>
            {completionState.error ? (
              <p className="font-tech" style={{ color: 'var(--alert-red)' }}>{completionState.error}</p>
            ) : (
              <>
                <h3 className="font-title" style={{ color: 'var(--planet-green)', marginTop: 0 }}>CODE TRACE 완료</h3>
                <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
                  정확도 {completionState.accuracy || evaluation.accuracy}% · 이번 세트 +{completionState.actualReward || 0} 광석 · 누적 {completionState.totalEarned ?? crystalsEarnedTotal}광석
                </p>
                <button className="hud-btn primary glass" onClick={onClose}>미션 컨트롤로 돌아가기</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
