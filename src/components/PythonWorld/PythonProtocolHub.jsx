import { motion as Motion } from 'framer-motion'
import { getBuiltinPythonMissionSets, PYTHON_PROTOCOL_ENTRY_UNITS } from './pythonMissionCatalog'
import './PythonProtocolHub.css'

export default function PythonProtocolHub({ unitProgressMap = {}, onEnterMission, onBack }) {
  const setsById = new Map(getBuiltinPythonMissionSets().map((set) => [set.id, set]))
  const entries = PYTHON_PROTOCOL_ENTRY_UNITS.map((entry) => ({
    ...entry,
    missionSet: setsById.get(entry.setId),
    completed: unitProgressMap[entry.unitId]?.missionLab === true,
  }))
  const completedCount = entries.filter((entry) => entry.completed).length
  const nextEntry = entries.find((entry) => !entry.completed) || entries[0]

  return (
    <div className="python-protocol-hub">
      <div className="python-protocol-hub__stars" />
      <header>
        <button type="button" onClick={() => onBack?.()} aria-label="파이썬 행성군집으로 돌아가기">←</button>
        <div>
          <span>LUMI PROTOCOL · PYTHON WORLD</span>
          <h1>루미 항법 코어를 복원하세요</h1>
          <p>Data Log와 Code Trace에서 익힌 Python을 실제 탐사 능력으로 전환합니다.</p>
        </div>
        <div className="python-protocol-hub__progress">
          <strong>{completedCount}/4</strong>
          <small>PROTOCOL MODULES</small>
        </div>
      </header>

      <section className="python-protocol-hub__hero">
        <div className="python-protocol-hub__core" aria-hidden="true">
          <span className="python-protocol-hub__orbit python-protocol-hub__orbit--one" />
          <span className="python-protocol-hub__orbit python-protocol-hub__orbit--two" />
          <span className="python-protocol-hub__lumi">▲</span>
        </div>
        <div>
          <span className="python-protocol-hub__eyebrow">CURRENT DIRECTIVE</span>
          <h2>{nextEntry.title} 프로토콜</h2>
          <p>같은 루미를 계속 프로그래밍하며 판단·반복·함수 능력을 단계적으로 복원합니다.</p>
          <button type="button" onClick={() => onEnterMission?.(nextEntry.unitId)}>
            {nextEntry.completed ? '프로토콜 다시 실행' : '다음 프로토콜 시작'} <span>→</span>
          </button>
        </div>
      </section>

      <main>
        {entries.map((entry, index) => (
          <Motion.article
            key={entry.setId}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            style={{ '--protocol-color': entry.color }}
          >
            <div className="python-protocol-hub__module-icon">{entry.icon}</div>
            <span>MODULE {String(index + 1).padStart(2, '0')}</span>
            <h3>{entry.title}</h3>
            <p>{entry.missionSet?.description}</p>
            <div className="python-protocol-hub__meta">
              <code>{entry.concept}</code>
              <small>{entry.missionSet?.missions.length || 0} MISSIONS</small>
            </div>
            <button type="button" onClick={() => onEnterMission?.(entry.unitId)}>
              {entry.completed ? '✓ 완료 · 다시 실행' : 'MISSION LAB 진입'}
            </button>
          </Motion.article>
        ))}
      </main>

      <footer>
        <span>DATA LOG</span><i>→</i><span>CODE TRACE</span><i>→</i><strong>MISSION LAB</strong><i>→</i><span>FIELD TEST</span>
      </footer>
    </div>
  )
}
