import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizeRuntimeEvents } from './lumiEventNormalizer.js'
import { reduceLumiWorldState } from './lumiWorldReducer.js'
import { reduceExecutionTraceState } from './executionTraceReducer.js'
import { projectTacticalEvents } from './lumiTacticalEventProjector.js'
import { reduceTacticalState } from './lumiTacticalReducer.js'
import LumiTacticalWorldLayer from './LumiTacticalWorldLayer.jsx'
import { playLumiSound } from './lumiAudio.js'

function MemoryHologramOverlay({ fragment, onClose }) {
  const [timeLeft, setTimeLeft] = useState(fragment.duration || 2500)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    playLumiSound('hologram')
  }, [])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const duration = fragment.duration || 2500
    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, duration - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onCloseRef.current?.()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [fragment.duration])

  return (
    <div className="lumi-hologram-memory" role="alert">
      <div className="lumi-hologram-memory__backdrop" onClick={onClose} />
      <div className="lumi-hologram-memory__box">
        <div className="lumi-hologram-memory__header">
          <span className="lumi-hologram-memory__badge">📡 DAMAGED COMMAND MEMORY</span>
          <small>{fragment.label || '손상된 명령 신호 파편'}</small>
        </div>
        <pre className="lumi-hologram-memory__code">{fragment.code}</pre>
        <div className="lumi-hologram-memory__progress">
          <div
            className="lumi-hologram-memory__bar"
            style={{ width: `${(timeLeft / (fragment.duration || 2500)) * 100}%` }}
          />
        </div>
        <div className="lumi-hologram-memory__footer">
          <span>기억 신호 감쇄 중: {(timeLeft / 1000).toFixed(1)}s</span>
          <button type="button" onClick={onClose}>복원 시작 →</button>
        </div>
      </div>
    </div>
  )
}

export default function PythonWorldCanvas({
  mission,
  events = [],
  playhead = -1,
  showHud = true,
  showSensor = true,
  isTransmitting = false,
  result = null,
}) {
  const normalizedEvents = useMemo(() => normalizeRuntimeEvents(events), [events])
  const targetSeq = playhead < 0 ? -1 : (normalizedEvents[playhead]?.seq ?? playhead)

  const worldState = useMemo(() => {
    return reduceLumiWorldState(mission?.world || {}, normalizedEvents, targetSeq)
  }, [mission?.world, normalizedEvents, targetSeq])

  const execTraceState = useMemo(() => {
    return reduceExecutionTraceState(normalizedEvents, targetSeq < 0 ? Infinity : targetSeq)
  }, [normalizedEvents, targetSeq])

  const tacticalState = useMemo(() => {
    if (!mission?.isTacticalMission) return null
    const tacticalEvents = projectTacticalEvents(normalizedEvents, mission)
    return reduceTacticalState(tacticalEvents, targetSeq)
  }, [mission, normalizedEvents, targetSeq])

  const instances = useMemo(() => Object.values(execTraceState.instances || {}), [execTraceState])

  const fragment = mission?.memoryFragment
  const [manualKey, setManualKey] = useState(null)
  const [dismissedMissions, setDismissedMissions] = useState({})

  const isDismissed = Boolean(mission?.id && dismissedMissions[mission.id])
  const showHologram = Boolean(fragment && (manualKey || (fragment.autoPlay && !isDismissed)))

  const handleCloseHologram = () => {
    setManualKey(null)
    if (mission?.id) {
      setDismissedMissions((prev) => ({ ...prev, [mission.id]: true }))
    }
  }

  const replayHologram = () => {
    if (!fragment) return
    setManualKey(Date.now())
  }

  const isObjectMission = Boolean(mission?.isPilot || mission?.isSpike || mission?.isObjectMission || mission?.actId === 'object-learning-pilot')
  const width = Math.max(1, Number(worldState.width) || 8)
  const height = Math.max(1, Number(worldState.height) || 5)
  const rover = worldState.rover || { x: 0, y: 0, direction: 0, energy: 100, awake: true }
  const target = worldState.target || { x: width - 1, y: Math.floor(height / 2), kind: 'beacon' }
  const obstacles = worldState.obstacles || []
  const objects = (worldState.objects || []).filter((item) => !item.collected)
  const isAwake = Boolean(rover.awake)
  const lastSpeech = rover.lastMessage || (result?.cleared ? mission?.lumiVoice : null)
  const activeSensor = showSensor ? worldState.sensorReadings?.steps_to_target : undefined

  const cellStyle = (x, y) => ({
    left: `${((x + 0.5) / width) * 100}%`,
    top: `${((y + 0.5) / height) * 100}%`,
  })

  return (
    <section className={`python-world ${!isAwake ? 'is-dark-awakening' : ''} ${result?.cleared ? 'is-mission-cleared' : ''}`} aria-label="루미 미션 월드">
      <div className="python-world__sky" />

      {/* Damaged Memory Hologram Overlay */}
      {showHologram && fragment && (
        <MemoryHologramOverlay
          key={`${mission?.id}-${manualKey || 'auto'}`}
          fragment={fragment}
          onClose={handleCloseHologram}
        />
      )}

      {/* Drone Assembly Header for Object Missions */}
      {isObjectMission && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid #38bdf8',
          borderRadius: '20px',
          padding: '5px 18px',
          color: '#bae6fd',
          fontSize: '0.8rem',
          fontWeight: 600,
          zIndex: 10,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}>
          <span style={{ color: '#38bdf8' }}>🛠️</span>
          <span>드론 조립실: 코드로 생성한 드론이 착륙장에 실시간으로 조립됩니다.</span>
        </div>
      )}

      {/* Re-trigger Hologram Button */}
      {fragment && !showHologram && (
        <button
          type="button"
          className="lumi-memory-retrigger-btn"
          onClick={replayHologram}
          title="손상된 명령 기억 파편 다시 보기"
        >
          📡 기억 신호 다시 수신
        </button>
      )}

      {/* Signal Transmission Beam when RUN is pressed */}
      {isTransmitting && (
        <div className="lumi-transmission-beam">
          <div className="lumi-transmission-beam__core" />
          <span>⚡ TRANSMITTING COMMAND TO LUMI...</span>
        </div>
      )}

      {!isAwake && (
        <div className="python-world__awakening-banner">
          <span className="python-world__awakening-tag">EMERGENCY STANDBY</span>
          <strong>LUMI CORE OFFLINE</strong>
          <small>명령 신호를 전송하여 탐사 로봇을 깨우세요</small>
        </div>
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
        {!isObjectMission && (
          <div className="python-world__beacon" style={cellStyle(target.x, target.y)}>
            <span className="python-world__beacon-core" />
            <span className="python-world__beacon-label">TARGET</span>
            {activeSensor !== undefined && (
              <span className="python-world__sensor-badge">{activeSensor} STEPS</span>
            )}
          </div>
        )}

        {/* Real-time Drone Visualization on Assembly Pads */}
        {isObjectMission && (
          <>
            {/* Slot 1: scout_1 */}
            {(() => {
              const inst1 = instances[0]
              const isSelf1 = execTraceState.activeSelfRef === inst1?.id
              const x1 = Math.min(width - 1, Math.max(0, Math.floor(width * 0.38)))
              const y1 = Math.floor(height / 2)
              return (
                <div
                  className="python-world__drone-dock"
                  style={{
                    ...cellStyle(x1, y1),
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 6,
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: inst1 ? (isSelf1 ? '3px solid #facc15' : '2px solid #38bdf8') : '1.5px dashed rgba(56, 189, 248, 0.4)',
                    background: inst1 ? 'rgba(15, 23, 42, 0.88)' : 'rgba(15, 23, 42, 0.3)',
                    boxShadow: inst1 ? (isSelf1 ? '0 0 20px #facc15' : '0 0 14px rgba(56, 189, 248, 0.5)') : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                  }}>
                    {inst1 ? (
                      <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>🚁</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>1번 패드</span>
                    )}
                  </div>
                  <div style={{ marginTop: '5px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {inst1 ? (
                      <>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelf1 ? '#facc15' : '#38bdf8', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                          {inst1.publicAttributes?.name ? `${inst1.publicAttributes.name} (${inst1.primaryBinding || 'scout_1'})` : (inst1.primaryBinding || inst1.className)}
                        </div>
                        {inst1.publicAttributes?.integrity !== undefined && (
                          <div style={{ fontSize: '0.7rem', color: '#55f1c8', fontWeight: 600, marginTop: '1px' }}>
                            ⚡ 내구도 {inst1.publicAttributes.integrity}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>드론 조립 대기</span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Slot 2: scout_2 */}
            {(() => {
              const inst2 = instances[1]
              const isSelf2 = execTraceState.activeSelfRef === inst2?.id
              const x2 = Math.min(width - 1, Math.max(0, Math.floor(width * 0.72)))
              const y2 = Math.floor(height / 2)
              return (
                <div
                  className="python-world__drone-dock"
                  style={{
                    ...cellStyle(x2, y2),
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 6,
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: inst2 ? (isSelf2 ? '3px solid #facc15' : '2px solid #a855f7') : '1.5px dashed rgba(168, 85, 247, 0.4)',
                    background: inst2 ? 'rgba(15, 23, 42, 0.88)' : 'rgba(15, 23, 42, 0.3)',
                    boxShadow: inst2 ? (isSelf2 ? '0 0 20px #facc15' : '0 0 14px rgba(168, 85, 247, 0.5)') : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                  }}>
                    {inst2 ? (
                      <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>🛸</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>2번 패드</span>
                    )}
                  </div>
                  <div style={{ marginTop: '5px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {inst2 ? (
                      <>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelf2 ? '#facc15' : '#c084fc', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                          {inst2.publicAttributes?.name ? `${inst2.publicAttributes.name} (${inst2.primaryBinding || 'scout_2'})` : (inst2.primaryBinding || inst2.className)}
                        </div>
                        {inst2.publicAttributes?.integrity !== undefined && (
                          <div style={{ fontSize: '0.7rem', color: '#55f1c8', fontWeight: 600, marginTop: '1px' }}>
                            ⚡ 내구도 {inst2.publicAttributes.integrity}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>드론 조립 대기</span>
                    )}
                  </div>
                </div>
              )
            })()}
          </>
        )}

        {/* Tactical Fleet Layer */}
        {mission?.isTacticalMission && (
          <LumiTacticalWorldLayer tacticalState={tacticalState} width={width} height={height} />
        )}

        {/* 1.8x Scaled LUMI Rover with Alive Character Presence */}
        <div
          className={`python-world__rover ${!isAwake ? 'python-world__rover--sleeping' : 'python-world__rover--awake'}`}
          style={{ ...cellStyle(rover.x, rover.y), '--rover-rotation': `${Number(rover.direction) || 0}deg` }}
        >
          {/* Faint broken circular gauge for sleeping state */}
          {!isAwake && (
            <div className="python-world__broken-gauge" aria-hidden="true" />
          )}

          {/* Glowing orbital rings for awake state */}
          {isAwake && (
            <>
              <span className="python-world__rover-orbit python-world__rover-orbit--one" />
              <span className="python-world__rover-orbit python-world__rover-orbit--two" />
            </>
          )}

          <span className="python-world__rover-glow" />
          <div className="python-world__rover-body">
            <svg
              className="python-world__rover-svg"
              viewBox="0 0 48 40"
              width="48"
              height="40"
              aria-label="루미 탐사선"
            >
              <defs>
                <linearGradient id="lumiHullGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="55%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
                <linearGradient id="lumiVisorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#5eead4" />
                </linearGradient>
                <filter id="lumiGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Active Propulsion Thruster Flames (Rear / Tail) */}
              {isAwake && (
                <g className="python-world__rover-flames">
                  <polygon points="12,13 2,14 12,15" fill="#38bdf8" opacity="0.9" />
                  <polygon points="12,25 2,26 12,27" fill="#38bdf8" opacity="0.9" />
                  <circle cx="12" cy="14" r="2.5" fill="#a5f3fc" />
                  <circle cx="12" cy="26" r="2.5" fill="#a5f3fc" />
                </g>
              )}

              {/* Spaceship Main Hull (Points East / Right) */}
              <path
                d="M 44 20 L 14 6 L 16 15 L 10 15 L 12 20 L 10 25 L 16 25 L 14 34 Z"
                fill={isAwake ? 'url(#lumiHullGrad)' : '#334155'}
                stroke={isAwake ? '#7dd3fc' : '#64748b'}
                strokeWidth="1.5"
                strokeLinejoin="round"
                filter={isAwake ? 'url(#lumiGlow)' : undefined}
              />

              {/* Wing Accent Panels */}
              <polygon points="28,15 16,10 18,17" fill={isAwake ? '#67e8f9' : '#475569'} opacity="0.7" />
              <polygon points="28,25 16,30 18,23" fill={isAwake ? '#67e8f9' : '#475569'} opacity="0.7" />

              {/* Cockpit Visor / Eye (Front / Head) */}
              <ellipse
                cx="32"
                cy="20"
                rx="4.5"
                ry="3.5"
                fill={isAwake ? 'url(#lumiVisorGrad)' : '#1e293b'}
                stroke={isAwake ? '#ffffff' : '#64748b'}
                strokeWidth="1"
              />
              {isAwake && (
                <circle cx="34" cy="19" r="1.2" fill="#ffffff" />
              )}

              {/* Headlight Sensor Beam / Pointer (Front Tip) */}
              {isAwake && (
                <polygon points="44,20 48,18 48,22" fill="#5eead4" opacity="0.9" />
              )}
            </svg>
          </div>
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
          <span>좌표 ({rover.x}, {rover.y})</span>
          <span>에너지 {rover.energy ?? 100}%</span>
          {mission?.restorationLevel && (
            <span style={{ color: 'var(--lab-mint)', fontWeight: 700 }}>코어 복원도 {mission.restorationLevel}%</span>
          )}
        </div>
      )}
    </section>
  )
}
