import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeeklyGrowthLoop } from '../../../hooks/useWeeklyGrowthLoop';
import Step1LastWeekReview from './Step1LastWeekReview';
import Step2Reflection from './Step2Reflection';
import Step3Strategy from './Step3Strategy';
import Step4Goals from './Step4Goals';
import Step5Summary from './Step5Summary';
import './WeeklyGrowthLoop.css';

const MotionDiv = motion.div;

export default function WeeklyGrowthLoopDrawer({ isOpen, onClose, onStatusChange }) {
  // 1. Hook (enabled only when drawer is open)
  const {
    loop,
    isLoading,
    isError,
    refetch,
    completeLoop,
    isCompleting,
    updateLoop,
    isUpdating,
    saveDraft,
    loadDraft,
    clearDraft,
  } = useWeeklyGrowthLoop({ enabled: isOpen });

  // 2. Local State
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [previousGoalOutcomes, setPreviousGoalOutcomes] = useState([]);
  const [observationCodes, setObservationCodes] = useState([]);
  const [prideCode, setPrideCode] = useState(null);
  const [strategyCode, setStrategyCode] = useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [actionError, setActionError] = useState('');
  const initializedLoopVersionRef = useRef('');
  const pendingCommandIdRef = useRef(null);
  const skipNextDraftSaveRef = useRef(false);

  const isCompleted = loop?.status === 'completed';
  const handleRequestClose = useCallback(() => {
    if (isCompleting || isUpdating) return;
    onClose();
  }, [isCompleting, isUpdating, onClose]);

  useEffect(() => {
    if (!loop?.weekStartKey || !onStatusChange) return;
    onStatusChange({ weekStartKey: loop.weekStartKey, status: loop.status });
  }, [loop?.weekStartKey, loop?.status, onStatusChange]);

  // 3. Initialize state from server loop or local draft
  /* Form state intentionally hydrates from the versioned server snapshot/local draft. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen || !loop) return;
    const loopVersion = `${loop.id}:${loop.status}:${loop.revision ?? 0}`;
    if (initializedLoopVersionRef.current === loopVersion) return;

    const draft = loadDraft();
    skipNextDraftSaveRef.current = true;

    if (loop.status === 'completed') {
      const isEditingDraft = draft?.mode === 'edit';
      setObservationCodes(
        isEditingDraft ? draft.observationCodes : (loop.reflection?.observationCodes || [])
      );
      setPrideCode(isEditingDraft ? draft.prideCode : (loop.reflection?.prideCode || null));
      setStrategyCode(
        isEditingDraft ? draft.strategyCode : (loop.reflection?.strategyCode || '')
      );
      setSelectedTemplateIds(
        isEditingDraft
          ? draft.selectedTemplateIds
          : (loop.plan?.goals || []).map((g) => g.templateId || g.id)
      );
      setPreviousGoalOutcomes(loop.previousGoalOutcomes || []);
      setCurrentStep(isEditingDraft ? Math.max(2, draft.currentStep) : 5);
      setIsEditMode(isEditingDraft);
      setActionError('');
      initializedLoopVersionRef.current = loopVersion;
      return;
    }

    if (draft) {
      if (Array.isArray(draft.previousGoalOutcomes)) setPreviousGoalOutcomes(draft.previousGoalOutcomes);
      if (Array.isArray(draft.observationCodes)) setObservationCodes(draft.observationCodes);
      if (draft.prideCode !== undefined) setPrideCode(draft.prideCode);
      if (typeof draft.strategyCode === 'string') setStrategyCode(draft.strategyCode);
      if (Array.isArray(draft.selectedTemplateIds)) setSelectedTemplateIds(draft.selectedTemplateIds);
      if (typeof draft.currentStep === 'number' && draft.currentStep >= 1 && draft.currentStep <= 5) {
        setCurrentStep(draft.currentStep);
      }
    } else {
      setPreviousGoalOutcomes([]);
      setObservationCodes([]);
      setPrideCode(null);
      setStrategyCode('');
      setSelectedTemplateIds([]);
      setCurrentStep(1);
    }
    setIsEditMode(false);
    setActionError('');
    initializedLoopVersionRef.current = loopVersion;
  }, [isOpen, loop, loadDraft]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 4. Auto-save local draft whenever state changes (for open loop or edit mode)
  useEffect(() => {
    if (!isOpen || !loop) return;
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }
    if (loop.status === 'completed' && !isEditMode) return;

    saveDraft({
      mode: isEditMode ? 'edit' : 'create',
      currentStep,
      previousGoalOutcomes,
      observationCodes,
      prideCode,
      strategyCode,
      selectedTemplateIds,
    });
  }, [
    isOpen,
    loop,
    isEditMode,
    currentStep,
    previousGoalOutcomes,
    observationCodes,
    prideCode,
    strategyCode,
    selectedTemplateIds,
    saveDraft,
  ]);

  useEffect(() => {
    pendingCommandIdRef.current = null;
  }, [previousGoalOutcomes, observationCodes, prideCode, strategyCode, selectedTemplateIds, isEditMode]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleRequestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleRequestClose]);

  // Step 1: Handle Previous Goal Outcome change
  const handleOutcomeChange = useCallback((goalId, result) => {
    setPreviousGoalOutcomes((prev) => {
      const filtered = prev.filter((item) => item.goalId !== goalId);
      return [...filtered, { goalId, result }];
    });
  }, []);

  // Step 2: Handle Observation toggle (1~2 items)
  const handleObservationToggle = useCallback((code) => {
    setObservationCodes((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      if (prev.length >= 2) {
        // Replace second item or alert
        return [prev[0], code];
      }
      return [...prev, code];
    });
  }, []);

  // Step 2: Handle Pride select
  const handlePrideSelect = useCallback((code) => {
    setPrideCode(code);
  }, []);

  // Step 3: Handle Strategy select
  const handleStrategySelect = useCallback((code) => {
    setStrategyCode(code);
  }, []);

  // Step 4: Handle Goal toggle (1~3 items)
  const handleGoalToggle = useCallback((templateId) => {
    setSelectedTemplateIds((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, templateId];
    });
  }, []);

  // Step validation
  const canProceedStep = useMemo(() => {
    if (currentStep === 1) {
      const prevGoals = loop?.reviewedWeek?.previousGoals || [];
      if (prevGoals.length === 0) return true;
      return prevGoals.every((g) => previousGoalOutcomes.some((o) => o.goalId === g.id));
    }
    if (currentStep === 2) {
      return observationCodes.length >= 1 && observationCodes.length <= 2;
    }
    if (currentStep === 3) {
      return Boolean(strategyCode);
    }
    if (currentStep === 4) {
      return selectedTemplateIds.length >= 1 && selectedTemplateIds.length <= 3;
    }
    return true;
  }, [currentStep, loop, previousGoalOutcomes, observationCodes, strategyCode, selectedTemplateIds]);

  // Submit / Complete
  const handleComplete = async () => {
    setActionError('');
    if (!loop?.weekStartKey) {
      setActionError('주차 정보를 확인할 수 없습니다. 화면을 다시 열어주세요.');
      return;
    }
    if (!pendingCommandIdRef.current) {
      const randomPart = globalThis.crypto?.randomUUID?.().replaceAll('-', '')
        || Math.random().toString(36).slice(2, 12);
      pendingCommandIdRef.current = `cmd_${isEditMode ? 'update' : 'complete'}_${Date.now()}_${randomPart}`;
    }
    const commandId = pendingCommandIdRef.current;

    try {
      if (isEditMode) {
        await updateLoop({
          commandId,
          expectedRevision: loop.revision,
          weekStartKey: loop.weekStartKey,
          observationCodes,
          prideCode,
          strategyCode,
          goalTemplateIds: selectedTemplateIds,
        });
        setIsEditMode(false);
      } else {
        await completeLoop({
          commandId,
          expectedRevision: loop.revision,
          weekStartKey: loop.weekStartKey,
          previousGoalOutcomes,
          observationCodes,
          prideCode,
          strategyCode,
          goalTemplateIds: selectedTemplateIds,
        });
      }
      pendingCommandIdRef.current = null;
      setCurrentStep(5);
    } catch (err) {
      console.error('Failed to complete/update weekly growth loop:', err);
      const errorCode = String(err?.code || '');
      if (errorCode.includes('aborted') || errorCode.includes('failed-precondition')) {
        clearDraft();
        initializedLoopVersionRef.current = '';
        await refetch().catch(() => null);
        setActionError('다른 기기에서 변경되었거나 새 주가 시작되었습니다. 최신 항로를 불러왔으니 다시 확인해 주세요.');
      } else {
        setActionError(err.message || '저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    }
  };

  const handleStartEditing = () => {
    setActionError('');
    setIsEditMode(true);
    setCurrentStep(2); // Go to reflection or strategy
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="weekly-loop-backdrop" onClick={handleRequestClose}>
        <MotionDiv
          className="weekly-loop-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="weekly-growth-loop-title"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* 1. Header */}
          <div className="weekly-loop-header">
            <div className="weekly-loop-title-group">
              <span className="weekly-loop-badge">GROWTH LOOP</span>
              <h2 id="weekly-growth-loop-title" className="weekly-loop-title">이번 주 항로 🧭</h2>
            </div>
            <button
              type="button"
              className="weekly-loop-close-btn"
              onClick={handleRequestClose}
              title="닫기"
              aria-label="이번 주 항로 닫기"
            >
              ✕
            </button>
          </div>

          {/* 2. Stepper */}
          {(!isCompleted || isEditMode) && (
            <div className="weekly-loop-stepper">
              {[
                { step: 1, label: '지난주' },
                { step: 2, label: '돌아보기' },
                { step: 3, label: '하나 바꾸기' },
                { step: 4, label: '목표 고르기' },
                { step: 5, label: '확인 및 시작' },
              ].map((item) => {
                const isActive = currentStep === item.step;
                const isDone = currentStep > item.step;
                return (
                  <div
                    key={item.step}
                    className={`weekly-loop-step-item ${isActive ? 'active' : ''} ${
                      isDone ? 'completed' : ''
                    }`}
                  >
                    <div className="weekly-loop-step-dot">{isDone ? '✓' : item.step}</div>
                    <span className="step-text">{item.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Body Content */}
          <div className="weekly-loop-body">
            {isLoading ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3rem',
                  gap: '1rem',
                  color: 'var(--crystal-cyan)',
                }}
              >
                <div style={{ fontSize: '2rem' }}>🧭</div>
                <div style={{ fontWeight: 700 }}>이번 주 항로를 불러오고 있습니다...</div>
              </div>
            ) : isError ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#ff6b6b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div>항로 정보를 불러오지 못했습니다.</div>
                <button
                  type="button"
                  className="nav-btn-secondary"
                  onClick={() => refetch()}
                  style={{ alignSelf: 'center' }}
                >
                  다시 시도하기
                </button>
              </div>
            ) : (
              <>
                {actionError && (
                  <div
                    style={{
                      background: 'rgba(255, 107, 107, 0.15)',
                      border: '1px solid rgba(255, 107, 107, 0.4)',
                      borderRadius: '10px',
                      padding: '0.8rem 1rem',
                      color: '#ff8787',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    ⚠️ {actionError}
                  </div>
                )}

                {currentStep === 1 && (
                  <Step1LastWeekReview
                    loop={loop}
                    previousGoalOutcomes={previousGoalOutcomes}
                    onOutcomeChange={handleOutcomeChange}
                  />
                )}

                {currentStep === 2 && (
                  <Step2Reflection
                    observationCodes={observationCodes}
                    onObservationToggle={handleObservationToggle}
                    prideCode={prideCode}
                    onPrideSelect={handlePrideSelect}
                  />
                )}

                {currentStep === 3 && (
                  <Step3Strategy
                    strategyCode={strategyCode}
                    onStrategySelect={handleStrategySelect}
                  />
                )}

                {currentStep === 4 && (
                  <Step4Goals
                    selectedTemplateIds={selectedTemplateIds}
                    onGoalToggle={handleGoalToggle}
                  />
                )}

                {currentStep === 5 && (
                  <Step5Summary
                    observationCodes={observationCodes}
                    prideCode={prideCode}
                    strategyCode={strategyCode}
                    selectedTemplateIds={selectedTemplateIds}
                    isCompleted={isCompleted && !isEditMode}
                    onStartEditing={handleStartEditing}
                  />
                )}
              </>
            )}
          </div>

          {/* 4. Footer Actions */}
          {!isLoading && !isError && (
            <div className="weekly-loop-footer">
              {currentStep > 1 && (!isCompleted || isEditMode) ? (
                <button
                  type="button"
                  className="nav-btn-secondary"
                  onClick={() => setCurrentStep((prev) => Math.max(isEditMode ? 2 : 1, prev - 1))}
                  disabled={isCompleting || isUpdating}
                >
                  ← 이전 단계
                </button>
              ) : (
                <div />
              )}

              {(!isCompleted || isEditMode) && currentStep < 5 && (
                <button
                  type="button"
                  className="nav-btn-primary"
                  onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
                  disabled={!canProceedStep}
                >
                  <span>다음 단계</span>
                  <span>→</span>
                </button>
              )}

              {(!isCompleted || isEditMode) && currentStep === 5 && (
                <button
                  type="button"
                  className="nav-btn-primary"
                  onClick={handleComplete}
                  disabled={isCompleting || isUpdating}
                  style={{
                    background: 'linear-gradient(135deg, #00e5ff, #0077b6)',
                  }}
                >
                  {isCompleting || isUpdating ? (
                    <span>저장 중...</span>
                  ) : isEditMode ? (
                    <span>수정 완료하기 ✨</span>
                  ) : (
                    <span>이번 주 시작하기 🚀</span>
                  )}
                </button>
              )}

              {isCompleted && !isEditMode && currentStep === 5 && (
                <button
                  type="button"
                  className="nav-btn-primary"
                  onClick={handleRequestClose}
                  style={{ background: 'linear-gradient(135deg, #00e5ff, #0077b6)' }}
                >
                  <span>확인 (닫기)</span>
                </button>
              )}
            </div>
          )}
        </MotionDiv>
      </div>
    </AnimatePresence>
  );
}
