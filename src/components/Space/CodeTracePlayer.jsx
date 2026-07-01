import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, ChevronLeft, Eye, Lightbulb, RotateCcw, Save } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { buildStreakWriteAudit, calculateStreakUpdate, getTodayKST } from '../../utils/streakUtils';
import { calculateGrowthUpdates } from '../../utils/rankingUtils';
import { recordCrystalTransaction } from '../../utils/crystalLedger';
import soundManager from '../../utils/SoundManager';

const ANSWER_REVEAL_SECONDS = 30;
const STUDENT_INDENT = '  ';

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
  const [hintsUsed, setHintsUsed] = useState(0);
  const [completedIds, setCompletedIds] = useState(() => new Set(learningProgress?.codeTrace?.completedExerciseIds || []));
  const [completionState, setCompletionState] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedIds = learningProgress?.codeTrace?.completedExerciseIds;
    if (Array.isArray(savedIds)) {
      setCompletedIds(new Set(savedIds));
    }
  }, [learningProgress?.codeTrace?.completedExerciseIds]);

  const exercise = exercises[exerciseIndex] || null;
  const evaluation = useMemo(
    () => evaluateCode(exercise?.answerCode || '', studentCode),
    [exercise, studentCode]
  );
  const passingAccuracy = exercise?.passingAccuracy || 95;
  const currentPassed = evaluation.perfect || evaluation.accuracy >= passingAccuracy;
  const currentExerciseIds = useMemo(() => exercises.map(item => item.id || item.docId).filter(Boolean), [exercises]);
  const currentCompletedCount = useMemo(
    () => currentExerciseIds.filter(id => completedIds.has(id)).length,
    [currentExerciseIds, completedIds]
  );
  const allCompleted = currentExerciseIds.length > 0 && currentCompletedCount >= currentExerciseIds.length;
  const hint = exercise?.hints?.[Math.min(hintIndex, Math.max(0, (exercise?.hints?.length || 1) - 1))] || '';
  const currentExerciseId = exercise?.id || exercise?.docId;
  const estimatedReward = Math.max(10, Math.min(40, 20 + Math.round(evaluation.accuracy / 10) - Math.min(10, hintsUsed * 2)));
  const unitAlreadyCompleted = !!learningProgress?.codeTrace?.completed;
  const currentAlreadyCompleted = !!currentExerciseId && completedIds.has(currentExerciseId);
  const willCompleteOnPass = !unitAlreadyCompleted && currentPassed && currentExerciseId && !currentAlreadyCompleted && currentCompletedCount + 1 >= currentExerciseIds.length;

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

  const resetExercise = () => {
    setStudentCode('');
    setVisibleLines(1);
    setHintIndex(0);
    setHintsUsed(0);
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setVisibleLines(1);
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
    setStudentCode('');
    setHintIndex(0);
    setHintsUsed(0);
  };

  const revealAnswer = () => {
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
  };

  const markCurrentPassed = async () => {
    if (!currentPassed) return;
    const next = new Set(completedIds);
    next.add(currentExerciseId);
    setCompletedIds(next);

    const nextCompletedCount = currentExerciseIds.filter(id => next.has(id)).length;
    if (nextCompletedCount >= currentExerciseIds.length) {
      await completeCodeTrace(next);
    } else {
      soundManager.playCorrect();
    }
  };

  const savePartialProgress = async () => {
    if (!user || !unitId) return;
    setSaving(true);
    try {
      const progressRef = doc(db, 'users', user.uid, 'learning_progress', unitId);
      await setDoc(progressRef, {
        unitTitle: unitTitle || activeUnit?.title || '',
        codeTrace: {
          completed: false,
          completedExerciseIds: currentExerciseIds.filter(id => completedIds.has(id)),
          completedExerciseCount: currentCompletedCount,
          totalExerciseCount: exercises.length,
          bestAccuracy: Math.max(learningProgress?.codeTrace?.bestAccuracy || 0, evaluation.accuracy || 0),
          hintCount: (learningProgress?.codeTrace?.hintCount || 0) + hintsUsed,
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
      const reward = estimatedReward;
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
        const wasCompleted = !!freshProgress?.codeTrace?.completed;
        const alreadyRecordedToday = historySnap.exists();
        const actualReward = wasCompleted ? 0 : reward;
        const streakCalc = calculateStreakUpdate(freshUser);
        const streakUpdates = streakCalc.streakUpdate || {};

        const userUpdates = {
          lastActive: serverTimestamp(),
          totalCodeTraces: (freshUser.totalCodeTraces || 0) + (alreadyRecordedToday ? 0 : 1),
          ...streakUpdates
        };

        if (actualReward > 0) {
          userUpdates.crystals = (freshUser.crystals || 0) + actualReward;
          Object.assign(userUpdates, calculateGrowthUpdates(freshUser, actualReward));
        }

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
            completedExerciseCount,
            totalExerciseCount: exercises.length,
            bestAccuracy: Math.max(freshProgress?.codeTrace?.bestAccuracy || 0, evaluation.accuracy || 0),
            hintCount: (freshProgress?.codeTrace?.hintCount || 0) + hintsUsed,
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
          hintCount: hintsUsed,
          crystalsEarned: actualReward,
          timestamp: serverTimestamp()
        }, { merge: true });

        if (actualReward > 0) {
          recordCrystalTransaction(user.uid, {
            amount: actualReward,
            type: 'code_trace_reward',
            description: `${unitTitle || activeUnit?.title || '코드 따라쓰기'} 완료`,
            metadata: {
              unitId,
              unitTitle: unitTitle || activeUnit?.title || '',
              accuracy: evaluation.accuracy,
              completedExerciseCount,
              totalExerciseCount: exercises.length
            }
          }, transaction, `code_trace_${unitId}`);
        }

        return { actualReward, streak: streakUpdates.currentStreak || streakCalc.meta?.newStreak || freshUser.currentStreak || 0 };
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
  const preventAnswerCopy = (event) => {
    event.preventDefault();
  };
  const preventAnswerCopyShortcut = (event) => {
    if ((event.metaKey || event.ctrlKey) && ['a', 'c', 'x'].includes(String(event.key || '').toLowerCase())) {
      event.preventDefault();
    }
  };
  const handleStudentKeyDown = (event) => {
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
              style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%', minHeight: 300, margin: 0, padding: '1rem', borderRadius: 10, background: '#020617', color: '#e5e7eb', overflow: 'auto', whiteSpace: 'pre', filter: answerVisible ? 'none' : 'blur(5px)', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', fontSize: '0.92rem', lineHeight: 1.55 }}
            >
              {answerCode}
            </pre>
          </section>

          <section className="glass-card" style={{ padding: '1rem', minWidth: 0 }}>
            <h3 className="font-title" style={{ margin: '0 0 0.75rem', color: 'var(--crystal-cyan)' }}>학생 입력</h3>
            <textarea
              value={studentCode}
              onChange={e => setStudentCode(e.target.value)}
              onKeyDown={handleStudentKeyDown}
              spellCheck={false}
              wrap="off"
              placeholder="코드를 따라 쓰세요."
              style={{ boxSizing: 'border-box', display: 'block', width: '100%', maxWidth: '100%', minHeight: 300, resize: 'vertical', background: '#020617', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '1rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.92rem', lineHeight: 1.55, tabSize: 2, overflow: 'auto', whiteSpace: 'pre' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button className="hud-btn primary glass" onClick={markCurrentPassed} disabled={!currentPassed || currentAlreadyCompleted || completionState === 'processing'}>
                <Check size={16} /> {currentAlreadyCompleted ? '통과 기록됨' : (willCompleteOnPass ? `통과 기록하고 ${estimatedReward}광석 받기` : '통과 기록')}
              </button>
              <button className="hud-btn secondary glass" onClick={() => {
                setHintIndex(i => i + 1);
                setHintsUsed(c => c + 1);
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
              ['힌트', `${hintsUsed}`],
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
              ? (willCompleteOnPass ? `${estimatedReward}광석 완료 보상을 받을 수 있습니다.` : '통과 기준을 만족했습니다. 통과 기록을 누르세요.')
              : `통과 기준: 정확도 ${passingAccuracy}% 이상`}
          </div>

          {!currentPassed && (
            <ul className="font-tech" style={{ color: '#d1d5db', margin: 0, paddingLeft: '1.2rem' }}>
              {evaluation.issues.map((issue, index) => <li key={index}>{issue}</li>)}
            </ul>
          )}
        </section>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button className="hud-btn secondary glass" disabled={exerciseIndex === 0} onClick={() => {
            setExerciseIndex(i => Math.max(0, i - 1));
            resetExercise();
          }}>
            이전 코드
          </button>
          {allCompleted && !completionState && !unitAlreadyCompleted ? (
            <motion.button whileHover={{ scale: 1.03 }} className="hud-btn primary glass" onClick={completeCodeTrace} disabled={completionState === 'processing'}>
              <Check size={17} /> 완료 보상 {estimatedReward}광석 받기
            </motion.button>
          ) : !allCompleted ? (
            <button className="hud-btn primary glass" disabled={exerciseIndex >= exercises.length - 1} onClick={() => {
              setExerciseIndex(i => Math.min(exercises.length - 1, i + 1));
              resetExercise();
            }}>
              다음 코드
            </button>
          ) : null}
        </div>

        {completionState && completionState !== 'processing' && (
          <div className="glass-card hud-border" style={{ marginTop: '1rem', padding: '1rem', textAlign: 'center' }}>
            {completionState.error ? (
              <p className="font-tech" style={{ color: 'var(--alert-red)' }}>{completionState.error}</p>
            ) : (
              <>
                <h3 className="font-title" style={{ color: 'var(--planet-green)', marginTop: 0 }}>CODE TRACE 완료</h3>
                <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
                  정확도 {evaluation.accuracy}% · +{completionState.actualReward || 0} 광석 · 연속 {completionState.streak || 0}일
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
