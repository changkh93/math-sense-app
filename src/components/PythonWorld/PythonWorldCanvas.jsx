import { useMemo } from 'react'
import { normalizeRuntimeEvents } from './lumiEventNormalizer.js'
import { reduceLumiWorldState } from './lumiWorldReducer.js'

export default function PythonWorldCanvas({ mission, events = [], playhead = -1, showHud = true, showSensor = true }) {
  const normalizedEvents = useMemo(() => normalizeRuntimeEvents(events), [events])
  const targetSeq = playhead < 0 ? -1 : (normalizedEvents[playhead]?.seq ?? playhead)

  const worldState = useMemo(() => {
    return reduceLumiWorldState(mission?.world || {}, normalizedEvents, targetSeq)
  }, [mission?.world, normalizedEvents, targetSeq])

  const width = Math.max(1, Number(worldState.width) || 8)
  const height = Math.max(1, Number(worldState.height) || 5)
  const rover = worldState.rover || { x: 0, y: 0, direction: 0, energy: 100, awake: true }
  const target = worldState.target || { x: width - 1, y: Math.floor(height / 2), kind: 'beacon' }
  const obstacles = worldState.obstacles || []
  const objects = (worldState.objects || []).filter((item) => !item.collected)
  const isAwake = Boolean(rover.awake)
  const lastSpeech = rover.lastMessage
  const activeSensor = showSensor ? worldState.sensorReadings?.steps_to_target : undefined

  const cellStyle = (x, y) => ({
    left: `${((x + 0.5) / width) * 100}%`,
    top: `${((y + 0.5) / height) * 100}%`,
  })

  return (
    <section className={`python-world ${!isAwake ? 'is-dark-awakening' : ''}`} aria-label="루미 미션 월드">
      <div className="python-world__sky" />
      {!isAwake && (
        <>
          <div className="python-world__awakening-copy">
            <span>UNKNOWN SIGNAL DETECTED</span>
            <strong>LUMI CORE · NO RESPONSE</strong>
            <small>오른쪽의 코드를 실행해 비상 전원을 연결하세요</small>
          </div>
          <div className="python-world__offline-core" aria-hidden="true">
            <span className="python-world__offline-ring python-world__offline-ring--one" />
            <span className="python-world__offline-ring python-world__offline-ring--two" />
            <i>▲</i><b>POWER 0%</b>
          </div>
        </>
      )}
      <div
        className="python-world__grid"
        style={{ '--grid-columns': width, '--grid-rows': height }}
      >
        {obstacles.map((obstacle, index) => (
          <div
            className="python-world__obstacle"
            key={`${obstacle.x}-${obstacle.y}-${index}`}
            style={cellStyle(obstacle.x, obstacle.y)}
          >
            ◆
          </div>
        ))}
        {objects.map((item, index) => (
          <div
            className={`python-world__object python-world__object--${item.kind || 'signal'}`}
            key={item.id || `${item.kind}-${index}`}
            style={cellStyle(item.x, item.y)}
            title={`${item.kind || 'signal'} (${item.x}, ${item.y})`}
          >
            {item.kind === 'charge' ? '⚡' : item.kind === 'sample' ? '◆' : '◈'}
          </div>
        ))}
        <div className="python-world__beacon" style={cellStyle(target.x, target.y)}>
          <span className="python-world__beacon-core" />
          <span className="python-world__beacon-label">TARGET</span>
          {activeSensor !== undefined && (
            <span className="python-world__sensor-badge">{activeSensor} STEPS</span>
          )}
        </div>
        <div
          className={`python-world__rover ${!isAwake ? 'python-world__rover--sleeping' : 'python-world__rover--awake'}`}
          style={{ ...cellStyle(rover.x, rover.y), '--rover-rotation': `${Number(rover.direction) || 0}deg` }}
        >
          <span className="python-world__rover-glow" />
          <span className="python-world__rover-body">{isAwake ? '▲' : '●'}</span>
          <span className="python-world__rover-label">{isAwake ? 'LUMI' : 'OFFLINE'}</span>
          {lastSpeech && (
            <div className="python-world__speech-bubble" role="status">
              💬 "{lastSpeech}"
            </div>
          )}
        </div>
      </div>
      {showHud && (
        <div className="python-world__hud">
          <span>코어: {isAwake ? 'ONLINE' : 'STANDBY'}</span>
          <span>좌표 {rover.x}, {rover.y}</span>
          <span>에너지 {rover.energy ?? 100}</span>
          <span>방향 {rover.direction ?? 0}°</span>
        </div>
      )}
    </section>
  )
}
