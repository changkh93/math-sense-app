import { createElement, useMemo, useState } from 'react'
import {
  Archive,
  Check,
  ChevronRight,
  Clock3,
  Cloud,
  Gem,
  LockKeyhole,
  Orbit,
  PackageOpen,
  Radar,
  Rocket,
  Satellite,
  SatelliteDish,
  ScanSearch,
  Sparkles,
  Warehouse,
  Wrench,
} from 'lucide-react'
import {
  GALAXY_ROVER_DISCOVERIES,
  GALAXY_ROVER_ROUTES,
  MATERIAL_LABELS,
  formatGalaxyRoverRemainingTime,
  formatGalaxyTime,
  getGalaxyRoverStatus,
} from '../../utils/galaxyGame'
import './GalaxyRoverPanel.css'

const ROUTE_ICONS = {
  nebula: Cloud,
  comet: Orbit,
  ruins: Satellite,
}

const DISCOVERY_ICONS = {
  nebula: Sparkles,
  comet: Gem,
  ruins: ScanSearch,
}

const RARITY_META = {
  common: { label: '일반', className: 'common' },
  rare: { label: '희귀', className: 'rare' },
  legendary: { label: '전설', className: 'legendary' },
}

function toEpochMs(value) {
  if (!value) return 0
  if (typeof value?.toMillis === 'function') return Number(value.toMillis()) || 0
  if (typeof value === 'object' && Number.isFinite(Number(value.seconds ?? value._seconds))) {
    return Number(value.seconds ?? value._seconds) * 1000
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeOwnedDiscoveries(discoveries, currentDiscovery) {
  const owned = new Map()
  const register = (value, fallbackId = '') => {
    if (!value && !fallbackId) return
    if (typeof value === 'string') {
      owned.set(value, Math.max(1, owned.get(value) || 0))
      return
    }
    if (typeof value === 'number') {
      if (fallbackId && value > 0) owned.set(fallbackId, Math.max(value, owned.get(fallbackId) || 0))
      return
    }
    if (typeof value !== 'object') return
    const id = String(value.id || value.discoveryId || fallbackId || '')
    const count = Math.max(1, Number(value.count || value.quantity || 1))
    if (id) owned.set(id, Math.max(count, owned.get(id) || 0))
  }

  if (Array.isArray(discoveries)) discoveries.forEach((entry) => register(entry))
  else if (discoveries && typeof discoveries === 'object') {
    Object.entries(discoveries).forEach(([id, value]) => register(value, id))
  }
  register(currentDiscovery)
  return owned
}

function ExpeditionPerk({ active, icon, title, children }) {
  return (
    <div className={`galaxy-rover-perk${active ? ' is-active' : ''}`}>
      <span>{createElement(icon, { size: 17, 'aria-hidden': true })}</span>
      <div><strong>{title}</strong><small>{children}</small></div>
      {active && <Check size={15} aria-label="적용 중" />}
    </div>
  )
}

function RouteSelector({ selectedRoute, onSelect, materials, hasRoverBay, disabled }) {
  return (
    <div className="galaxy-rover-routes" role="radiogroup" aria-label="로버 원정 항로">
      {Object.entries(GALAXY_ROVER_ROUTES).map(([routeId, route]) => {
        const Icon = ROUTE_ICONS[routeId] || Radar
        const selected = selectedRoute === routeId
        const durationHours = (hasRoverBay ? route.roverBayDurationMs : route.durationMs) / (60 * 60 * 1000)
        return (
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            className={`galaxy-rover-route route-${routeId}${selected ? ' is-selected' : ''}`}
            key={routeId}
            onClick={() => onSelect(routeId)}
            disabled={disabled}
            style={{ '--rover-route-accent': route.accent }}
          >
            <span className="galaxy-rover-route__icon"><Icon size={23} aria-hidden="true" /></span>
            <span className="galaxy-rover-route__copy">
              <small>{route.shortLabel} ROUTE</small>
              <strong>{route.label}</strong>
              <span>{route.copy}</span>
            </span>
            <span className="galaxy-rover-route__facts">
              <i><Clock3 size={13} aria-hidden="true" /> {durationHours}시간</i>
              <i><PackageOpen size={13} aria-hidden="true" /> {route.reward} {route.baseReward}</i>
              <i><Archive size={13} aria-hidden="true" /> 발견물 3종</i>
            </span>
            <span className="galaxy-rover-route__inventory">
              현재 {MATERIAL_LABELS[route.rewardMaterial] || route.reward} {Math.max(0, Number(materials?.[route.rewardMaterial] || 0))}
            </span>
            <span className="galaxy-rover-route__check"><Check size={15} aria-hidden="true" /></span>
          </button>
        )
      })}
    </div>
  )
}

function ExpeditionTrack({ routeId, route, expedition, nowMs }) {
  const startedAtMs = toEpochMs(expedition?.startedAtMs || expedition?.launchedAtMs || expedition?.startedAt)
  const returnsAtMs = toEpochMs(expedition?.returnsAtMs || expedition?.readyAtMs || expedition?.returnAtMs || expedition?.returnsAt)
  const fallbackDurationMs = Number(expedition?.durationMs || route?.durationMs || 0)
  const totalMs = Math.max(1, returnsAtMs - startedAtMs || fallbackDurationMs)
  const remainingMs = Math.max(0, returnsAtMs - Number(nowMs || 0))
  const progress = returnsAtMs
    ? Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100))
    : 0
  const Icon = ROUTE_ICONS[routeId] || Radar

  return (
    <section className={`galaxy-rover-track route-${routeId}`} style={{ '--rover-route-accent': route?.accent }} aria-live="polite">
      <div className="galaxy-rover-track__visual" aria-hidden="true">
        <i className="galaxy-rover-orbit orbit-one" />
        <i className="galaxy-rover-orbit orbit-two" />
        <span className="galaxy-rover-track__origin"><Warehouse size={18} /></span>
        <span className="galaxy-rover-track__craft" style={{ left: `${Math.min(92, Math.max(8, progress))}%` }}><Rocket size={21} /></span>
        <span className="galaxy-rover-track__destination"><Icon size={21} /></span>
      </div>
      <div className="galaxy-rover-track__heading">
        <div><small>ACTIVE ROVER EXPEDITION</small><h3>{route?.label || '심우주 원정'}</h3></div>
        <strong>{formatGalaxyRoverRemainingTime(remainingMs)}</strong>
      </div>
      <div
        className="galaxy-rover-progress"
        role="progressbar"
        aria-label={`${route?.label || '로버 원정'} 진행률`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(progress)}
      >
        <i><b style={{ width: `${progress}%` }} /></i>
        <span>{Math.round(progress)}%</span>
      </div>
      <dl className="galaxy-rover-track__times">
        <div><dt>출발 기록</dt><dd>{formatGalaxyTime(startedAtMs) || '항로 동기화 중'}</dd></div>
        <div><dt>예상 귀환</dt><dd>{formatGalaxyTime(returnsAtMs) || '귀환 시각 계산 중'}</dd></div>
      </dl>
    </section>
  )
}

function ReturnCrate({ route, busy, onClaim }) {
  return (
    <section className="galaxy-rover-return" aria-live="polite">
      <div className="galaxy-rover-return__signal" aria-hidden="true">
        <span><PackageOpen size={42} /></span>
        <i /><i /><i />
      </div>
      <div className="galaxy-rover-return__copy">
        <small>ROVER DOCKING COMPLETE</small>
        <h3>귀환 상자가 도착했습니다</h3>
        <p>{route?.label || '심우주 원정'}에서 가져온 재료와 발견 기록을 직접 확인하세요. 수령 전에는 다음 원정을 보낼 수 없습니다.</p>
        <div className="galaxy-rover-return__preview">
          <span><PackageOpen size={16} aria-hidden="true" /> {route?.reward || '원정 재료'} 최소 {route?.baseReward || 1}</span>
          <span><Sparkles size={16} aria-hidden="true" /> 미확인 발견 신호 1개</span>
        </div>
        <button type="button" className="galaxy-rover-primary" disabled={Boolean(busy) || !onClaim} onClick={onClaim}>
          {busy ? '귀환 상자 동기화 중…' : '귀환 상자 열기'}
          {!busy && <ChevronRight size={17} aria-hidden="true" />}
        </button>
      </div>
    </section>
  )
}

function ClaimedResult({ expedition, fallbackRoute }) {
  const reward = expedition?.reward || expedition?.result?.reward || {}
  const discovery = expedition?.discovery || expedition?.result?.discovery || {}
  const rewardMaterial = reward.material || reward.rewardMaterial || fallbackRoute?.rewardMaterial
  const rewardAmount = Math.max(0, Number(reward.amount || reward.quantity || fallbackRoute?.baseReward || 0))
  const rewardTitle = reward.title || reward.name || MATERIAL_LABELS[rewardMaterial] || fallbackRoute?.reward || '원정 재료'
  const discoveryName = discovery.name || discovery.title || '새로운 항로 흔적'
  const rarity = RARITY_META[discovery.rarity] || RARITY_META.common

  return (
    <section className="galaxy-rover-claimed" aria-live="polite">
      <header>
        <span><Check size={20} aria-hidden="true" /></span>
        <div><small>EXPEDITION ARCHIVED</small><h3>귀환 결과를 기록했습니다</h3></div>
      </header>
      <div className="galaxy-rover-claimed__loot">
        <article>
          <span><PackageOpen size={22} aria-hidden="true" /></span>
          <div><small>회수 재료</small><strong>{rewardTitle} +{rewardAmount}</strong></div>
        </article>
        <article className={`rarity-${rarity.className}`}>
          <span><Sparkles size={22} aria-hidden="true" /></span>
          <div><small>{rarity.label} 발견</small><strong>{discoveryName}</strong></div>
        </article>
      </div>
      <p>발견물은 아래 원정 도감에 보존되었습니다. 다음 항로를 선택해 로버의 새 귀환을 예약할 수 있습니다.</p>
    </section>
  )
}

function DiscoveryArchive({ discoveries, currentDiscovery }) {
  const owned = useMemo(
    () => normalizeOwnedDiscoveries(discoveries, currentDiscovery),
    [currentDiscovery, discoveries],
  )
  const ownedCount = GALAXY_ROVER_DISCOVERIES.filter((entry) => owned.has(entry.id)).length

  return (
    <section className="galaxy-rover-archive" aria-labelledby="galaxy-rover-archive-title">
      <header>
        <div><small>ASTRA DISCOVERY ARCHIVE</small><h3 id="galaxy-rover-archive-title">로버 원정 도감</h3></div>
        <strong><Archive size={16} aria-hidden="true" /> {ownedCount} / {GALAXY_ROVER_DISCOVERIES.length}</strong>
      </header>
      <div className="galaxy-rover-archive__meter" aria-hidden="true"><i style={{ width: `${ownedCount / GALAXY_ROVER_DISCOVERIES.length * 100}%` }} /></div>
      <div className="galaxy-rover-discoveries">
        {Object.entries(GALAXY_ROVER_ROUTES).flatMap(([routeId, route]) => route.discoveries.map((discovery) => {
          const isOwned = owned.has(discovery.id)
          const count = owned.get(discovery.id) || 0
          const rarity = RARITY_META[discovery.rarity] || RARITY_META.common
          const Icon = DISCOVERY_ICONS[routeId] || Sparkles
          return (
            <article
              className={`galaxy-rover-discovery rarity-${rarity.className}${isOwned ? ' is-owned' : ' is-locked'}`}
              key={discovery.id}
              title={isOwned ? discovery.description : `${route.shortLabel} 항로에서 발견할 수 있습니다.`}
            >
              <span className="galaxy-rover-discovery__icon">{isOwned ? <Icon size={20} aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />}</span>
              <div>
                <small>{route.shortLabel} · {rarity.label}</small>
                <strong>{isOwned ? discovery.name : '미발견 신호'}</strong>
              </div>
              {count > 1 && <b aria-label={`${count}개 보유`}>{count}</b>}
            </article>
          )
        }))}
      </div>
    </section>
  )
}

export default function GalaxyRoverPanel({
  expedition,
  nowMs = 0,
  materials = {},
  discoveries = {},
  hasRoverBay = false,
  hasExpeditionBeacon = false,
  abilityValues = {},
  busy = false,
  onDispatch,
  onClaim,
}) {
  const expeditionRouteId = expedition?.route || expedition?.routeId || ''
  const initialRoute = GALAXY_ROVER_ROUTES[expeditionRouteId] ? expeditionRouteId : 'nebula'
  const [selectedRoute, setSelectedRoute] = useState(initialRoute)
  const status = getGalaxyRoverStatus(expedition, nowMs)
  const route = GALAXY_ROVER_ROUTES[expeditionRouteId] || GALAXY_ROVER_ROUTES[selectedRoute]
  const canChooseRoute = status === 'idle' || status === 'claimed'
  const effectiveRouteId = canChooseRoute ? selectedRoute : expeditionRouteId || selectedRoute
  const selectedConfig = GALAXY_ROVER_ROUTES[effectiveRouteId] || GALAXY_ROVER_ROUTES.nebula
  const selectedAbilityLevel = Math.max(1, Number(
    expedition?.bonuses?.abilityLevel ?? abilityValues?.[selectedConfig.ability] ?? 1,
  ) || 1)
  const hasAbilityBonus = selectedAbilityLevel >= 4
  const currentDiscovery = expedition?.discovery || expedition?.result?.discovery
  const busyLabel = String(busy || '').toLowerCase()
  const isClaimBusy = Boolean(busy) && (busyLabel.includes('claim') || busyLabel.includes('return') || busy === true)

  return (
    <div className={`galaxy-rover-panel status-${status}`}>
      <header className="galaxy-rover-header">
        <div className="galaxy-rover-header__identity">
          <span><Rocket size={23} aria-hidden="true" /></span>
          <div><small>ASTRA ROVER COMMAND</small><h2>밤사이 로버 원정</h2><p>지금 항로를 정하면, 다음 귀환에 열어볼 새로운 행성 기억이 생깁니다.</p></div>
        </div>
        <div className={`galaxy-rover-status status-${status}`} role="status" aria-live="polite">
          <i />
          {status === 'idle' && '출항 대기'}
          {status === 'active' && '원정 진행 중'}
          {status === 'ready' && '귀환 상자 도착'}
          {status === 'claimed' && '귀환 기록 완료'}
        </div>
      </header>

      <div className="galaxy-rover-perks" aria-label="로버 원정 보너스">
        <ExpeditionPerk active={hasRoverBay} icon={Wrench} title={hasRoverBay ? '로버 정비소 가속 적용' : '로버 정비소 미설치'}>
          {hasRoverBay ? '기본 8시간 원정이 6시간으로 단축됩니다.' : '정비소를 건설하면 원정 시간이 8시간에서 6시간으로 줄어듭니다.'}
        </ExpeditionPerk>
        <ExpeditionPerk active={hasExpeditionBeacon} icon={SatelliteDish} title={hasExpeditionBeacon ? '원정대 비콘 보정 적용' : '원정대 비콘 미설치'}>
          {hasExpeditionBeacon ? '항로 신호가 강화되어 회수 재료가 1개 늘어납니다.' : '비콘을 건설하면 원정마다 회수 재료를 1개 더 가져옵니다.'}
        </ExpeditionPerk>
        <ExpeditionPerk active={hasAbilityBonus} icon={Radar} title={`${selectedConfig.abilityLabel} Lv.${selectedAbilityLevel}`}>
          {hasAbilityBonus
            ? `학습 공명이 적용되어 ${selectedConfig.reward} 보상이 1개 늘어납니다.`
            : `Lv.4에 도달하면 ${selectedConfig.reward} 보상이 1개 늘어납니다.`}
        </ExpeditionPerk>
      </div>

      {status === 'active' && <ExpeditionTrack routeId={expeditionRouteId} route={route} expedition={expedition} nowMs={nowMs} />}
      {status === 'ready' && <ReturnCrate route={route} busy={isClaimBusy} onClaim={onClaim} />}
      {status === 'claimed' && <ClaimedResult expedition={expedition} fallbackRoute={route} />}

      {canChooseRoute && (
        <section className="galaxy-rover-dispatch" aria-labelledby="galaxy-rover-dispatch-title">
          <header>
            <div><small>{status === 'claimed' ? 'NEXT EXPEDITION' : 'SELECT EXPEDITION'}</small><h3 id="galaxy-rover-dispatch-title">다음 귀환 항로를 선택하세요</h3></div>
            <span><Clock3 size={15} aria-hidden="true" /> {hasRoverBay ? '정비소 가속 · 6시간' : '기본 항해 · 8시간'}</span>
          </header>
          <RouteSelector selectedRoute={selectedRoute} onSelect={setSelectedRoute} materials={materials} hasRoverBay={hasRoverBay} disabled={Boolean(busy)} />
          <div className="galaxy-rover-dispatch__footer">
            <div>
              <strong><Rocket size={16} aria-hidden="true" /> {selectedConfig.label}</strong>
              <span>{selectedConfig.reward} {selectedConfig.baseReward}개 + 발견 기록 1개를 회수합니다.</span>
            </div>
            <button
              type="button"
              className="galaxy-rover-primary"
              disabled={Boolean(busy) || !onDispatch}
              onClick={() => onDispatch?.(selectedRoute)}
            >
              {busy ? '출항 신호 전송 중…' : status === 'claimed' ? '다음 원정 출발' : '로버 출항'}
              {!busy && <ChevronRight size={17} aria-hidden="true" />}
            </button>
          </div>
        </section>
      )}

      <DiscoveryArchive discoveries={discoveries} currentDiscovery={status === 'claimed' ? currentDiscovery : null} />
    </div>
  )
}
