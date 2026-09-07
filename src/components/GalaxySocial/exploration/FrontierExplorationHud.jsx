import { useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending } from 'three'
import { EXPLORATION_KITS, HOVERPACK_FLAME_LAYERS, getHoverpackAltitudeProgress, getHoverpackFlightStage, getSkyLandmarks, isSkyLandmarkReached, normalizeOwnedExplorationKits, resolveExplorationKitShortcut } from './frontierExploration.js'
import './FrontierExploration.css'
import { useFrame } from '@react-three/fiber'
import { releaseFrontierPointerLock } from '../frontierPointerLock.js'

export function SwimFin() {
  return <mesh position={[0, -.53, .42]} rotation={[-.1, 0, 0]} scale={[1, .16, 2.4]}>
    <boxGeometry args={[.4, .3, .55]} /><meshStandardMaterial color="#5ee5c4" roughness={.4} />
  </mesh>
}

function HoverpackFlames({ flying, motionRef }) {
  const flames = useRef()
  const power = useRef(.65)
  useFrame(({ clock }, delta) => {
    if (!flames.current) return
    const targetPower = motionRef?.current?.userData.flightThrust ?? .75
    power.current += (targetPower - power.current) * (1 - Math.exp(-Math.min(delta, .05) * 8))
    const flicker = Math.sin(clock.elapsedTime * 27) * .08 + Math.sin(clock.elapsedTime * 43) * .04
    flames.current.visible = flying
    flames.current.scale.set(1 - flicker * .28, power.current * (1 + flicker), 1 - flicker * .28)
  })
  return <group ref={flames} position={[0, -.39, 0]} visible={flying}>
    {[-.46, .46].map((x) => <group key={x} position={[x, 0, 0]}>
      {HOVERPACK_FLAME_LAYERS.map((layer) => <mesh key={layer.id} position={[0, -layer.height / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[layer.radius, layer.height, 12]} />
        <meshBasicMaterial
          color={layer.color}
          transparent
          opacity={layer.opacity}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>)}
    </group>)}
  </group>
}

export function ExplorationEquipment({ kit = 'none', flying = false, motionRef }) {
  if (kit === 'hoverpack') return <group position={[0, 1.24, -.58]}>
    <mesh position={[0, .08, .09]} scale={[1, 1.15, .7]}><boxGeometry args={[.62, .72, .22]} /><meshStandardMaterial color="#24384b" metalness={.72} roughness={.24} /></mesh>
    <mesh position={[0, .13, -.04]}><boxGeometry args={[.34, .32, .08]} /><meshStandardMaterial color="#8cf4db" emissive="#1a836f" emissiveIntensity={1.1} toneMapped={false} /></mesh>
    {[-.46, .46].map((x) => <group key={x} position={[x, 0, 0]}>
      <mesh castShadow><cylinderGeometry args={[.18, .23, .82, 12]} /><meshStandardMaterial color="#6fc9d3" metalness={.78} roughness={.2} /></mesh>
      <mesh position={[0, .28, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.19, .035, 6, 16]} /><meshStandardMaterial color="#d8f7f4" metalness={.9} roughness={.12} /></mesh>
      <mesh position={[0, -.47, 0]}><cylinderGeometry args={[.12, .17, .18, 12]} /><meshStandardMaterial color="#313d4e" metalness={.88} roughness={.2} /></mesh>
      <mesh position={[x < 0 ? -.18 : .18, .05, .02]} rotation={[0, 0, x < 0 ? .32 : -.32]}><boxGeometry args={[.08, .5, .28]} /><meshStandardMaterial color="#ffbf68" emissive="#8b4318" emissiveIntensity={.5} /></mesh>
    </group>)}
    <mesh position={[0, -.3, .03]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.31, .035, 6, 18]} /><meshStandardMaterial color="#778aa0" metalness={.84} roughness={.2} /></mesh>
    <HoverpackFlames flying={flying} motionRef={motionRef} />
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

export default function FrontierExplorationHud({
  travel,
  setTravel,
  inputRef,
  position,
  worldRadius,
  disabled,
  storageKey,
  wallet = 0,
  ownedKits = [],
  onPurchaseKit,
}) {
  const [open, setOpen] = useState(false)
  const [purchasingKit, setPurchasingKit] = useState('')
  const [sessionOwnedKits, setSessionOwnedKits] = useState([])
  const [skyFound, setSkyFound] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(`${storageKey}:sky`) || '[]')
      return Array.isArray(value) ? [...new Set(value.filter((id) => getSkyLandmarks(worldRadius).some((site) => site.id === id)))] : []
    } catch { return [] }
  })
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])
  const flightStageSeen = useRef('launch')
  const ownedKitIds = normalizeOwnedExplorationKits([...ownedKits, ...sessionOwnedKits])
  useEffect(() => {
    const reset = () => { inputRef.current.vertical = 0 }
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    if (disabled) reset()
    return () => { reset(); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', reset) }
  }, [disabled, inputRef])
  useEffect(() => {
    if (!open) return undefined
    releaseFrontierPointerLock(document)
    const closePanel = (event) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
    // Capture before the world/builder shortcuts so one Escape closes one layer.
    window.addEventListener('keydown', closePanel, true)
    return () => window.removeEventListener('keydown', closePanel, true)
  }, [open])
  const skySites = useMemo(() => getSkyLandmarks(worldRadius), [worldRadius])
  const skyTarget = skySites.find((site) => !skyFound.includes(site.id))
  const skyNearby = !disabled && position.movementMode === 'flying' && skyTarget && isSkyLandmarkReached(position, skyTarget) ? skyTarget : null
  const flightStage = getHoverpackFlightStage(position.y)
  const altitudeProgress = getHoverpackAltitudeProgress(position.y)
  const direction = (target) => {
    const dx = target.x - position.x
    const dz = target.z - position.z
    if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) return '바로 여기'
    return `${Math.abs(dz) > 1 ? dz > 0 ? '남' : '북' : ''}${Math.abs(dx) > 1 ? dx > 0 ? '동' : '서' : ''}쪽`
  }
  const nearbySkyId = skyNearby?.id || ''
  useEffect(() => {
    if (!nearbySkyId || skyFound.includes(nearbySkyId)) return
    const site = skySites.find((item) => item.id === nearbySkyId)
    if (!site) return
    const next = [...skyFound, site.id]
    setSkyFound(next)
    setNotice(site.note)
    try { localStorage.setItem(`${storageKey}:sky`, JSON.stringify(next)) } catch { setNotice(`${site.note} · 이번 탐험 동안만 기록됩니다.`) }
  }, [nearbySkyId, skyFound, skySites, storageKey])
  useEffect(() => {
    if (travel.kit !== 'hoverpack' || position.movementMode !== 'flying') {
      flightStageSeen.current = 'launch'
      return
    }
    if (flightStage.id === flightStageSeen.current) return
    flightStageSeen.current = flightStage.id
    if (nearbySkyId) return
    setNotice(`${flightStage.label} 진입 · ${flightStage.note}`)
  }, [flightStage, nearbySkyId, position.movementMode, travel.kit])
  const chooseKit = (kit) => setTravel((current) => ({
    ...current, kit, flight: kit === 'hoverpack',
    recovery: current.recovery,
  }))
  const selectOrPurchaseKit = async (kit) => {
    if (disabled || purchasingKit) return
    if (ownedKitIds.includes(kit.id)) {
      chooseKit(kit.id)
      return
    }
    if (!kit.storeItemId || !onPurchaseKit) return
    if (wallet < kit.cost) {
      setNotice(`광석이 부족합니다. ${kit.cost - wallet}광석을 더 모아주세요.`)
      return
    }

    setPurchasingKit(kit.id)
    setNotice('')
    try {
      const result = await onPurchaseKit({ itemId: kit.storeItemId })
      if (!result?.success) throw new Error('구매 처리 결과를 확인할 수 없습니다.')
      setSessionOwnedKits((current) => Array.from(new Set([...current, kit.id])))
      chooseKit(kit.id)
      setNotice(`${kit.label} 구매 완료 · ${kit.cost.toLocaleString('ko-KR')}광석을 사용했어요.`)
    } catch (error) {
      setNotice(error?.message || `${kit.label} 구매에 실패했습니다. 다시 시도해주세요.`)
    } finally {
      setPurchasingKit('')
    }
  }
  const selectKitRef = useRef(selectOrPurchaseKit)
  selectKitRef.current = selectOrPurchaseKit
  useEffect(() => {
    const keyboardSelect = (event) => {
      const tag = event.target?.tagName
      if (disabled || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (event.code === 'KeyG') {
        event.preventDefault()
        setOpen((current) => !current)
        return
      }
      const kitId = resolveExplorationKitShortcut(event.code)
      if (!kitId) return
      event.preventDefault()
      const kit = EXPLORATION_KITS.find((item) => item.id === kitId)
      if (kit) void selectKitRef.current(kit)
    }
    window.addEventListener('keydown', keyboardSelect)
    return () => window.removeEventListener('keydown', keyboardSelect)
  }, [disabled])
  const mode = { grounded: '산책 중', flying: '비행 중', landing: '천천히 착륙', swimming: '수면 수영', diving: '잠수 탐험' }[position.movementMode] || '산책 중'
  return <aside className="frontier-exploration" aria-label="탐험 장비와 시점" onPointerDown={(event) => { event.stopPropagation(); releaseFrontierPointerLock(document) }}>
    <div className="frontier-exploration__toolbar">
      <button type="button" aria-expanded={open} aria-keyshortcuts="G" onClick={() => setOpen(!open)}>장비 · {EXPLORATION_KITS.find((kit) => kit.id === travel.kit)?.label} <kbd>G</kbd></button>
      <button type="button" disabled={disabled} aria-pressed={travel.birdView} onClick={() => setTravel((current) => ({ ...current, birdView: !current.birdView }))}>{travel.birdView ? '시점 복귀' : '조감 시점'} <kbd>B</kbd></button>
    </div>
    {open && <section className="frontier-exploration__panel">
      <strong>어디로 떠나볼까요?</strong><p>산책은 무료이며, 특수 장비는 한 번 구매하면 계속 사용할 수 있어요. · 보유 {wallet.toLocaleString('ko-KR')}광석</p>
      <div className="frontier-exploration__kits">{EXPLORATION_KITS.map((kit) => {
        const owned = ownedKitIds.includes(kit.id)
        const unavailable = !owned && !onPurchaseKit
        const shortfall = Math.max(0, kit.cost - wallet)
        const status = kit.cost === 0
          ? '기본 장비'
          : owned
            ? '보유 · 선택 가능'
            : unavailable
              ? `회원 전용 · ${kit.cost.toLocaleString('ko-KR')}광석`
              : shortfall > 0
                ? `${kit.cost.toLocaleString('ko-KR')}광석 · ${shortfall.toLocaleString('ko-KR')} 부족`
                : `${kit.cost.toLocaleString('ko-KR')}광석 · 구매`
        return <button
          key={kit.id}
          type="button"
          disabled={disabled || Boolean(purchasingKit) || unavailable}
          aria-pressed={travel.kit === kit.id}
          aria-label={`${kit.label} · ${status}`}
          aria-keyshortcuts={kit.shortcut}
          onClick={() => selectOrPurchaseKit(kit)}
        >
          <strong>{purchasingKit === kit.id ? '구매 처리 중…' : kit.label} <kbd>{kit.shortcut}</kbd></strong>
          <small>{kit.description}</small>
          <em>{status}</em>
        </button>
      })}</div>
      <p>섬 둘레의 산호 숲에서 물고기·거북·해파리를 만나보세요. 하늘에는 고도 7·11·15의 빛나는 탐험 고리가 있어요.</p>
    </section>}
    <div className="frontier-exploration__movement">
      <span data-testid="exploration-mode">{mode} · 높이 {Number(position.y || 0).toFixed(1)}</span>
      {(travel.flight || travel.kit === 'diving') && <>
        <HoldButton direction={1} inputRef={inputRef} disabled={disabled}>↑ 상승 <kbd>Space</kbd></HoldButton>
        <HoldButton direction={-1} inputRef={inputRef} disabled={disabled}>↓ 하강 <kbd>C</kbd></HoldButton>
      </>}
      <button type="button" disabled={disabled} onClick={() => setTravel((current) => ({ ...current, flight: false, birdView: false, recovery: current.recovery + 1 }))}>안전 귀환</button>
    </div>
    {travel.birdView && <p className="frontier-exploration__hint">드래그 회전 · 휠 확대/축소 · B 시점 복귀</p>}
    {travel.kit === 'hoverpack' && <section className="frontier-exploration__discovery">
      <div className="frontier-flight-stage" style={{ '--flight-stage': flightStage.color }}>
        <span>{flightStage.eyebrow}</span><strong>{flightStage.label}</strong><em>ALT {Number(position.y || 0).toFixed(1)}m</em>
        <i><b style={{ width: `${altitudeProgress}%` }} /></i>
      </div>
      <div className="frontier-flight-route" aria-label={`고공 항로 ${skyFound.length}/3 완료`}>
        {skySites.map((site) => <span key={site.id} className={skyFound.includes(site.id) ? 'complete' : skyTarget?.id === site.id ? 'current' : ''} title={site.name}><i />{site.order}</span>)}
      </div>
      <strong>고공 항로 · {skyFound.length}/3</strong>
      <p>{skyTarget ? `${skyTarget.name} · ${direction(skyTarget)} ${Math.round(Math.hypot(position.x - skyTarget.x, position.z - skyTarget.z))}m · 고도 ${skyTarget.y}` : '항로 완주 · 이제 자유롭게 풍경을 둘러보세요.'}</p>
      <small>빛의 중심을 통과하면 자동 기록됩니다.</small>
    </section>}
    {notice && <p className="frontier-exploration__hint" role="status">{notice}</p>}
  </aside>
}
