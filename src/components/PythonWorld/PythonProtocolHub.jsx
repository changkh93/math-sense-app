import { lazy, Suspense, useEffect, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { isMissionSetComplete as hasCompletedMissionSet } from '../../utils/pythonMissionProgressUtils.js'
import {
  getBuiltinPythonMissionSets,
  PYTHON_PROTOCOL_ENTRY_UNITS,
} from './pythonMissionCatalog'
import { getLumiCourseCatalog, getLumiMissionSet } from './lumiCourseCatalog.js'
import {
  getAdvancedChallengeAccess,
  getSequentialActAccess,
} from './lumiProgressionAccess.js'
import {
  LUMI_OBJECT_SPIKE_ENABLED,
  LUMI_OBJECT_LEARNING_PILOT_ENABLED,
  LUMI_TACTICAL_PILOT_ENABLED,
  LUMI_OBJECT_FRONTIER_ENABLED,
} from '../../config/lumiFeatureFlags.js'
import './PythonProtocolHub.css'

const LumiVerticalSliceExperience = lazy(() => import('./LumiVerticalSliceExperience'))
const LUMI_ADMIN_PREVIEW_EMAIL = 'paul@dulcine.net'

const ACT_UNIT_MAP = Object.freeze({
  'technical-spike-object-trace': 'lumi_protocol_spike_object_trace',
  'object-learning-pilot': 'lumi_protocol_pilot_object_core',
  'object-tactical-pilot': 'lumi_protocol_tactical_pilot',
  'object-frontier-pilot': 'lumi_protocol_frontier_pilot',
  'act-0-awakening': 'lumi_protocol_vertical_slice',
  'act-1-command': 'lumi_protocol_act_1_command',
  'act-2-memory': 'lumi_protocol_act_2_memory',
  'act-3-sensor': 'lumi_protocol_act_3_sensor',
  'act-4-decision': 'lumi_protocol_act_4_decision',
  'act-5-automation': 'lumi_protocol_act_5_automation',
  'act-6-persistence': 'lumi_protocol_act_6_persistence',
  'act-7-data': 'lumi_protocol_act_7_data',
  'act-8-ability': 'lumi_protocol_act_8_ability',
  'act-9-object-core': 'lumi_protocol_act_9_object_core',
  'act-final-the-lost-light': 'lumi_protocol_final_the_lost_light',
})

function isMissionSetComplete(actId, actProgressMap = {}) {
  const missionSet = getLumiMissionSet(actId)
  return hasCompletedMissionSet(actProgressMap[actId] || {}, missionSet)
}

function V2CourseHub({ course, actProgressMap = {}, isAdminPreview = false, onStartAct, onBack }) {
  const totalCoreMissions = course.acts.reduce((sum, act) => sum + act.coreMissions, 0)

  const act0Progress = actProgressMap['act-0-awakening'] || {}
  const act1Progress = actProgressMap['act-1-command'] || {}
  const act2Progress = actProgressMap['act-2-memory'] || {}

  const act0Completed = isMissionSetComplete('act-0-awakening', actProgressMap)
  const act1Completed = isMissionSetComplete('act-1-command', actProgressMap)
  const act2Completed = isMissionSetComplete('act-2-memory', actProgressMap)

  const courseCompletionMap = Object.fromEntries(course.acts.map((act) => [
    act.id,
    isMissionSetComplete(act.id, actProgressMap),
  ]))
  const actAccess = getSequentialActAccess(course, actProgressMap, isAdminPreview, courseCompletionMap)
  const currentActIndex = Math.max(0, course.acts.findIndex((act) => (
    actAccess[act.id] && !courseCompletionMap[act.id]
  )))

  const finalAct = course.acts.at(-1)
  const finalCompleted = courseCompletionMap[finalAct.id]
  const objectTraceCompleted = isMissionSetComplete('technical-spike-object-trace', actProgressMap)
  const objectLearningCompleted = isMissionSetComplete('object-learning-pilot', actProgressMap)
  const tacticalCompleted = isMissionSetComplete('object-tactical-pilot', actProgressMap)
  const frontierCompleted = isMissionSetComplete('object-frontier-pilot', actProgressMap)

  const advancedAccess = getAdvancedChallengeAccess({
    finalCompleted,
    objectTraceCompleted,
    objectLearningCompleted,
    tacticalCompleted,
  }, isAdminPreview)
  const canOpenObjectTrace = advancedAccess.objectTrace
  const canOpenObjectLearning = advancedAccess.objectLearning
  const canOpenTactical = advancedAccess.tactical
  const canOpenFrontier = advancedAccess.frontier

  const completed0MissionIds = new Set(act0Progress.completedMissionIds || [])
  const totalCompletedMissions = (act0Progress.completedMissionIds || []).length +
    (act1Progress.completedMissionIds || []).length +
    (act2Progress.completedMissionIds || []).length

  const topBadge = act2Completed
    ? 'ACT 2 완료 ✓'
    : act1Completed
      ? 'ACT 1 완료 ✓'
      : act0Completed
        ? 'ACT 0 완료 ✓'
        : `${completed0MissionIds.size}/10 CLEAR`

  return (
    <div className="lumi-course-hub">
      <div className="lumi-course-hub__stars" />
      <header className="lumi-course-hub__header">
        <button type="button" onClick={onBack} aria-label="파이썬 행성군집으로 돌아가기">←</button>
        <div>
          <span>LUMI PROTOCOL · SEASON 01</span>
          <h1>{course.title}</h1>
          <p>코드를 외우는 과정이 아니라, 고장 난 탐사 로봇의 능력을 하나씩 되찾는 Python 어드벤처입니다.</p>
        </div>
        <div className="lumi-course-hub__counter">
          <strong>{isAdminPreview ? '운영자 전체 미리보기' : topBadge}</strong>
          <small>전체 {totalCoreMissions}개 미션</small>
        </div>
      </header>

      <section className="lumi-course-hub__distress">
        <div className={`lumi-course-hub__signal ${act0Completed ? 'is-online' : ''}`} aria-hidden="true">
          <span className="lumi-course-hub__signal-ring lumi-course-hub__signal-ring--one" />
          <span className="lumi-course-hub__signal-ring lumi-course-hub__signal-ring--two" />
          {act0Completed ? (
            <svg width="48" height="48" viewBox="0 0 32 32" className="lumi-ship-svg lumi-ship-svg--awake">
              <path d="M 28 16 L 8 6 L 12 16 L 8 26 Z" fill="#00f3ff" stroke="#00f3ff" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="16" cy="16" r="3" fill="#ffffff" />
            </svg>
          ) : (
            <i>▲</i>
          )}
          <b style={{ color: act0Completed ? 'var(--lumi-mint)' : '#fa758d' }}>
            {act0Completed ? 'ONLINE 100%' : 'OFFLINE'}
          </b>
        </div>
        <div className="lumi-course-hub__transmission">
          <span>
            {act1Completed
              ? '◉ COMMAND CORE RESTORED · LIGHT ROUTE 7'
              : act0Completed
                ? '◉ EMERGENCY OVER · LIGHT ROUTE 7 RESTORED'
                : '◉ EMERGENCY TRANSMISSION · LIGHT ROUTE 7'}
          </span>
          <h2>
            {act1Completed
              ? '“관제사님! 명령 코어가 모두 복원되었어요!”'
              : act0Completed
                ? '“관제사님! 기본 항법 코어가 모두 복원되었어요!”'
                : '“관제사님… 제 항법 코어가 흩어졌어요.”'}
          </h2>
          <p>
            {act1Completed
              ? '다중 명령 순차 실행, 수식 표현식, 텔레메트리 출력과 주석 디버깅이 완전히 동기화되었습니다. 이제 다음 구역인 ACT 2 기억 코어(MEMORY CORE) 탐험을 진행할 수 있습니다.'
              : act0Completed
                ? '신호 폭풍을 이겨내고 이동·기억·센서·판단 코어가 완전히 동기화되었습니다. 이제 다음 구역인 ACT 1 명령 코어 탐험을 진행할 수 있습니다.'
                : '신호 폭풍으로 LUMI의 이동·기억·센서·판단 코어가 정지했습니다. 당신이 작성한 Python 코드만이 월드를 바꾸고, 사라진 빛의 항로를 다시 연결할 수 있습니다.'}
          </p>
          <div className="lumi-course-hub__mission-brief">
            <div>
              <small>현재 상황</small>
              <strong style={{ color: act0Completed ? 'var(--lumi-mint)' : '#d9f5ff' }}>
                {act1Completed ? 'COMMAND CORE 100%' : act0Completed ? 'LUMI 코어 ONLINE' : 'LUMI 전원 OFFLINE'}
              </strong>
            </div>
            <div>
              <small>복원 상태</small>
              <strong>
                {act1Completed ? `${totalCompletedMissions}개 코어 복원 완료` : act0Completed ? '10 / 10 코어 복원 완료' : '한 줄의 코드로 깨우기'}
              </strong>
            </div>
            <div>
              <small>현재 항로</small>
              <strong>{act1Completed ? 'ACT 2 · 6개 미션' : act0Completed ? 'ACT 1 · 5개 미션' : '10개 미션 · 약 40–70분'}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {act1Completed ? (
              <>
                <button type="button" onClick={() => onStartAct('act-2-memory', null)}>
                  ACT 2 기억 코어 탐험 시작 →
                </button>
                <button type="button" onClick={() => onStartAct('act-1-command', null)} style={{ background: '#122538', border: '1px solid #28445e' }}>
                  ACT 1 복습하기 ↺
                </button>
              </>
            ) : act0Completed ? (
              <>
                <button type="button" onClick={() => onStartAct('act-1-command', null)}>
                  ACT 1 명령 코어 탐험 시작 →
                </button>
                <button type="button" onClick={() => onStartAct('act-0-awakening', null)} style={{ background: '#122538', border: '1px solid #28445e' }}>
                  ACT 0 복습하기 ↺
                </button>
              </>
            ) : (
              <button type="button" onClick={() => onStartAct('act-0-awakening', null)}>
                긴급 재부팅 시작 →
              </button>
            )}
          </div>
          <em>
            {act1Completed
              ? '변수와 f-string, 자료형으로 루미의 기억 슬롯을 복원합니다.'
              : act0Completed
                ? '다중 명령 호출과 표현식으로 정규 명령 코어를 복원합니다.'
                : '첫 코드는 설명 없는 import가 아니라 lumi.wake() 한 줄에서 시작합니다.'}
          </em>
        </div>
      </section>

      {(LUMI_OBJECT_LEARNING_PILOT_ENABLED || LUMI_OBJECT_SPIKE_ENABLED || LUMI_TACTICAL_PILOT_ENABLED || LUMI_OBJECT_FRONTIER_ENABLED) && (
        <section className="lumi-course-hub__curriculum lumi-course-hub__advanced" style={{ marginBottom: '2rem' }}>
          <div className="lumi-course-hub__section-title">
            <div><span>EXTRA CHALLENGES</span><h2>객체와 자율항법 심화 도전</h2></div>
            <p>Python 기본 여정을 모두 마친 뒤, 객체의 원리부터 여러 드론을 제어하는 방법까지 차례대로 도전합니다.</p>
          </div>
          <div className="lumi-course-hub__acts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {LUMI_OBJECT_LEARNING_PILOT_ENABLED && (
              <Motion.article
                className={objectLearningCompleted ? 'is-act-completed' : canOpenObjectLearning ? 'is-pilot' : 'is-planned is-locked'}
                style={{ order: 2, '--challenge-color': '#38bdf8' }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="lumi-course-hub__act-top">
                  <span>심화 2 · 객체 기초</span>
                  <b>02</b>
                </div>
                <h3>클래스와 인스턴스</h3>
                <h4>루미의 설계도와 여러 실체 만들기</h4>
                <p>class, __init__, self를 이용해 각자 다른 상태를 가진 객체를 만듭니다.</p>
                <footer>
                  <span>6개 미션</span>
                  <span>{objectLearningCompleted ? '● 완료' : canOpenObjectLearning ? '● 학습 가능' : '🔒 이전 도전 완료 후 열림'}</span>
                </footer>
                <button
                  type="button"
                  disabled={!canOpenObjectLearning}
                  onClick={() => onStartAct('object-learning-pilot', null)}
                >
                  {objectLearningCompleted ? '객체 기초 다시 보기 ↺' : canOpenObjectLearning ? '객체 기초 시작 →' : '객체 원리를 먼저 완료하세요'}
                </button>
              </Motion.article>
            )}
            {LUMI_TACTICAL_PILOT_ENABLED && (
              <Motion.article
                className={tacticalCompleted ? 'is-act-completed' : canOpenTactical ? 'is-pilot' : 'is-planned is-locked'}
                style={{ order: 3, '--challenge-color': '#10b981' }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="lumi-course-hub__act-top">
                  <span>심화 3 · 편대 제어</span>
                  <b>03</b>
                </div>
                <h3>여러 드론 제어하기</h3>
                <h4>객체 목록과 반복으로 편대 정화</h4>
                <p>여러 객체를 리스트와 for로 순회하며 같은 명령을 안전하게 적용합니다.</p>
                <footer>
                  <span>1개 종합 미션 · 변형 2개</span>
                  <span>{tacticalCompleted ? '● 완료' : canOpenTactical ? '● 도전 가능' : '🔒 이전 도전 완료 후 열림'}</span>
                </footer>
                <button
                  type="button"
                  disabled={!canOpenTactical}
                  onClick={() => onStartAct('object-tactical-pilot', null)}
                >
                  {tacticalCompleted ? '편대 제어 다시 보기 ↺' : canOpenTactical ? '편대 제어 도전 →' : '객체 기초를 먼저 완료하세요'}
                </button>
              </Motion.article>
            )}
            {LUMI_OBJECT_FRONTIER_ENABLED && (
              <Motion.article
                className={frontierCompleted ? 'is-act-completed' : canOpenFrontier ? 'is-pilot' : 'is-planned is-locked'}
                style={{ order: 4, '--challenge-color': '#c084fc' }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="lumi-course-hub__act-top">
                  <span>심화 4 · 객체 확장</span>
                  <b>04</b>
                </div>
                <h3>객체 능력 확장하기</h3>
                <h4>상속 · 메서드 재정의 · 부품 합성</h4>
                <p>기존 설계도를 확장하고 여러 부품 객체를 조합해 더 강력한 드론을 만듭니다.</p>
                <footer>
                  <span>3개 심화 미션</span>
                  <span>{frontierCompleted ? '● 완료' : canOpenFrontier ? '● 도전 가능' : '🔒 이전 도전 완료 후 열림'}</span>
                </footer>
                <button
                  type="button"
                  disabled={!canOpenFrontier}
                  onClick={() => onStartAct('object-frontier-pilot', null)}
                >
                  {frontierCompleted ? '객체 확장 다시 보기 ↺' : canOpenFrontier ? '객체 확장 도전 →' : '편대 제어를 먼저 완료하세요'}
                </button>
              </Motion.article>
            )}
            {LUMI_OBJECT_SPIKE_ENABLED && (
              <Motion.article
                className={objectTraceCompleted ? 'is-act-completed' : canOpenObjectTrace ? 'is-current' : 'is-planned is-locked'}
                style={{ order: 1, '--challenge-color': '#f8ba4c' }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="lumi-course-hub__act-top">
                  <span>심화 1 · 객체 원리</span>
                  <b>01</b>
                </div>
                <h3>객체의 탄생</h3>
                <h4>설계도에서 첫 인스턴스 만들기</h4>
                <p>하나의 클래스에서 여러 객체가 만들어지고 각자의 상태를 갖는 원리를 관찰합니다.</p>
                <footer>
                  <span>2개 미션</span>
                  <span>{objectTraceCompleted ? '● 완료' : canOpenObjectTrace ? '● 도전 가능' : '🔒 기본 여정 완료 후 열림'}</span>
                </footer>
                <button
                  type="button"
                  disabled={!canOpenObjectTrace}
                  onClick={() => onStartAct('technical-spike-object-trace', null)}
                >
                  {objectTraceCompleted ? '객체 원리 다시 보기 ↺' : canOpenObjectTrace ? '객체 원리 도전 →' : '기본 여정을 먼저 완료하세요'}
                </button>
              </Motion.article>
            )}
          </div>
        </section>
      )}

      <section className="lumi-course-hub__curriculum lumi-course-hub__core-map">
        <div className="lumi-course-hub__section-title">
          <div><span>PYTHON LEARNING JOURNEY</span><h2>루미와 함께 배우는 Python</h2></div>
          <p>한 과정을 완료하면 다음 과정이 열립니다. 기초 명령부터 객체와 자율항법까지 순서대로 성장하세요.</p>
        </div>
        <div className="lumi-course-hub__acts">
          {course.acts.map((act, index) => {
            const isCompletedAct = courseCompletionMap[act.id]
            const isUnlocked = actAccess[act.id]
            const isCurrent = isUnlocked && !isCompletedAct && index === currentActIndex

            return (
              <Motion.article
                key={act.id}
                className={isCompletedAct ? 'is-act-completed' : isCurrent ? 'is-current' : isUnlocked ? 'is-pilot' : 'is-planned'}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.3) }}
              >
                <div className="lumi-course-hub__act-top">
                  <span>
                    {isCompletedAct
                      ? '✓ 완료'
                      : isCurrent
                        ? '지금 학습할 과정'
                        : isUnlocked
                          ? isAdminPreview ? '운영자 미리보기' : '학습 가능'
                          : '🔒 이전 과정 완료 후 열림'}
                  </span>
                  <b>{index < 9 ? String(index).padStart(2, '0') : 'Ω'}</b>
                </div>
                <h3>{act.title}</h3>
                <h4>{act.subtitle}</h4>
                <p>{act.concepts}</p>
                <footer>
                  <span>{act.coreMissions}개 미션</span>
                  <span style={{ color: isCompletedAct || isUnlocked ? 'var(--lumi-mint)' : undefined }}>
                    {isCompletedAct ? '● 완료' : isUnlocked ? '● 학습 가능' : '● 잠김'}
                  </span>
                </footer>
                <button
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => onStartAct(act.id, null)}
                  style={isCurrent ? { borderColor: 'var(--lumi-mint)', background: 'rgba(85, 241, 200, 0.15)' } : undefined}
                >
                  {isCompletedAct
                    ? `✓ ${act.title.split('.')[0]} 다시 보기 ↺`
                    : isUnlocked
                      ? `${act.title.split('.')[0]} ${isCurrent ? '탐험 시작 →' : '시작 →'}`
                      : '이전 과정을 먼저 완료하세요'}
                </button>
              </Motion.article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function LegacyProtocolHub({ unitProgressMap, onEnterMission, onBack }) {
  const setsById = new Map(getBuiltinPythonMissionSets().map((set) => [set.id, set]))
  const entries = PYTHON_PROTOCOL_ENTRY_UNITS.map((entry) => ({ ...entry, missionSet: setsById.get(entry.setId), completed: unitProgressMap[entry.unitId]?.missionLab === true }))
  const completedCount = entries.filter((entry) => entry.completed).length
  const nextEntry = entries.find((entry) => !entry.completed) || entries[0]

  return (
    <div className="python-protocol-hub">
      <div className="python-protocol-hub__stars" />
      <header>
        <button type="button" onClick={onBack} aria-label="파이썬 행성군집으로 돌아가기">←</button>
        <div><span>LUMI PROTOCOL · LEGACY LAB</span><h1>루미 항법 코어를 복원하세요</h1><p>기존 단원 연결 화면입니다.</p></div>
        <div className="python-protocol-hub__progress"><strong>{completedCount}/4</strong><small>PROTOCOL MODULES</small></div>
      </header>
      <section className="python-protocol-hub__hero">
        <div className="python-protocol-hub__core" aria-hidden="true"><span className="python-protocol-hub__orbit python-protocol-hub__orbit--one" /><span className="python-protocol-hub__lumi">▲</span></div>
        <div><span className="python-protocol-hub__eyebrow">CURRENT DIRECTIVE</span><h2>{nextEntry.title} 프로토콜</h2><p>기존 단원 기반 Mission Lab입니다.</p><button type="button" onClick={() => onEnterMission?.(nextEntry.unitId)}>다음 프로토콜 시작 →</button></div>
      </section>
      <main>
        {entries.map((entry) => (
          <article key={entry.setId} style={{ '--protocol-color': entry.color }}>
            <div className="python-protocol-hub__module-icon">{entry.icon}</div><span>{entry.title}</span><h3>{entry.title}</h3><p>{entry.missionSet?.description}</p>
            <div className="python-protocol-hub__meta"><code>{entry.concept}</code><small>{entry.missionSet?.missions.length || 0} MISSIONS</small></div>
            <button type="button" onClick={() => onEnterMission?.(entry.unitId)}>MISSION LAB 진입</button>
          </article>
        ))}
      </main>
    </div>
  )
}

export default function PythonProtocolHub({ unitProgressMap = {}, onEnterMission, onEnterVerticalSlice, onBack, v2Enabled = true }) {
  const { user } = useAuth()
  const [verticalSliceOpen, setVerticalSliceOpen] = useState(false)
  const [selectedActId, setSelectedActId] = useState('act-0-awakening')
  const [targetMissionIndex, setTargetMissionIndex] = useState(null)

  const [actProgressMap, setActProgressMap] = useState(() => {
    const map = {}
    try {
      if (typeof localStorage !== 'undefined') {
        Object.keys(ACT_UNIT_MAP).forEach((actId) => {
          const local = localStorage.getItem(`metasense:lumi-progress:${actId}`) || (
            actId === 'act-0-awakening' ? localStorage.getItem('metasense:lumi-progress:v1') : null
          )
          if (local) map[actId] = JSON.parse(local)
        })
      }
    } catch {
      // ignore
    }
    return map
  })

  useEffect(() => {
    let active = true
    if (!user?.uid) return () => { active = false }

    const acts = Object.keys(ACT_UNIT_MAP)
    acts.forEach((actId) => {
      const docKey = ACT_UNIT_MAP[actId] || `lumi_protocol_${actId.replace(/-/g, '_')}`
      getDoc(doc(db, 'users', user.uid, 'learning_progress', docKey))
        .then((snapshot) => {
          if (active && snapshot.exists()) {
            const remoteProgress = snapshot.data()?.missionLab || {}
            setActProgressMap((prev) => ({
              ...prev,
              [actId]: { ...(prev[actId] || {}), ...remoteProgress },
            }))
          }
        })
        .catch((error) => console.warn(`LUMI progress load failed for ${actId}:`, error))
    })

    return () => { active = false }
  }, [user?.uid, verticalSliceOpen])

  const isLegacy = typeof localStorage !== 'undefined' && localStorage.getItem('lumiProtocolLegacy') === 'true'
  const isV2 = v2Enabled && !isLegacy
  const course = getLumiCourseCatalog()

  const startAct = (actId = 'act-0-awakening', missionIndex = null) => {
    setSelectedActId(actId)
    setTargetMissionIndex(missionIndex)
    if (onEnterVerticalSlice) {
      onEnterVerticalSlice(getLumiMissionSet(actId))
    } else {
      setVerticalSliceOpen(true)
    }
  }

  if (verticalSliceOpen) {
    return (
      <Suspense fallback={<div className="python-protocol-hub">LUMI Protocol을 불러오는 중입니다…</div>}>
        <LumiVerticalSliceExperience
          actId={selectedActId}
          initialMissionIndex={targetMissionIndex}
          onBack={() => setVerticalSliceOpen(false)}
        />
      </Suspense>
    )
  }
  if (isV2) {
    return (
      <V2CourseHub
        course={course}
        actProgressMap={actProgressMap}
        isAdminPreview={String(user?.email || '').toLowerCase() === LUMI_ADMIN_PREVIEW_EMAIL}
        onStartAct={startAct}
        onBack={onBack}
      />
    )
  }
  return <LegacyProtocolHub unitProgressMap={unitProgressMap} onEnterMission={onEnterMission} onBack={onBack} />
}
