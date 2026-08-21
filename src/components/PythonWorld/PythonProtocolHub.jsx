import { lazy, Suspense, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  getBuiltinPythonMissionSets,
  PYTHON_PROTOCOL_ENTRY_UNITS,
  getLumiCourseCatalog,
  getLumiVerticalSliceSet,
} from './pythonMissionCatalog'
import './PythonProtocolHub.css'

const LumiVerticalSliceExperience = lazy(() => import('./LumiVerticalSliceExperience'))

function isLocalV2Enabled() {
  try {
    return localStorage.getItem('lumiProtocolV2') === 'true'
  } catch {
    return false
  }
}

function V2CourseHub({ course, missionSet, onStart, onBack }) {
  const totalCoreMissions = course.acts.reduce((sum, act) => sum + act.coreMissions, 0)
  const pilotMissionCounts = missionSet.missions.reduce((counts, mission) => {
    counts[mission.actId] = (counts[mission.actId] || 0) + 1
    return counts
  }, {})

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
        <div className="lumi-course-hub__counter"><strong>10 ACTS</strong><small>{totalCoreMissions} CORE MISSIONS</small></div>
      </header>

      <section className="lumi-course-hub__distress">
        <div className="lumi-course-hub__signal" aria-hidden="true">
          <span className="lumi-course-hub__signal-ring lumi-course-hub__signal-ring--one" />
          <span className="lumi-course-hub__signal-ring lumi-course-hub__signal-ring--two" />
          <i>▲</i><b>OFFLINE</b>
        </div>
        <div className="lumi-course-hub__transmission">
          <span>◉ EMERGENCY TRANSMISSION · LIGHT ROUTE 7</span>
          <h2>“관제사님… 제 항법 코어가 흩어졌어요.”</h2>
          <p>신호 폭풍으로 LUMI의 이동·기억·센서·판단 코어가 정지했습니다. 당신이 작성한 Python 코드만이 월드를 바꾸고, 사라진 빛의 항로를 다시 연결할 수 있습니다.</p>
          <div className="lumi-course-hub__mission-brief">
            <div><small>현재 상황</small><strong>LUMI 전원 OFFLINE</strong></div>
            <div><small>첫 목표</small><strong>한 줄의 코드로 깨우기</strong></div>
            <div><small>파일럿 항로</small><strong>10개 미션 · 약 40–70분</strong></div>
          </div>
          <button type="button" onClick={onStart}>긴급 재부팅 시작 <span>→</span></button>
          <em>첫 코드는 설명 없는 import가 아니라 <code>lumi.wake()</code> 한 줄에서 시작합니다.</em>
        </div>
      </section>

      <section className="lumi-course-hub__pilot" aria-label="첫 10개 파일럿 미션">
        <div className="lumi-course-hub__section-title">
          <div><span>PLAYABLE NOW</span><h2>첫 번째 구조 항로</h2></div>
          <p>RUN만 누르는 경험에서 시작해 변수·센서·첫 if까지 도구가 하나씩 열립니다.</p>
        </div>
        <ol>
          {missionSet.missions.map((mission, index) => (
            <li key={mission.id} className={index === 0 ? 'is-current' : ''}>
              <span>{String(index + 1).padStart(2, '0')}</span><strong>{mission.title}</strong><small>{mission.concepts.join(' · ')}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="lumi-course-hub__curriculum">
        <div className="lumi-course-hub__section-title">
          <div><span>FULL CURRICULUM MAP</span><h2>10개 코어 복원 지도</h2></div>
          <p>input은 관제 입력 패널로, split/join은 신호 패킷으로, tuple은 좌표로 학습합니다.</p>
        </div>
        <div className="lumi-course-hub__acts">
          {course.acts.map((act, index) => {
            const pilotCount = pilotMissionCounts[act.id] || 0
            const current = index === 0
            return (
              <Motion.article
                key={act.id}
                className={current ? 'is-current' : pilotCount ? 'is-pilot' : 'is-planned'}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.3) }}
              >
                <div className="lumi-course-hub__act-top"><span>{current ? 'CURRENT ACT' : pilotCount ? `${pilotCount} PILOT MISSIONS` : 'CURRICULUM READY'}</span><b>{index < 9 ? String(index).padStart(2, '0') : 'Ω'}</b></div>
                <h3>{act.title}</h3><h4>{act.subtitle}</h4><p>{act.concepts}</p>
                <footer><span>{act.coreMissions} CORE</span><span>{current ? '● ONLINE' : '○ LOCKED'}</span></footer>
                {current && <button type="button" onClick={onStart}>ACT 0 시작 →</button>}
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

export default function PythonProtocolHub({ unitProgressMap = {}, onEnterMission, onEnterVerticalSlice, onBack, v2Enabled = false }) {
  const [verticalSliceOpen, setVerticalSliceOpen] = useState(false)
  const isV2 = v2Enabled
    || import.meta.env.DEV
    || import.meta.env.VITE_LUMI_PROTOCOL_V2 === 'true'
    || isLocalV2Enabled()
  const missionSet = getLumiVerticalSliceSet()
  const course = getLumiCourseCatalog()
  const startVerticalSlice = () => onEnterVerticalSlice ? onEnterVerticalSlice(missionSet) : setVerticalSliceOpen(true)

  if (verticalSliceOpen) {
    return (
      <Suspense fallback={<div className="python-protocol-hub">LUMI Protocol을 불러오는 중입니다…</div>}>
        <LumiVerticalSliceExperience onBack={() => setVerticalSliceOpen(false)} />
      </Suspense>
    )
  }
  if (isV2) return <V2CourseHub course={course} missionSet={missionSet} onStart={startVerticalSlice} onBack={onBack} />
  return <LegacyProtocolHub unitProgressMap={unitProgressMap} onEnterMission={onEnterMission} onBack={onBack} />
}
