import { useState } from 'react'
import GalaxyWorld3D from '../GalaxyWorld3D'
import { getMarineHabitat } from './frontierExploration.js'
import '../MetaGalaxy.css'

const planet = {
  theme: 'forest',
  territoryExpanded: false,
  layout: [],
  name: '탐험 테스트 섬',
}
const reef = getMarineHabitat(6, 20)
const shallows = getMarineHabitat(1, 20)
export default function FrontierExplorationQa() {
  const [firstPerson, setFirstPerson] = useState(false)
  const [position, setPosition] = useState({})
  const [paused, setPaused] = useState(false)
  const [command, setCommand] = useState(null)
  const send = (value) => setCommand({ ...value, id: Date.now() })
  return (
    <main style={{ position: 'fixed', inset: 0 }}>
      <GalaxyWorld3D
        planet={planet}
        restorationPercent={60}
        isPlanetOwner
        builderOwnerId="exploration-qa"
        isFirstPerson={firstPerson}
        onToggleFirstPerson={() => setFirstPerson(!firstPerson)}
        ownedExplorationKits={['hoverpack', 'diving']}
        explorationWallet={2000}
        qaCommand={command}
        onPlayerTransform={setPosition}
        paused={paused}
      />
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 16,
          zIndex: 100,
          color: 'white',
          background: '#123b',
          padding: 8,
          maxWidth: 'calc(100% - 32px)',
          fontSize: 11,
          maxHeight: 72,
          overflow: 'auto',
        }}
      >
        <strong>프론티어 탐험 QA</strong>{' '}
        <button onClick={() => setPaused(!paused)}>
          {paused ? '계속하기' : '일시정지'}
        </button>
        <button onClick={() => setFirstPerson(!firstPerson)}>1/3인칭</button>
        <button
          onClick={() => {
            setFirstPerson(true)
            send({
              position: [reef.x + 5, reef.y + 0.2, reef.z + 3],
              yaw: Math.atan2(-5, -3),
              pitch: -0.18,
            })
          }}
        >
          산호 군락에서 테스트
        </button>
        <button
          onClick={() => {
            setFirstPerson(true)
            send({
              position: [shallows.x + 4, shallows.y, shallows.z + 3],
              yaw: Math.atan2(-4, -3),
              pitch: -0.12,
            })
          }}
        >
          얕은 산호 숲
        </button>
        <button onClick={() => send({ position: [69, -23, 2] })}>
          외해 수심 23m
        </button>
        <button
          onClick={() => send({ position: [30, -3, 0], x: 1, duration: 8 })}
        >
          기존 경계 통과
        </button>
        <button onClick={() => send({ position: [-10, 7, 1] })}>
          구름 정원 테스트
        </button>
        <button onClick={() => send({ x: 1, duration: 3 })}>옆 이동 3초</button>
        <button onClick={() => send({ z: -1, duration: 3 })}>전진 3초</button>
        <button onClick={() => send({ axis: 1 })}>상승 1초 테스트</button>
        <button onClick={() => send({ axis: -1 })}>하강 1초 테스트</button>
        <output
          data-testid="exploration-position"
          style={{
            display: 'block',
            fontSize: 11,
            maxHeight: 72,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(position)}
        </output>
      </div>
    </main>
  )
}
