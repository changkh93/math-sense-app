import { useEffect, useRef, useState } from 'react'
import { EXPLORATION_KITS, MARINE_SPECIES, findMarineObservation, getSkyLandmarks, getNearestHabitat } from './frontierExploration.js'
import './FrontierExploration.css'
import { useFrame } from '@react-three/fiber'
import { releaseFrontierPointerLock } from '../frontierPointerLock.js'

export function SwimFin() {
  return <mesh position={[0, -.53, .42]} rotation={[-.1, 0, 0]} scale={[1, .16, 2.4]}>
    <boxGeometry args={[.4, .3, .55]} /><meshStandardMaterial color="#5ee5c4" roughness={.4} />
  </mesh>
}

export function ExplorationEquipment({ kit = 'none', flying = false }) {
  const jets = useRef()
  useFrame(({ clock }) => {
    if (jets.current) jets.current.scale.y = flying ? 1 + Math.sin(clock.elapsedTime * 22) * .15 : .1
  })
  if (kit === 'hoverpack') return <group position={[0, 1.24, -.58]}>
    {[-.46, .46].map((x) => <group key={x} position={[x, 0, 0]}>
      <mesh><cylinderGeometry args={[.19, .24, .78, 8]} /><meshStandardMaterial color="#62cbd5" metalness={.5} roughness={.4} /></mesh>
      
    </group>)}
    <group ref={jets}>{[-.46, .46].map((x) => <mesh key={x} position={[x, -.63, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[.13, .5, 8]} /><meshBasicMaterial color="#91fff0" transparent opacity={.75} depthWrite={false} /></mesh>)}</group>
  </group>
  if (kit === 'diving') return <group>
    <mesh position={[0, 1.24, -.62]}><capsuleGeometry args={[.25, .52, 4, 8]} /><meshStandardMaterial color="#ffd48d" roughness={.5} /></mesh>

  </group>
  return null
}

function HoldButton({ direction, inputRef, disabled, children }) {
  const release = () => { inputRef.current.vertical = 0 }
  return <button type="button" disabled={disabled} onPointerDown={(event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    inputRef.current.vertical = direction
  }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
  onKeyDown={(event) => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); inputRef.current.vertical = direction } }}
  onKeyUp={release} onBlur={release}>{children}</button>
}

export default function FrontierExplorationHud({ travel, setTravel, inputRef, position, worldRadius, disabled, storageKey }) {
  const [open, setOpen] = useState(false)
  const [skyFound, setSkyFound] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(`${storageKey}:sky`) || '[]')
      return Array.isArray(value) ? value.filter((id) => getSkyLandmarks(worldRadius).some((site) => site.id === id)) : []
    } catch { return [] }
  })
  const [journal, setJournal] = useState(() => {
    let saved = []
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { /* Memory-only when storage is unavailable. */ }
    return { ids: Array.isArray(saved) ? saved.filter((id) => MARINE_SPECIES.some((species) => species.id === id)) : [] }
  })
  const [notice, setNotice] = useState('')
  const [journalOpen, setJournalOpen] = useState(false)
  const ids = journal.ids
  useEffect(() => {
    const reset = () => { inputRef.current.vertical = 0 }
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    if (disabled) reset()
    return () => { reset(); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', reset) }
  }, [disabled, inputRef])
  useEffect(() => {
    if (!open && !journalOpen) return undefined
    releaseFrontierPointerLock(document)
    const closePanel = (event) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      event.stopPropagation()
      if (journalOpen) setJournalOpen(false)
      else setOpen(false)
    }
    // Capture before the world/builder shortcuts so one Escape closes one layer.
    window.addEventListener('keydown', closePanel, true)
    return () => window.removeEventListener('keydown', closePanel, true)
  }, [open, journalOpen])
  const observe = findMarineObservation(position, worldRadius)
  const skySites = getSkyLandmarks(worldRadius)
  const skyNearby = position.movementMode === 'flying' && skySites.find((site) => Math.hypot(position.x - site.x, position.y - site.y, position.z - site.z) < 2)
  const skyTarget = skySites.find((site) => !skyFound.includes(site.id))
  const nearestReef = getNearestHabitat(position, worldRadius)
  const direction = (target) => {
    const dx = target.x - position.x
    const dz = target.z - position.z
    return `${Math.abs(dz) > 1 ? dz > 0 ? '남' : '북' : ''}${Math.abs(dx) > 1 ? dx > 0 ? '동' : '서' : ''}쪽`
  }
  const recordSky = () => {
    if (!skyNearby || skyFound.includes(skyNearby.id)) return
    const next = [...skyFound, skyNearby.id]
    setSkyFound(next)
    setNotice(skyNearby.note)
    try { localStorage.setItem(`${storageKey}:sky`, JSON.stringify(next)) } catch { setNotice('이번 탐험 동안 발견 기록을 보관해요.') }
  }
  const chooseKit = (kit) => setTravel((current) => ({
    ...current, kit, flight: false,
    recovery: current.recovery,
  }))
  const record = () => {
    if (!observe || ids.includes(observe.id)) return
    const next = [...ids, observe.id]
    setJournal({ key: storageKey, ids: next })
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setNotice(`${observe.name} 관찰 기록을 남겼어요.`) }
    catch { setNotice('저장 공간을 사용할 수 없어 이번 탐험 동안 기록해요.') }
  }
  const mode = { grounded: '산책 중', flying: '비행 중', landing: '천천히 착륙', swimming: '수면 수영', diving: '잠수 탐험' }[position.movementMode] || '산책 중'
  return <aside className="frontier-exploration" aria-label="탐험 장비와 시점" onPointerDown={(event) => { event.stopPropagation(); releaseFrontierPointerLock(document) }}>
    <div className="frontier-exploration__toolbar">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>장비 · {EXPLORATION_KITS.find((kit) => kit.id === travel.kit)?.label}</button>
      <button type="button" disabled={disabled} aria-pressed={travel.birdView} onClick={() => setTravel((current) => ({ ...current, birdView: !current.birdView }))}>{travel.birdView ? '시점 복귀' : '조감 시점'} <kbd>B</kbd></button>
      <button type="button" aria-expanded={journalOpen} onClick={() => setJournalOpen(!journalOpen)}>바다 도감 {ids.length}/6</button>
    </div>
    {open && <section className="frontier-exploration__panel">
      <strong>어디로 떠나볼까요?</strong><p>기본 장비 · 연료와 재료 소비 없이 탐험해요.</p>
      <div className="frontier-exploration__kits">{EXPLORATION_KITS.map((kit) => <button key={kit.id} type="button" disabled={disabled} aria-pressed={travel.kit === kit.id} onClick={() => chooseKit(kit.id)}><strong>{kit.label}</strong><small>{kit.description}</small></button>)}</div>
      <p>섬 둘레의 산호 숲에서 물고기·거북·해파리를 만나보세요. 하늘에는 고도 7·11·15의 빛나는 탐험 고리가 있어요.</p>
    </section>}
    <div className="frontier-exploration__movement">
      <span data-testid="exploration-mode">{mode} · 높이 {Number(position.y || 0).toFixed(1)}</span>
      {travel.kit === 'hoverpack' && <button type="button" disabled={disabled} aria-pressed={travel.flight} onClick={() => setTravel((current) => ({ ...current, flight: !current.flight }))}>{travel.flight ? '안전 착륙' : '이륙'} <kbd>H</kbd></button>}
      {(travel.flight || travel.kit === 'diving') && <>
        <HoldButton direction={1} inputRef={inputRef} disabled={disabled}>↑ 상승 <kbd>Space</kbd></HoldButton>
        <HoldButton direction={-1} inputRef={inputRef} disabled={disabled}>↓ 하강 <kbd>C</kbd></HoldButton>
      </>}
      <button type="button" disabled={disabled} onClick={() => setTravel((current) => ({ ...current, flight: false, birdView: false, recovery: current.recovery + 1 }))}>안전 귀환</button>
    </div>
    {travel.birdView && <p className="frontier-exploration__hint">드래그 회전 · 휠 확대/축소 · B 시점 복귀</p>}
    {travel.kit === 'hoverpack' && <section className="frontier-exploration__discovery">
      <strong>구름 위 탐험 · {skyFound.length}/3</strong>
      <p>{skyTarget ? `${skyTarget.name} · ${direction(skyTarget)} ${Math.round(Math.hypot(position.x - skyTarget.x, position.z - skyTarget.z))}m · 목표 높이 ${skyTarget.y}` : '세 하늘 명소를 모두 발견했어요. 구름 사이에서 잠시 쉬어가요.'}</p>
      {skyNearby && <button type="button" disabled={disabled || skyFound.includes(skyNearby.id)} onClick={recordSky}>{skyFound.includes(skyNearby.id) ? '발견 완료' : '풍경 기록하기'} · {skyNearby.name}</button>}
    </section>}
    {(position.movementMode === 'diving' || position.movementMode === 'swimming') && nearestReef && !observe && <p className="frontier-exploration__hint">가까운 산호 숲 · {direction(nearestReef)} {Math.round(nearestReef.distance)}m · 기포를 따라가 보세요</p>}
    {observe && <button type="button" className="frontier-exploration__observe" disabled={disabled || ids.includes(observe.id)} onClick={record}>{ids.includes(observe.id) ? '관찰 완료' : '관찰 기록하기'} · {observe.name}</button>}
    {journalOpen && <section className="frontier-exploration__panel" aria-label="바다 관찰 도감">
      <strong>나의 바다 관찰 도감</strong><p>이 브라우저에 보관하는 탐험 기록이에요.</p>
      <div className="frontier-exploration__species">{MARINE_SPECIES.map((species) => <article key={species.id} style={{ '--fish-color': ids.includes(species.id) ? species.color : '#537073' }}><i /><div><strong>{ids.includes(species.id) ? species.name : '아직 만나지 못한 친구'}</strong><p>{ids.includes(species.id) ? species.note : '섬 둘레 산호 숲에서 가까이 다가가 관찰해 보세요.'}</p></div></article>)}</div>
    </section>}
    {notice && <p className="frontier-exploration__hint" role="status">{notice}</p>}
  </aside>
}
