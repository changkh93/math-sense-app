import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { deleteField, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import soundManager from '../../utils/SoundManager';
import MathKeypad from './MathKeypad';
import WorkbookInteraction from './WorkbookInteraction';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { createParticleBurst, shakeScreen } from './ParticleEffects';
import { parseInlineFormatting } from '../../utils/formatUtils';
import { auth, db } from '../../firebase';
import { areElementaryAnswersEquivalent, splitFractionDisplayValue } from '../../utils/elementaryMathAnswer';
import { shuffleWorkbookOptions } from '../../utils/workbookOptionUtils';
import {
  WORKBOOK_GRADABLE_TYPES,
  WORKBOOK_INTERACTION_TYPES,
  evaluateWorkbookInteraction,
  getAdaptiveWorkbookHint,
  getInitialWorkbookInteractionResponse,
} from '../../utils/workbookInteractionUtils';
import 'katex/dist/katex.min.css';
import StarField from './StarField';
import './WorkbookPlayer.css';

const WorkbookGradeMark = ({ isCorrect }) => (
  <svg className={`workbook-grade-mark ${isCorrect ? 'correct' : 'wrong'}`} viewBox="0 0 100 100" aria-label={isCorrect ? '정답' : '오답'}>
    {isCorrect
      ? <ellipse cx="50" cy="50" rx="43" ry="38" fill="none" stroke="currentColor" strokeWidth="7" />
      : <line x1="76" y1="12" x2="24" y2="88" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />}
  </svg>
);

const WorkbookAnswerDisplay = ({ value, inputMode }) => {
  const fraction = splitFractionDisplayValue(value, inputMode);
  if (!fraction) return <span className="workbook-answer-text">{value}</span>;
  return (
    <span className="workbook-fraction-value" aria-label={value}>
      {fraction.whole && <span>{fraction.whole}</span>}
      <span className="workbook-fraction-stack">
        <span>{fraction.numerator || '□'}</span>
        <span>{fraction.denominator || '□'}</span>
      </span>
    </span>
  );
};

const getElementHint = (element, studentProfile, retryCount) => {
  if (WORKBOOK_INTERACTION_TYPES.has(element?.type)) {
    return getAdaptiveWorkbookHint(element, studentProfile, retryCount);
  }
  if (element?.hint) return element.hint;
  if (element?.inputMode === 'fraction') return '분자는 위 칸, 분모는 아래 칸에 들어갈 수를 다시 확인해 보세요.';
  if (element?.inputMode === 'mixed-number') return '자연수 부분과 분수 부분을 나누어 생각해 보세요.';
  if (element?.inputMode === 'expression') return '계산 결과가 아니라 문제 상황을 나타내는 식을 묻는지 확인해 보세요.';
  return '문제에서 구하라고 한 값과 입력한 단위를 다시 확인해 보세요.';
};

const serializeWorkbookResponse = (value) => {
  if (typeof value === 'string') return value.slice(0, 500);
  try { return JSON.stringify(value ?? '').slice(0, 2000); } catch { return ''; }
};

const WorkbookPlayer = ({ pages, unitId, unitTitle, studentProfile = {}, onComplete, onClose, previewMode = false }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { id: value }
  const [checkedElements, setCheckedElements] = useState({}); // { id: { isCorrect, isChecked } }
  const [checkedPages, setCheckedPages] = useState({}); // { pageIndex: true }
  
  const [activeInputId, setActiveInputId] = useState(null);
  const [showKeypad, setShowKeypad] = useState(false);
  const [isResultMode, setIsResultMode] = useState(false);
  const [inputMode, setInputMode] = useState('math'); // 'math' or 'native'
  const [floatingMarkers, setFloatingMarkers] = useState([]); // { id, text, type, x, y }
  const [sessionCrystals, setSessionCrystals] = useState(0);
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState({}); // { elId: [shuffledArray] }
  const [attemptCounts, setAttemptCounts] = useState({});
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState({});
  const [wrongAnswerHistory, setWrongAnswerHistory] = useState({});
  const [visibleHints, setVisibleHints] = useState({});
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [savingPause, setSavingPause] = useState(false);
  const [pauseError, setPauseError] = useState('');
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const inputRefs = React.useRef({});
  const autosaveTimerRef = useRef(null);

  const currentPage = pages[currentPageIndex];
  const workbookSignature = useMemo(() => (pages || []).map(page => page.id).join('|'), [pages]);
  const progressStorageKey = useMemo(() => {
    const uid = auth.currentUser?.uid || 'anonymous';
    return `smart_workbook_progress_v2_${uid}_${unitId || 'unknown'}`;
  }, [unitId]);

  useEffect(() => {
    if (previewMode) {
      setProgressHydrated(true);
      return undefined;
    }
    let cancelled = false;
    setProgressHydrated(false);

    const applySession = (session) => {
      if (!session || session.workbookSignature !== workbookSignature) return false;
      setCurrentPageIndex(Math.min(Math.max(0, Number(session.currentPageIndex) || 0), Math.max(0, pages.length - 1)));
      setAnswers(session.answers || {});
      setCheckedElements(session.checkedElements || {});
      setCheckedPages(session.checkedPages || {});
      setAttemptCounts(session.attemptCounts || {});
      setFirstAttemptCorrect(session.firstAttemptCorrect || {});
      setWrongAnswerHistory(session.wrongAnswerHistory || {});
      setSessionCrystals(Math.max(0, Number(session.sessionCrystals) || 0));
      return true;
    };

    const hydrate = async () => {
      let localSession = null;
      let serverSession = null;
      try {
        localSession = JSON.parse(localStorage.getItem(progressStorageKey) || 'null');
      } catch { /* ignore malformed local progress */ }

      const uid = auth.currentUser?.uid;
      if (uid && unitId) {
        try {
          const snap = await getDoc(doc(db, 'users', uid, 'learning_progress', unitId));
          if (snap.exists()) serverSession = snap.data()?.workbookSession || null;
        } catch (error) {
          console.warn('Workbook progress restore failed; using local progress.', error);
        }
      }
      if (cancelled) return false;
      const latestSession = [localSession, serverSession]
        .filter(session => session?.workbookSignature === workbookSignature)
        .sort((a, b) => Number(b.savedAtMs || 0) - Number(a.savedAtMs || 0))[0];
      const restored = applySession(latestSession);
      setProgressHydrated(true);
      return restored;
    };

    hydrate();
    return () => { cancelled = true; };
  }, [previewMode, progressStorageKey, unitId, workbookSignature, pages.length]);

  useEffect(() => {
    if (previewMode || !progressHydrated || !unitId || isResultMode) return undefined;
    const session = {
      schemaVersion: 1,
      workbookSignature,
      currentPageIndex,
      answers,
      checkedElements,
      checkedPages,
      attemptCounts,
      firstAttemptCorrect,
      wrongAnswerHistory,
      sessionCrystals,
      savedAtMs: Date.now(),
    };
    localStorage.setItem(progressStorageKey, JSON.stringify(session));
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        await setDoc(doc(db, 'users', uid, 'learning_progress', unitId), {
          workbookSession: session,
          workbookSessionUpdatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.warn('Workbook server autosave failed; local progress is preserved.', error);
      }
    }, 700);
    return () => clearTimeout(autosaveTimerRef.current);
  }, [answers, attemptCounts, checkedElements, checkedPages, currentPageIndex, firstAttemptCorrect, isResultMode, previewMode, progressHydrated, progressStorageKey, sessionCrystals, unitId, workbookSignature, wrongAnswerHistory]);

  const handlePauseWorkbook = async () => {
    if (savingPause) return;
    if (previewMode) {
      onClose();
      return;
    }

    const session = {
      schemaVersion: 1,
      workbookSignature,
      currentPageIndex,
      answers,
      checkedElements,
      checkedPages,
      attemptCounts,
      firstAttemptCorrect,
      wrongAnswerHistory,
      sessionCrystals,
      savedAtMs: Date.now(),
    };

    setSavingPause(true);
    setPauseError('');
    clearTimeout(autosaveTimerRef.current);
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(session));
      const uid = auth.currentUser?.uid;
      if (uid && unitId) {
        await setDoc(doc(db, 'users', uid, 'learning_progress', unitId), {
          workbookSession: session,
          workbookSessionUpdatedAt: serverTimestamp(),
        }, { merge: true });
      }
      soundManager.playClick();
      onClose();
    } catch (error) {
      console.error('Workbook pause save failed', error);
      setPauseError('서버 저장에 실패했습니다. 이 기기의 진행 기록은 유지됩니다. 다시 시도해주세요.');
    } finally {
      setSavingPause(false);
    }
  };

  const checkAnswer = (inputId, element) => {
    const userVal = answers[inputId] || '';
    if (WORKBOOK_INTERACTION_TYPES.has(element.type)) {
      return evaluateWorkbookInteraction(element, answers[inputId] ?? getInitialWorkbookInteractionResponse(element));
    }
    const accepted = [element.answer, ...(element.acceptedAnswers || [])];
    return accepted.some(expected => areElementaryAnswersEquivalent(userVal, expected, element));
  };

  const handleInputActivate = (el, e) => {
    if ((checkedPages[currentPageIndex] && checkedElements[el.id]?.isCorrect) || isResultMode) return;
    const target = e?.currentTarget || e?.target;
    setActiveInputId(el.id);
    
    // Auto-scroll logic to bring the activated input into view above the keypad
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }, 180);
    }

    if (inputMode === 'math') {
      setShowKeypad(true);
    }
    soundManager.playClick();
  };

  const handleKeypadChange = (newValue) => {
    if (!activeInputId || checkedElements[activeInputId]?.isCorrect) return;
    setAnswers(prev => ({ ...prev, [activeInputId]: String(newValue ?? '').slice(0, 80) }));
  };

  const handleInteractionChange = (element, newValue) => {
    if (checkedElements[element.id]?.isCorrect || isResultMode) return;
    setAnswers(prev => ({ ...prev, [element.id]: newValue }));
  };

  const addMarker = (text, type, x, y) => {
    const id = Date.now() + Math.random();
    setFloatingMarkers(prev => [...prev, { id, text, type, x, y }]);
    setTimeout(() => {
      setFloatingMarkers(prev => prev.filter(m => m.id !== id));
    }, 2000);
  };

  const handleCheckPage = (e) => {
    if (checkedPages[currentPageIndex]) return;

    let localCorrect = 0;
    let localWrong = 0;
    let anyWrong = false;
    const newCheckedElements = { ...checkedElements };
    const rect = e.currentTarget.getBoundingClientRect();
    const pageAttempt = (attemptCounts[currentPageIndex] || 0) + 1;

    // Check all inputs on current page
    currentPage.elements.forEach((el, idx) => {
      if (WORKBOOK_GRADABLE_TYPES.has(el.type)) {
        if (newCheckedElements[el.id]?.isCorrect) return;
        const isCorrect = checkAnswer(el.id, el);
        newCheckedElements[el.id] = { isCorrect, isChecked: true };
        if (pageAttempt === 1) {
          setFirstAttemptCorrect(prev => ({ ...prev, [el.id]: isCorrect }));
        }
        if (!isCorrect) {
          setWrongAnswerHistory(prev => ({
            ...prev,
            [el.id]: [...(prev[el.id] || []), serializeWorkbookResponse(answers[el.id])].slice(-5),
          }));
        }

        // Play particle effect roughly at center of button or random area
        const pX = rect.left + rect.width / 2 + (Math.random() * 40 - 20);
        const pY = rect.top + (Math.random() * 40 - 20);

        if (isCorrect) {
          localCorrect++;
          setTimeout(() => {
            soundManager.playCorrect();
            createParticleBurst(pX, pY, 'star');
            addMarker(`+1`, 'gain', pX, pY);
          }, idx * 150); // wrap in slight stagger
        } else {
           localWrong++;
           anyWrong = true;
           setTimeout(() => {
             soundManager.playWrong();
             createParticleBurst(pX, pY, 'wrong');
             addMarker(`-2`, 'loss', pX, pY);
           }, idx * 150);
        }
      }
    });

    if (anyWrong) {
        shakeScreen(300);
    }

    setSessionCrystals(prev => Math.max(0, prev + (localCorrect * 1) - (localWrong * 2)));

    setCheckedElements(newCheckedElements);
    setCheckedPages(prev => ({ ...prev, [currentPageIndex]: true }));
    setAttemptCounts(prev => ({ ...prev, [currentPageIndex]: pageAttempt }));
    setActiveInputId(null);
    setShowKeypad(false);
  };

  const handleRetryPage = () => {
    const nextChecked = { ...checkedElements };
    currentPage.elements.forEach((element) => {
      if (nextChecked[element.id]?.isChecked && !nextChecked[element.id]?.isCorrect) delete nextChecked[element.id];
    });
    setCheckedElements(nextChecked);
    setCheckedPages(prev => ({ ...prev, [currentPageIndex]: false }));
    setVisibleHints({});
    setActiveInputId(null);
    setShowKeypad(false);
    soundManager.playClick();
  };

  const handleSubmitFinal = () => {
    soundManager.playClick();
    setIsResultMode(true);
  };

  const completeWorkbook = async () => {
    if (savingCompletion) return;
    let globalCorrect = 0;
    let globalTotalInputs = 0;

    pages.forEach(page => {
      page.elements.forEach(el => {
        if (WORKBOOK_GRADABLE_TYPES.has(el.type)) {
          globalTotalInputs++;
          if (checkedElements[el.id]?.isCorrect) {
            globalCorrect++;
          }
        }
      });
    });

    const score100 = globalTotalInputs === 0 ? 100 : Math.round((globalCorrect / globalTotalInputs) * 100);
    const isPerfect = (globalCorrect === globalTotalInputs) && globalTotalInputs > 0;
    const finalCrystals = sessionCrystals + (isPerfect ? 10 : 0);

    const workbookResponses = pages.flatMap((page, pageIndex) => page.elements
      .filter(element => WORKBOOK_GRADABLE_TYPES.has(element.type))
      .map(element => ({
        pageId: page.id,
        pageIndex,
        elementId: element.id,
        inputMode: element.inputMode || (element.type === 'multiple-choice' ? 'choice' : 'text'),
        firstAttemptCorrect: firstAttemptCorrect[element.id] === true,
        attemptCount: Math.max(1, attemptCounts[pageIndex] || 1),
        wrongAnswers: wrongAnswerHistory[element.id] || [],
        finalAnswer: serializeWorkbookResponse(answers[element.id]),
        interactionType: WORKBOOK_INTERACTION_TYPES.has(element.type) ? element.type : null,
        isCorrect: checkedElements[element.id]?.isCorrect === true,
      }))).slice(0, 500);

    setSavingCompletion(true);
    setCompletionError('');
    try {
      const outcome = await onComplete({
        score: score100,
        totalCount: globalTotalInputs,
        correctCount: globalCorrect,
        isPerfect: isPerfect,
        crystalsEarned: finalCrystals,
        type: 'workbook',
        attemptCount: Math.max(1, ...Object.values(attemptCounts).map(Number)),
        workbookResponses,
      });
      if (outcome?.ok === false) throw outcome.error || new Error('결과 저장에 실패했습니다.');
      localStorage.removeItem(progressStorageKey);
      const uid = auth.currentUser?.uid;
      if (uid && unitId) {
        await setDoc(doc(db, 'users', uid, 'learning_progress', unitId), {
          workbookSession: deleteField(),
          workbookSessionUpdatedAt: serverTimestamp(),
        }, { merge: true });
      }
      soundManager.playWarp();
    } catch (error) {
      console.error('Workbook completion save failed', error);
      setCompletionError('결과를 서버에 저장하지 못했습니다. 진행 내용은 보관되어 있습니다. 다시 시도해주세요.');
    } finally {
      setSavingCompletion(false);
    }
  };

  const goToPrev = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      setActiveInputId(null);
      setShowKeypad(false);
      soundManager.playClick();
    }
  };

  const goToNext = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
      setActiveInputId(null);
      setShowKeypad(false);
      soundManager.playClick();
    }
  };

  // Determine indicator text for keypad
  const activeElement = useMemo(() => {
    if (!activeInputId || !currentPage) return null;
    return currentPage.elements.find(el => el.id === activeInputId);
  }, [activeInputId, currentPage]);

  if (!pages || pages.length === 0) {
    return (
      <div className="workbook-player-empty">
        <h3 className="font-title">페이지가 없습니다.</h3>
        <button className="hud-btn secondary" onClick={onClose}>돌아가기</button>
      </div>
    );
  }

  // --- Final Results View Mode ---
  if (isResultMode) {
    let globalCorrect = 0;
    let globalTotalInputs = 0;

    pages.forEach(page => {
      page.elements.forEach(el => {
        if (WORKBOOK_GRADABLE_TYPES.has(el.type)) {
          globalTotalInputs++;
          if (checkedElements[el.id]?.isCorrect) {
            globalCorrect++;
          }
        }
      });
    });

    const score100 = globalTotalInputs === 0 ? 100 : Math.round((globalCorrect / globalTotalInputs) * 100);
    const isPerfect = (globalCorrect === globalTotalInputs) && globalTotalInputs > 0;
    const finalCrystalsDisplay = sessionCrystals + (isPerfect ? 10 : 0);

    return (
      <div className="space-bg" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3000 }}>
        <StarField count={150} />
        <div className="space-quiz-container fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div className="glass-card space-quiz-card" style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: '500px', width: '90%' }}>
            
            <h2 className="font-title" style={{ fontSize: '2rem', color: 'var(--text-bright)', marginBottom: '2rem' }}>
              {previewMode ? '🔎 초안 미리보기 완료' : '🎉 워크북 학습 완료!'}
            </h2>

            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              border: `4px solid ${isPerfect ? 'var(--star-gold)' : 'var(--crystal-cyan)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              background: 'rgba(0,0,0,0.3)',
              boxShadow: isPerfect ? 'var(--glow-gold)' : 'var(--glow-cyan)'
            }}>
              <span className="font-tech" style={{ 
                fontSize: '3rem', 
                fontWeight: 900,
                color: isPerfect ? 'var(--star-gold)' : 'var(--crystal-cyan)'
              }}>{score100}</span>
              <span style={{ color: 'var(--text-muted)' }}>점</span>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>
              {globalCorrect} / {globalTotalInputs} 정답
            </p>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '2.5rem',
              background: 'rgba(0,243,255,0.1)',
              padding: '1rem',
              borderRadius: '15px'
            }}>
              {!previewMode && <div className="crystal-icon" style={{ width: '24px', height: '24px' }}></div>}
              <span style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '1.2rem' }}>
                {previewMode ? '학생 기록과 광석은 저장되지 않습니다.' : `+${finalCrystalsDisplay} 광석 획득!`}
              </span>
            </div>

            {completionError && (
              <div className="workbook-save-error" role="alert">
                {completionError}
              </div>
            )}
            <button
              onClick={previewMode ? onClose : completeWorkbook}
              className="hud-btn primary"
              disabled={!previewMode && savingCompletion}
              style={{
                width: '100%',
                padding: '1.2rem',
                background: 'linear-gradient(135deg, var(--planet-green), #22c55e)',
                border: 'none',
                borderRadius: '15px',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)'
              }}
            >
              {previewMode ? '미리보기 종료' : savingCompletion ? '서버에 결과 저장 중...' : completionError ? '저장 다시 시도' : '📤 결과 저장 및 우주로 복귀'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCurrentPageChecked = !!checkedPages[currentPageIndex];

  return (
    <div className={`workbook-player-container fade-in ${showKeypad && activeInputId && inputMode === 'math' ? 'keypad-open' : ''}`}>
      {/* Floating Gain/Loss Markers */}
      <AnimatePresence>
        {floatingMarkers.map(m => (
          <Motion.div
            key={m.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -50, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{
              position: 'fixed',
              left: m.x,
              top: m.y,
              color: m.type === 'gain' ? '#00ff88' : '#ff4d4d',
              fontWeight: 900,
              fontSize: '2rem',
              textShadow: m.type === 'gain' ? '0 0 10px rgba(0,255,136,0.8)' : '0 0 10px rgba(255,77,77,0.8)',
              pointerEvents: 'none',
              zIndex: 9999
            }}
          >
            {m.text}
          </Motion.div>
        ))}
      </AnimatePresence>

      <div className="workbook-header hud-border glass-card">
        <button className="back-btn" onClick={onClose}>✕</button>
        <span className="font-title unit-title">{unitTitle || '스마트 워크북'}</span>
        <div className="workbook-header-actions">
          <div className="page-indicator font-tech">
            {currentPageIndex + 1} / {pages.length}
          </div>
        </div>
      </div>

      {pauseError && <div className="workbook-pause-error" role="alert">{pauseError}</div>}

      <div className="workbook-canvas-area" onClick={() => { setActiveInputId(null); setShowKeypad(false); }}>
        {currentPage && (
          <div className="workbook-page-container">
            <img 
              src={currentPage.imageUrl} 
              alt={`Page ${currentPageIndex + 1}`} 
              className="workbook-page-img"
              draggable={false}
            />
            
            {/* Elements Overlay */}
            {currentPage.elements.map((el) => {
              if (WORKBOOK_INTERACTION_TYPES.has(el.type)) {
                const elemStatus = checkedElements[el.id];
                const currentValue = answers[el.id] ?? getInitialWorkbookInteractionResponse(el);
                return (
                  <div
                    key={el.id}
                    className={`wb-element wb-interaction-frame ${elemStatus?.isChecked ? (elemStatus.isCorrect ? 'correct' : 'wrong') : ''}`}
                    style={{
                      position: 'absolute',
                      top: `${el.position.top}%`, left: `${el.position.left}%`,
                      width: `${el.position.width}%`, height: `${el.position.height}%`,
                      zIndex: 6,
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <WorkbookInteraction
                      element={el}
                      value={currentValue}
                      onChange={(value) => handleInteractionChange(el, value)}
                      disabled={isResultMode || elemStatus?.isCorrect}
                    />
                    {elemStatus?.isChecked && <WorkbookGradeMark isCorrect={elemStatus.isCorrect} />}
                    {elemStatus?.isChecked && !elemStatus.isCorrect && (
                      <button
                        type="button"
                        className="workbook-hint-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setVisibleHints(prev => ({ ...prev, [el.id]: !prev[el.id] }));
                        }}
                      >힌트</button>
                    )}
                    {visibleHints[el.id] && (
                      <div className="workbook-hint-bubble">
                        {getElementHint(el, studentProfile, attemptCounts[currentPageIndex] || 0)}
                      </div>
                    )}
                  </div>
                );
              }
              if (el.type === 'input') {
                const elemStatus = checkedElements[el.id];
                const isActive = activeInputId === el.id;
                const val = answers[el.id] || '';
                
                return (
                  <div
                    key={el.id}
                    className={`wb-element wb-input ${isActive ? 'active' : ''} ${elemStatus?.isChecked ? (elemStatus.isCorrect ? 'correct' : 'wrong') : ''}`}
                    style={{
                      top: `${el.position.top}%`,
                      left: `${el.position.left}%`,
                      width: `${el.position.width}%`,
                      height: `${el.position.height}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInputActivate(el, e);
                    }}
                  >
                    {/* Always render an actual input so native focus works properly on mobile */}
                    <input
                      ref={node => {
                        if (node) inputRefs.current[el.id] = node;
                        else delete inputRefs.current[el.id];
                      }}
                      type="text"
                      inputMode={el.inputMode === 'integer' ? 'numeric' : ['decimal', 'fraction', 'mixed-number'].includes(el.inputMode) ? 'decimal' : 'text'}
                      className="wb-native-input"
                      value={val}
                      readOnly={inputMode === 'math'}
                      onChange={(e) => inputMode === 'native' && handleKeypadChange(e.target.value)}
                      onFocus={() => {
                        if (inputMode === 'native') setActiveInputId(el.id);
                      }}
                      style={{
                        width: '100%', height: '100%', border: 'none', background: 'transparent', 
                        textAlign: 'center', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', outline: 'none',
                        pointerEvents: inputMode === 'native' ? 'auto' : 'none',
                        caretColor: inputMode === 'native' ? 'auto' : 'transparent',
                        opacity: inputMode === 'native' ? 1 : 0,
                      }}
                    />
                    {inputMode === 'math' && val && (
                      <WorkbookAnswerDisplay value={val} inputMode={el.inputMode || 'integer'} />
                    )}
                    {elemStatus?.isChecked && (
                      <WorkbookGradeMark isCorrect={elemStatus.isCorrect} />
                    )}
                    {elemStatus?.isChecked && !elemStatus.isCorrect && (
                      <button
                        type="button"
                        className="workbook-hint-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setVisibleHints(prev => ({ ...prev, [el.id]: !prev[el.id] }));
                        }}
                      >힌트</button>
                    )}
                    {visibleHints[el.id] && <div className="workbook-hint-bubble">{getElementHint(el, studentProfile, attemptCounts[currentPageIndex] || 0)}</div>}
                  </div>
                );
              }
              
              if (el.type === 'multiple-choice') {
                const elemStatus = checkedElements[el.id];
                const isActive = activeInputId === el.id;
                const val = answers[el.id] || '';
                
                return (
                  <div
                    key={el.id}
                    className={`wb-element wb-mc ${isActive ? 'active' : ''} ${elemStatus?.isChecked ? (elemStatus.isCorrect ? 'correct' : 'wrong') : ''}`}
                    style={{
                      top: `${el.position.top}%`,
                      left: `${el.position.left}%`,
                      width: `${el.position.width}%`,
                      height: `${el.position.height}%`,
                      border: isActive ? '2px solid var(--neon-blue)' : (val ? '2px solid var(--planet-purple)' : '2px dashed #ccc'),
                      backgroundColor: val ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.5)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'absolute',
                      zIndex: 10,
                      boxShadow: isActive ? '0 0 10px var(--neon-blue)' : 'none'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (elemStatus?.isChecked) return;
                      soundManager.playClick();
                      
                      // Shuffle options if not already shuffled for this element
                      if (!shuffledOptionsMap[el.id]) {
                        const originalOptions = el.options || [];
                        const shuffled = shuffleWorkbookOptions(originalOptions);
                        setShuffledOptionsMap(prev => ({ ...prev, [el.id]: shuffled }));
                      }
                      
                      setActiveInputId(el.id);
                      setShowKeypad(false); // Make sure keypad isn't shown
                    }}
                  >
                    <span style={{ fontSize: '1rem', fontWeight: val ? 'bold' : 'normal', color: val ? '#111827' : '#667085', display: 'flex', alignItems: 'center', textShadow: 'none' }}>
                      {val ? parseInlineFormatting(val) : '선택'}
                    </span>
                    {elemStatus?.isChecked && (
                      <WorkbookGradeMark isCorrect={elemStatus.isCorrect} />
                    )}
                    {elemStatus?.isChecked && !elemStatus.isCorrect && (
                      <button
                        type="button"
                        className="workbook-hint-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setVisibleHints(prev => ({ ...prev, [el.id]: !prev[el.id] }));
                        }}
                      >힌트</button>
                    )}
                    {visibleHints[el.id] && <div className="workbook-hint-bubble">{getElementHint(el, studentProfile, attemptCounts[currentPageIndex] || 0)}</div>}
                  </div>
                );
              }

              if (el.type === 'mask') {
                const triggerEl = currentPage.elements.find(e => e.id === el.triggerBy);
                // Reveal mask ONLY if the page has been checked and the trigger was correct
                const isTriggerCheckedAndCorrect = !!checkedElements[triggerEl?.id]?.isCorrect;
                
                return (
                  <Motion.div
                    key={el.id}
                    className="wb-element wb-mask"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isTriggerCheckedAndCorrect ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      top: `${el.position.top}%`,
                      left: `${el.position.left}%`,
                      width: `${el.position.width}%`,
                      height: `${el.position.height}%`,
                      backgroundColor: 'white' // Mask covers underlying content with white
                    }}
                  />
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      <div className="workbook-footer glass-card">
        <button 
          className="hud-btn pagination-btn" 
          onClick={goToPrev} 
          disabled={currentPageIndex === 0}
        >
          <span style={{ color: '#00f3ff', display: 'flex' }}>
            <ArrowLeft size={24} color="currentColor" strokeWidth={2.5} />
          </span>
        </button>

        {/* Center Main Action Button */}
        <div className="workbook-footer-main">
          {!isCurrentPageChecked ? (
            <button 
              className="hud-btn primary submit-btn font-title" 
              onClick={handleCheckPage}
              style={{ background: 'linear-gradient(135deg, var(--planet-purple), var(--neon-blue))' }}
            >
              정답 확인
            </button>
          ) : currentPage.elements.some(element => (
            WORKBOOK_GRADABLE_TYPES.has(element.type)
            && checkedElements[element.id]?.isChecked
            && !checkedElements[element.id]?.isCorrect
          )) ? (
            <button
              className="hud-btn primary submit-btn font-title"
              onClick={handleRetryPage}
              style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
            >
              틀린 문제 다시 풀기
            </button>
          ) : (
            currentPageIndex === pages.length - 1 ? (
              <button 
                className="hud-btn primary submit-btn font-title" 
                onClick={handleSubmitFinal}
              >
                제출하기
              </button>
            ) : (
              <button 
                className="hud-btn secondary submit-btn font-title" 
                onClick={goToNext}
                style={{ background: 'linear-gradient(135deg, rgba(0,243,255,0.2), rgba(0,255,136,0.2))', border: '1px solid var(--crystal-cyan)', color: 'var(--text-bright)' }}
              >
                다음 페이지 
                <ArrowRight size={20} style={{ marginLeft: 8 }} />
              </button>
            )
          )}
          {!previewMode && (
            <button
              type="button"
              className="workbook-pause-btn"
              onClick={handlePauseWorkbook}
              disabled={savingPause}
            >
              {savingPause ? '저장 중…' : '오늘은 여기까지'}
            </button>
          )}
        </div>

        <button 
          className="hud-btn pagination-btn" 
          onClick={goToNext} 
          disabled={currentPageIndex === pages.length - 1 || (!isCurrentPageChecked)}
        >
          <span style={{ color: '#00f3ff', display: 'flex', opacity: (!isCurrentPageChecked) ? 0.3 : 1 }}>
            <ArrowRight size={24} color="currentColor" strokeWidth={2.5} />
          </span>
        </button>
      </div>

      {/* Option Selector for Multiple Choice */}
      {activeInputId && activeElement?.type === 'multiple-choice' && !checkedPages[currentPageIndex] && typeof document !== 'undefined' && createPortal(
          <Motion.div
            className="math-keypad-overlay"
            onClick={() => { setActiveInputId(null); setShowKeypad(false); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Motion.div
              className="math-keypad-container workbook-choice-modal"
              initial={{ y: '20px', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '20px', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-title workbook-choice-title">정답을 선택하세요</h3>
              <div className="workbook-choice-options">
                {(shuffledOptionsMap[activeInputId] || activeElement.options || []).map((opt, idx) => (
                  <button
                    key={idx}
                    className="glass-card workbook-choice-option"
                    style={{
                      padding: '1rem', textAlign: 'center', fontSize: '1.2rem', color: 'white', fontWeight: 'bold',
                      border: answers[activeInputId] === opt ? '2px solid var(--neon-blue)' : '1px solid rgba(255,255,255,0.1)',
                      background: answers[activeInputId] === opt ? 'rgba(0, 243, 243, 0.15)' : 'rgba(255,255,255,0.05)',
                      cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s',
                      boxShadow: answers[activeInputId] === opt ? '0 0 15px rgba(0,243,255,0.3)' : 'none',
                      display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onClick={() => {
                      soundManager.playClick();
                      setAnswers(prev => ({ ...prev, [activeInputId]: opt }));
                      setActiveInputId(null);
                    }}
                  >
                    {parseInlineFormatting(opt)}
                  </button>
                ))}
              </div>
              <button 
                className="hud-btn secondary workbook-choice-close"
                onClick={() => setActiveInputId(null)}
              >
                닫기
              </button>
            </Motion.div>
          </Motion.div>,
          document.body,
          'workbook-choice-modal'
      )}

      {/* Virtual Keypad Modal Overlay */}
      <AnimatePresence>
        {showKeypad && activeInputId && inputMode === 'math' && (
          <MathKeypad 
            value={answers[activeInputId] || ''}
            onChange={handleKeypadChange}
            onSubmit={() => {
              setShowKeypad(false);
              setActiveInputId(null);
              soundManager.playClick();
            }}
            indicatorText={activeElement?.answer?.includes('/') ? '분수/수식 입력' : '정답 입력'}
            inputMode={activeElement?.inputMode || 'expression'}
            visible={showKeypad}
            onClose={() => {
              setShowKeypad(false);
              setActiveInputId(null);
            }}
            onNativeModeSwitch={() => {
               setInputMode('native');
               setShowKeypad(false);
               soundManager.playClick();
               // Try to focus immediately
               setTimeout(() => {
                 if (activeInputId && inputRefs.current[activeInputId]) {
                   inputRefs.current[activeInputId].focus();
                 }
               }, 10);
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating Button for Math Mode explicitly unhidden when in native text mode */}
      {inputMode === 'native' && (
         <Motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           style={{ position: 'absolute', bottom: '3rem', left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 1000, pointerEvents: 'none' }}
         >
           <button 
             onClick={(e) => { 
                e.stopPropagation();
                setInputMode('math'); 
                if (activeInputId) setShowKeypad(true); 
             }}
             style={{ 
               background: 'var(--crystal-cyan)', color: 'black', border: 'none', 
               borderRadius: '30px', padding: '0.8rem 1.5rem', fontWeight: 'bold', 
               boxShadow: '0 10px 30px rgba(0, 243, 255, 0.5)', cursor: 'pointer', pointerEvents: 'auto'
             }}
           >
             🧮 수학 키패드로 복귀
           </button>
         </Motion.div>
      )}
    </div>
  );
};

export default WorkbookPlayer;
