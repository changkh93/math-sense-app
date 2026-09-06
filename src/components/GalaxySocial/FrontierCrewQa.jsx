// Development-only synthetic destinations; never grants access to real users.
import { useState } from 'react'
import FrontierCrewAtlas, { CrewVisitActivities } from './FrontierCrewAtlas'
import GalaxyWorld3D from './GalaxyWorld3D'
import MetaGalaxy from './MetaGalaxy'
import { useFrontierCrewTravel } from '../../hooks/useFrontierCrewTravel'
import { getCrewGates } from './frontierCrewRoutes'
import './MetaGalaxy.css'

const neighbors = [
  {
    uid: 'qa-crew-a',
    displayName: '하늘',
    planetName: '함께 가꾸는 숲',
    tagline: '온실과 관측소를 같이 가꿔요.',
    visitMode: 'crew',
    routeLevel: 2,
  },
  {
    uid: 'qa-crew-b',
    displayName: '바다',
    planetName: '고요한 해안',
    tagline: '지금은 쉬고 있어요.',
    visitMode: 'private',
  },
  {
    uid: 'qa-crew-c',
    displayName: '별빛',
    planetName: '차단한 탐사원',
    visitMode: 'private',
    blocked: true,
  },
]
const planets = {
  home: {
    ownerName: '나',
    planetName: '나의 개척지',
    theme: 'forest',
    layout: [],
  },
  'qa-crew-a': {
    ownerName: '하늘',
    planetName: '함께 가꾸는 숲',
    theme: 'ocean',
    layout: [
      {
        instanceId: 'qa-greenhouse',
        itemId: 'friend_greenhouse',
        name: '우리 온실',
        x: 65,
        y: 50,
        level: 1,
      },
    ],
  },
}
const guestUser = { uid: 'guest' }
const guestData = { isGuest: true, name: '로컬 QA' }
export default function FrontierCrewQa() {
  const [uid, setUid] = useState('home')
  const [atlas, setAtlas] = useState(true)
  const [firstPerson, setFirstPerson] = useState(false)
  const [command, setCommand] = useState(null)
  const [status, setStatus] = useState('로컬 테스트 · 서버 요청 없음')
  const [fail, setFail] = useState(false)
  const [calls, setCalls] = useState(0)
  const travel = useFrontierCrewTravel({
    identityKey: 'crew-qa',
    request: async (nextUid) => {
      setCalls((value) => value + 1)
      await new Promise((resolve) => setTimeout(resolve, 1200))
      if (fail) throw new Error('방문 거절 테스트: 현재 행성 유지')
      return nextUid
    },
    onArrive: (nextUid) => {
      setUid(nextUid)
      setAtlas(true)
      setStatus('안전 착륙 완료')
    },
    onError: (error) => setStatus(error.message),
  })
  const visit = (nextUid) => {
    setAtlas(false)
    travel.start(nextUid, planets[nextUid].planetName)
  }
  if (new URLSearchParams(window.location.search).has('guest'))
    return (
      <MetaGalaxy user={guestUser} userData={guestData} onBack={() => {}} />
    )
  return (
    <main
      className="meta-galaxy frontier-immersive"
      style={{ position: 'fixed', inset: 0 }}
    >
      <GalaxyWorld3D
        key={uid}
        planet={planets[uid]}
        isPlanetOwner={uid === 'home'}
        ownedExplorationKits={['hoverpack', 'diving']}
        isFirstPerson={firstPerson}
        onToggleFirstPerson={() => setFirstPerson((value) => !value)}
        paused={atlas || Boolean(travel.pending)}
        qaCommand={command}
        onOpenCrewAtlas={() => setAtlas(true)}
      />
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 150,
          background: '#102735',
          color: 'white',
          padding: 8,
          maxWidth: '95%',
          fontSize: 12,
        }}
      >
        <strong>
          크루 항로 QA · {uid} · 요청 {calls}
        </strong>{' '}
        <span role="status">{status}</span>
        <button onClick={() => setAtlas((value) => !value)}>
          성도 열기/닫기
        </button>
        <button onClick={() => setFail((value) => !value)}>
          실패 테스트 {fail ? '켜짐' : '꺼짐'}
        </button>
        {getCrewGates().map((gate) => (
          <button
            key={gate.id}
            onClick={() => {
              setAtlas(false)
              setCommand({ id: Date.now(), position: gate.position })
            }}
          >
            {gate.id === 'crew-sea-gate'
              ? '바다 게이트로 이동'
              : '하늘 게이트로 이동'}
          </button>
        ))}
      </div>
      {atlas && (
        <div
          style={{
            position: 'absolute',
            zIndex: 120,
            top: 90,
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(780px, calc(100% - 24px))',
            overflow: 'auto',
          }}
        >
          {uid !== 'home' && (
            <CrewVisitActivities
              planet={planets[uid]}
              onInspect={(item) => setStatus(`${item.name} 정보 열기`)}
              onReturn={() => visit('home')}
              onLogs={() => setStatus('기존 귀환 기록으로 연결')}
            />
          )}
          <FrontierCrewAtlas
            neighbors={neighbors}
            ownName={planets.home.planetName}
            currentUid={uid}
            busy={travel.pending}
            onVisit={visit}
            onBlock={() => setStatus('차단 연결 확인')}
            onReport={() => setStatus('신고 연결 확인')}
          />
        </div>
      )}
      {travel.pending && (
        <div
          className="crew-travel-screen"
          role="dialog"
          aria-label="크루 항로 이동"
        >
          <span>✦</span>
          <strong>{travel.pending.name} 연결 중</strong>
          <button onClick={travel.cancel}>이동 취소</button>
        </div>
      )}
    </main>
  )
}
