import { useEffect, useMemo, useRef, useState } from 'react'
import { projectRawToMeaningfulTrace, distillToLearningTrace } from '../../runtime/traceProjection/meaningfulStepProjector.js'
import { createAlgorithmRuntimeAdapter } from '../../runtime/algorithmRuntimeAdapter.js'
import { matchRuleBasedMisconception } from '../../shared/taxonomy/ruleBasedMisconceptionMatcher.js'
import { createStagnationDetector } from '../scaffold/stagnationDetector.js'
import { getScaffoldByLevel } from '../scaffold/scaffoldGraph.js'
import ScaffoldDrawer from '../scaffold/ScaffoldDrawer.jsx'
import DiagnosticMissionModal from './DiagnosticMissionModal.jsx'
import ProtocolRepairModal from '../scaffold/ProtocolRepairModal.jsx'
import AlgorithmPythonEditor from '../editor/AlgorithmPythonEditor.jsx'

function formatPythonValue(val) {
  if (val === null || val === undefined) return 'None'
  if (val === true) return 'True'
  if (val === false) return 'False'
  return String(val)
}

function cleanPythonError(errMsg) {
  if (!errMsg) return ''
  return errMsg
    .replace(/null/g, 'None')
    .replace(/true/g, 'True')
    .replace(/false/g, 'False')
}

function getDiscoveredRuleHint(kernel) {
  if (kernel?.learning?.objective) {
    return kernel.learning.objective
  }
  return '1·2단계에서 발견한 규칙과 불변성을 바탕으로 Python 함수를 완성하세요.'
}

export default function CodeMode({
  kernel,
  shell = 'explorer',
  initialCode,
  understandingEvidence,
  onSubmitSolution,
  onOpenAiPromptModal,
  onRequestHint,
  onCodeChange,
  assistanceAllowed = false,
}) {
  const starterCode =
    kernel.modes?.code?.starterCode ||
    `def check_gate(s1, s2):\n    # 앞에서 발견한 게이트 규칙을 Python 코드로 표현해 보세요.\n    pass\n`

  const [code, setCode] = useState(initialCode || starterCode)
  const [stdout, setStdout] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [learningTrace, setLearningTrace] = useState([])
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0)
  const [runResult, setRunResult] = useState(null)
  const [runCount, setRunCount] = useState(0)
  const [submissionFeedback, setSubmissionFeedback] = useState(null)
  const [misconceptionDiagnosis, setMisconceptionDiagnosis] = useState(null)
  const [stagnationSuggestion, setStagnationSuggestion] = useState(null)
  const [isScaffoldOpen, setIsScaffoldOpen] = useState(false)
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false)
  const [isRepairOpen, setIsRepairOpen] = useState(false)
  const [scaffoldLevel, setScaffoldLevel] = useState(1)
  const revealedScaffoldLevels = useRef(new Set())

  const stagnationDetector = useMemo(() => createStagnationDetector(), [])
  const runtimeAdapter = useMemo(
    () => createAlgorithmRuntimeAdapter({ limits: kernel.runtime?.limits || {} }),
    [kernel.runtime?.limits],
  )

  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode)
    }
  }, [initialCode])

  useEffect(() => () => runtimeAdapter.dispose(), [runtimeAdapter])

  const handleCodeChange = (newCode) => {
    setCode(newCode)
    stagnationDetector.recordCodeChange(newCode)
    setStagnationSuggestion(null)
    onCodeChange?.(newCode)
  }

  const requestScaffoldAccess = async (level) => {
    if (!assistanceAllowed) throw new Error('현재 탐사에서는 지원을 사용할 수 없습니다.')
    if (revealedScaffoldLevels.current.has(level)) return
    const scaffold = getScaffoldByLevel(level, kernel.id)
    if (!scaffold) throw new Error('지원 단계를 찾을 수 없습니다.')
    await onRequestHint?.({
      level,
      source: scaffold.source,
      answerExposure: scaffold.answerExposure,
    })
    revealedScaffoldLevels.current.add(level)
  }

  const openScaffold = async (level) => {
    try {
      await requestScaffoldAccess(level)
      setScaffoldLevel(level)
      setIsScaffoldOpen(true)
    } catch (error) {
      setStdout(`[지원 열기 오류] ${error.message}`)
    }
  }

  // Local Client RUN (Safe Sandbox Execution for fast feedback & Time-Travel)
  const handleRun = async () => {
    setIsRunning(true)
    setStdout('')
    setRunResult(null)
    setSubmissionFeedback(null)
    setMisconceptionDiagnosis(null)
    setStagnationSuggestion(null)
    setRunCount((prev) => prev + 1)

    try {
      const publicTests = kernel.assessment?.diagnosticTests || kernel.assessment?.publicTests || []
      const runRes = await runtimeAdapter.runStudentCode({
        code,
        entryFunction: kernel.modes?.code?.entryFunction || 'check_gate',
        publicTests,
      })

      if (!runRes.ok) {
        const protocolErrorCodes = new Set(['UNSUPPORTED_SYNTAX', 'FUNCTION_NOT_FOUND', 'INVALID_SOURCE', 'INVALID_ARGUMENTS'])
        const diagnosis = protocolErrorCodes.has(runRes.errorCode)
          ? matchRuleBasedMisconception({ syntaxError: runRes.error })
          : null
        setMisconceptionDiagnosis(diagnosis)
        setRunResult({ ok: false, error: cleanPythonError(runRes.error), errorCode: runRes.errorCode })
        setStdout(`[실행 오류] ${cleanPythonError(runRes.error)}`)
        const stagnant = stagnationDetector.recordRun({ code, error: runRes.errorCode || 'RUNTIME_ERROR' })
        if (stagnant.isStagnant) setStagnationSuggestion(stagnant)
        return
      }

      const testResults = runRes.testResults || []
      const rawEvents = runRes.rawEvents || []

      // Project trace to meaningful events and learning scenes
      const meaningful = projectRawToMeaningfulTrace(rawEvents)
      const scenes = distillToLearningTrace(meaningful, { min: 2, max: 30 })
      setLearningTrace(scenes)

      const allPassed = runRes.allPassed
      setRunResult({ ok: true, allPassed, testResults })

      // If failed, automatically select the first failing scene in Time-Travel
      const firstFailIndex = testResults.findIndex((t) => !t.passed)
      if (firstFailIndex >= 0 && scenes.length > 0) {
        setSelectedSceneIndex(Math.min(firstFailIndex, scenes.length - 1))
      } else {
        setSelectedSceneIndex(Math.max(0, scenes.length - 1))
      }

      if (allPassed) {
        stagnationDetector.recordRun({ code, testResults })
        setStdout(`[실행 완료] 모든 공개 장면(${testResults.length}/${testResults.length}) 통과! [최종 확인] 버튼을 눌러 채점을 진행하세요.`)
      } else {
        const diagnosis = matchRuleBasedMisconception({
          testResults,
          syntaxError: null,
        })
        setMisconceptionDiagnosis(diagnosis)

        const failCount = testResults.filter((t) => !t.passed).length
        setStdout(`[확인 알림] 아직 해결되지 않은 상황이 ${failCount}개 있어요.`)

        const stag = stagnationDetector.recordRun({ code, testResults })
        if (stag.isStagnant) {
          setStagnationSuggestion(stag)
        }
      }
    } catch (err) {
      setRunResult({ ok: false, error: cleanPythonError(err.message) })
      setStdout(`[실행 오류] ${cleanPythonError(err.message)}`)
    } finally {
      setIsRunning(false)
    }
  }

  // Authoritative SUBMIT handler
  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmitSolution?.({
        code,
        understandingEvidence,
        onFeedback: (feedback) => {
          setSubmissionFeedback(feedback)
        },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentScene = learningTrace[selectedSceneIndex] || null
  const isAiUnlocked = runCount >= 2 || Boolean(stagnationSuggestion)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', color: '#fff' }}>
      {/* Editor Column */}
      <div style={{ background: 'rgba(10, 20, 40, 0.75)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.25)' }}>
        {/* Mission Briefing Card */}
        <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 30, 0.9))', borderRadius: '14px', padding: '16px 18px', marginBottom: '16px', border: '1px solid rgba(0, 240, 255, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯 [3단계 미션]</span>
              <span>{kernel.identity?.studentTitle || 'Python 코드 구현'}</span>
            </div>
            <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(0, 240, 255, 0.15)', color: '#a5f3fc', border: '1px solid rgba(0, 240, 255, 0.3)', fontFamily: 'monospace' }}>
              함수: {kernel.modes?.code?.entryFunction || 'check_gate'}
            </span>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
            {kernel.shells?.[shell]?.story || kernel.shells?.explorer?.story || kernel.learning?.objective}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#94a3b8', background: 'rgba(0, 0, 0, 0.35)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div>
              <strong style={{ color: '#fef08a' }}>💡 학습 목표 및 미션:</strong>{' '}
              <span style={{ color: '#f8fafc' }}>
                {getDiscoveredRuleHint(kernel)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', color: '#00f0ff', fontSize: '15px' }}>
            🐍 Python Editor
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => openScaffold(scaffoldLevel)}
              disabled={!assistanceAllowed}
              style={{
                padding: '6px 12px',
                background: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid #eab308',
                borderRadius: '6px',
                color: '#fde047',
                fontSize: '12px',
                cursor: assistanceAllowed ? 'pointer' : 'not-allowed',
                opacity: assistanceAllowed ? 1 : 0.5,
              }}
            >
              💡 막혔나요? (생각의 실마리)
            </button>
            <button
              type="button"
              onClick={() => isAiUnlocked && onOpenAiPromptModal?.({ currentCode: code, diagnosis: misconceptionDiagnosis, scenes: learningTrace, publicTestError: stdout })}
              disabled={!assistanceAllowed || !isAiUnlocked}
              style={{
                padding: '6px 12px',
                background: isAiUnlocked ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: isAiUnlocked ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: isAiUnlocked ? '#d8b4fe' : 'rgba(255, 255, 255, 0.4)',
                fontSize: '12px',
                cursor: isAiUnlocked && assistanceAllowed ? 'pointer' : 'not-allowed',
              }}
            >
              {isAiUnlocked ? '🤖 AI 사고 코치' : '🔒 AI 사고 코치 (2회 실행 후 열림)'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <AlgorithmPythonEditor
            value={code}
            onChange={handleCodeChange}
            minHeight="240px"
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            style={{
              flex: 1,
              padding: '12px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: isRunning ? 'wait' : 'pointer',
            }}
          >
            {isRunning ? '⏳ 실행 중...' : '▶ 실행해 보기 (공개 장면 확인)'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: isSubmitting ? 'wait' : 'pointer',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)',
            }}
          >
            {isSubmitting ? '⭐ 확인 중...' : '🚀 최종 확인 (모든 상황 검증)'}
          </button>
        </div>

        {/* Console Stdout & Feedback */}
        <div style={{ marginTop: '16px', background: 'rgba(0, 0, 0, 0.6)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: 'monospace', fontSize: '13px', minHeight: '56px' }}>
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', fontSize: '11px' }}>실행 결과 (OUTPUT)</div>
          <div style={{ color: runResult?.allPassed ? '#4ade80' : '#f87171' }}>
            {stdout || '코드를 작성하고 [실행해 보기]를 누르면 결과가 여기에 표시됩니다.'}
          </div>
        </div>

        {/* Misconception Diagnostic Guidance */}
        {misconceptionDiagnosis && (
          <div style={{ marginTop: '14px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#93c5fd', marginBottom: '4px' }}>
              💡 생각의 실마리: {misconceptionDiagnosis.title}
            </div>
            <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.5', marginBottom: '10px' }}>
              {misconceptionDiagnosis.guidance}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {misconceptionDiagnosis.category === 'PROTOCOL_SYNTAX' && (
                <button
                  type="button"
                  onClick={() => setIsRepairOpen(true)}
                  style={{
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#000',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  🔧 문법 퀵 점검
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stagnation Suggestion Banner */}
        {stagnationSuggestion && (
          <div style={{ marginTop: '14px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: '#fef08a' }}>
              💬 {stagnationSuggestion.message}
            </div>
            <button
              type="button"
              onClick={() => openScaffold(stagnationSuggestion.recommendedLevel)}
              disabled={!assistanceAllowed}
              style={{
                padding: '6px 12px',
                background: '#eab308',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: assistanceAllowed ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              도움 보기
            </button>
          </div>
        )}
      </div>

      {/* Time-Travel & Submission Status Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Time-Travel Scene Scrubber */}
        <div style={{ background: 'rgba(10, 20, 40, 0.75)', padding: '18px', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', color: '#00f0ff', fontSize: '15px' }}>
              ⏱️ 실행 장면 되돌아보기 (Time-Travel)
            </div>
            {currentScene && (
              <span style={{ fontSize: '12px', color: '#a5f3fc', fontFamily: 'monospace' }}>
                장면 {selectedSceneIndex + 1} / {learningTrace.length}
              </span>
            )}
          </div>

          {learningTrace.length > 0 ? (
            <div>
              <input
                type="range"
                min={0}
                max={learningTrace.length - 1}
                value={selectedSceneIndex}
                onChange={(e) => setSelectedSceneIndex(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#00f0ff', cursor: 'pointer', marginBottom: '12px' }}
              />

              <div style={{ background: 'rgba(0, 0, 0, 0.5)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '6px' }}>
                  🔍 장면 {selectedSceneIndex + 1}: 입력 상황 점검
                </div>
                {currentScene.stateDiff && (
                  <div style={{ fontSize: '14px', color: '#fff', lineHeight: '1.6' }}>
                    {Object.entries(currentScene.stateDiff)
                      .map(([k, v]) => `${k}: ${typeof v === 'boolean' ? (v ? '🟢 ON' : '🔴 OFF') : v}`)
                      .join(' | ')}
                    {currentScene.worldDiff && (
                      <div style={{ marginTop: '4px', color: '#a5f3fc' }}>
                        결과 ➔ {Object.entries(currentScene.worldDiff)
                          .map(([k, v]) => `${k}: ${v ? '🔓 열림 (True)' : '🔒 닫힘 (False)'}`)
                          .join(', ')}
                      </div>
                    )}
                    {currentScene.metadata && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: currentScene.metadata.passed ? '#34d399' : '#f87171' }}>
                        {currentScene.metadata.passed
                          ? '✅ 예상 결과와 일치합니다.'
                          : `⚠️ 예상: ${formatPythonValue(currentScene.metadata.expected)} | 실제 코드 반환: None`}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step navigation buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={selectedSceneIndex <= 0}
                  onClick={() => setSelectedSceneIndex((prev) => Math.max(0, prev - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: selectedSceneIndex > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  ◀ 이전 변화
                </button>
                <button
                  type="button"
                  disabled={selectedSceneIndex >= learningTrace.length - 1}
                  onClick={() => setSelectedSceneIndex((prev) => Math.min(learningTrace.length - 1, prev + 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: selectedSceneIndex < learningTrace.length - 1 ? 'pointer' : 'not-allowed',
                  }}
                >
                  다음 변화 ▶
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', padding: '24px 0' }}>
              [실행해 보기]를 누르면 코드의 실행 과정 장면이 타임라인으로 생성됩니다.
            </div>
          )}
        </div>

        {/* Submission Feedback & 3 Stars Result */}
        {submissionFeedback && (
          <div
            style={{
              background: submissionFeedback.status === 'passed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              padding: '18px 20px',
              borderRadius: '16px',
              border: submissionFeedback.status === 'passed' ? '2px solid #10b981' : '2px solid #ef4444',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
              {submissionFeedback.status === 'passed' ? '🎉 기본 조건 판정 통과!' : '⚠️ 아직 해결되지 않은 상황이 있어요.'}
            </div>

            <div style={{ fontSize: '24px', color: '#fbbf24', margin: '6px 0' }}>
              {submissionFeedback.status === 'passed' ? '★☆☆' : '☆☆☆'}
            </div>

            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.6' }}>
              <div>★ 항로 발견: {submissionFeedback.resultStar ? '✅ 통과 (★ 1개 획득)' : '❌ 미완료'}</div>
              {submissionFeedback.error && (
                <div style={{ color: '#fca5a5', marginTop: '6px', fontSize: '12px', background: 'rgba(0,0,0,0.4)', padding: '8px 10px', borderRadius: '6px' }}>
                  {cleanPythonError(submissionFeedback.error)}
                </div>
              )}
              <div style={{ marginTop: '6px', color: '#94a3b8' }}>★★ 규칙 이해: 항로 발견 완료 후 15초 퀴즈로 도전</div>
              <div style={{ color: '#94a3b8' }}>★★★ 새로운 상황 적용: 규칙 이해 완료 후 도전</div>
            </div>
          </div>
        )}
      </div>

      {/* Scaffold Drawer */}
      <ScaffoldDrawer
        isOpen={isScaffoldOpen}
        initialLevel={scaffoldLevel}
        problemId={kernel.id}
        onApplySnippet={(snippet) => handleCodeChange(snippet)}
        onSelectScaffold={async (lvl) => {
          await requestScaffoldAccess(lvl)
          setScaffoldLevel(lvl)
        }}
        onClose={() => setIsScaffoldOpen(false)}
      />

      {/* Diagnostic Mission Modal */}
      <DiagnosticMissionModal
        isOpen={isDiagnosticOpen}
        diagnosis={misconceptionDiagnosis}
        onClose={() => setIsDiagnosticOpen(false)}
      />

      {/* Protocol Repair Modal */}
      <ProtocolRepairModal
        isOpen={isRepairOpen}
        syntaxError={stdout}
        onCompleteRepair={({ fixedCode }) => {
          handleCodeChange(fixedCode)
          setIsRepairOpen(false)
        }}
        onClose={() => setIsRepairOpen(false)}
      />
    </div>
  )
}
