import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  BookOpen,
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
  getGalaxyRoverRouteDiscoveryCount,
  getGalaxyRoverStatus,
  getGalaxyRoverPhase,
} from '../../utils/galaxyGame'
import soundManager from '../../utils/SoundManager'
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
      const previous = owned.get(value) || {}
      owned.set(value, { ...previous, count: Math.max(1, Number(previous.count || 0)) })
      return
    }
    if (typeof value === 'number') {
      if (fallbackId && value > 0) {
        const previous = owned.get(fallbackId) || {}
        owned.set(fallbackId, { ...previous, count: Math.max(value, Number(previous.count || 0)) })
      }
      return
    }
    if (typeof value !== 'object') return
    const id = String(value.id || value.discoveryId || fallbackId || '')
    const count = Math.max(1, Number(value.count || value.quantity || 1))
    if (id) {
      const previous = owned.get(id) || {}
      owned.set(id, {
        ...previous,
        ...value,
        count: Math.max(count, Number(value.observationCount || 0), Number(previous.count || 0)),
      })
    }
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

function RouteSelector({ selectedRoute, onSelect, materials, hasRoverBay, hasExpeditionBeacon, abilityValues, disabled }) {
  return (
    <div className="galaxy-rover-routes" role="radiogroup" aria-label="로버 원정 항로">
      {Object.entries(GALAXY_ROVER_ROUTES).map(([routeId, route]) => {
        const Icon = ROUTE_ICONS[routeId] || Radar
        const selected = selectedRoute === routeId
        const durationHours = (hasRoverBay ? route.roverBayDurationMs : route.durationMs) / (60 * 60 * 1000)
        const abilityBonus = Math.max(1, Number(abilityValues?.[route.ability] || 1)) >= 4 ? 1 : 0
        const expectedReward = route.baseReward + (hasExpeditionBeacon ? 1 : 0) + abilityBonus
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
              <small>{route.shortLabel} 장거리 항로</small>
              <strong>{route.label}</strong>
              <span>{route.copy}</span>
            </span>
            <span className="galaxy-rover-route__facts">
              <i><Clock3 size={13} aria-hidden="true" /> {durationHours}시간</i>
              <i><PackageOpen size={13} aria-hidden="true" /> 예상 재료 {expectedReward}개</i>
              <i><Archive size={13} aria-hidden="true" /> 발견 기록 1개</i>
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
  const accelerated = Boolean(expedition?.bonuses?.roverBay)

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
      {expedition?.storyContextAtLaunch?.title && <div className="galaxy-rover-mission-context"><small>{expedition.storyContextAtLaunch.eyebrow || '출항 당시 임무'}</small><strong>{expedition.storyContextAtLaunch.title}</strong><p>{expedition.storyContextAtLaunch.detail}</p></div>}
      <p className="galaxy-rover-persistence"><SatelliteDish size={15} aria-hidden="true" /> 서버에 원정이 저장되었습니다. 아스트라 프론티어를 나가거나 앱을 닫아도 이 시간부터 계속 진행됩니다.</p>
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
        <div><dt>정비소 가속</dt><dd>{accelerated ? '적용 · 총 6시간' : '미적용 · 총 8시간'}</dd></div>
      </dl>
    </section>
  )
}

function ReturnCrate({ route, expedition, busy, onClaim }) {
  const reward = expedition?.reward || {}
  const rewardAmount = Math.max(0, Number(reward.amount || route?.baseReward || 1))
  const beaconBonus = Math.max(0, Number(reward.beaconBonus || 0))
  const abilityBonus = Math.max(0, Number(reward.abilityBonus || 0))
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
          <span><PackageOpen size={16} aria-hidden="true" /> {reward.title || route?.reward || '원정 재료'} {rewardAmount}개 확정</span>
          <span><Sparkles size={16} aria-hidden="true" /> 미확인 발견 신호 1개</span>
        </div>
        {(beaconBonus > 0 || abilityBonus > 0) && (
          <p>기본 {reward.baseAmount || route?.baseReward || 1}개{beaconBonus > 0 ? ' + 비콘 1개' : ''}{abilityBonus > 0 ? ' + 학습 공명 1개' : ''}</p>
        )}
        <button type="button" className="galaxy-rover-primary" disabled={Boolean(busy) || !onClaim} onClick={onClaim}>
          {busy ? '귀환 상자 동기화 중…' : '귀환 상자 열기'}
          {!busy && <ChevronRight size={17} aria-hidden="true" />}
        </button>
      </div>
    </section>
  )
}

function ClaimedResult({ expedition, fallbackRoute, busy, onAcknowledge, onOpenBuildForMaterial, discoveries }) {
  const result = expedition?.result || {}
  const reward = result.reward || expedition?.reward || {}
  const discovery = useMemo(() => result.discovery || expedition?.discovery || {}, [result.discovery, expedition?.discovery])
  const rewardMaterial = reward.material || reward.rewardMaterial || fallbackRoute?.rewardMaterial
  const rewardAmount = Math.max(0, Number(reward.amount || reward.quantity || fallbackRoute?.baseReward || 0))
  const rewardTitle = reward.title || reward.name || MATERIAL_LABELS[rewardMaterial] || fallbackRoute?.reward || '원정 재료'
  const discoveryName = discovery.name || discovery.title || '새로운 항로 흔적'
  const rarity = RARITY_META[discovery.rarity] || RARITY_META.common
  const baseAmount = Math.max(0, Number(reward.baseAmount || 0))
  const beaconBonus = Math.max(0, Number(reward.beaconBonus || 0))
  const abilityBonus = Math.max(0, Number(reward.abilityBonus || 0))
  const operationId = expedition?.operationId
  const isNew = result.isNewDiscovery !== false

  // 항로 완성(이번 발견으로 해당 항로 3종 달성)과 전체 도감 완성 여부를 귀환 보고서에 전달된 discoveries로 계산한다.
  const routeId = expedition?.route || fallbackRoute?.routeId
  const owned = useMemo(() => normalizeOwnedDiscoveries(discoveries, discovery), [discoveries, discovery])
  const routeOwnedCount = getGalaxyRoverRouteDiscoveryCount([...owned.values()], routeId)
  const routeDiscoveryTotal = GALAXY_ROVER_ROUTES[routeId]?.discoveries?.length || 3
  const routeCompleted = routeOwnedCount >= routeDiscoveryTotal
  const ownedCount = GALAXY_ROVER_DISCOVERIES.filter((entry) => owned.has(entry.id)).length
  const codexCompleted = ownedCount >= GALAXY_ROVER_DISCOVERIES.length

  // 보고서가 처음 마운트될 때 한 번만 성취 사운드를 재생한다. claim 시점에 이미 frontier.rover.complete가
  // 재생되므로 여기서는 신규 전설 발견·항로 완성·도감 완성 같은 더 높은 성취에만 사운드를 더한다.
  const celebratedRef = useRef('')
  useEffect(() => {
    const celebrationKey = operationId || 'unknown'
    if (celebratedRef.current === celebrationKey) return
    celebratedRef.current = celebrationKey
    if (codexCompleted) {
      soundManager.play('frontier.mission.complete')
      return
    }
    if (routeCompleted && isNew) {
      soundManager.play('frontier.build.complete')
      return
    }
    if (isNew && rarity.className === 'legendary') {
      soundManager.play('frontier.mission.complete')
    }
  }, [operationId, isNew, rarity.className, routeCompleted, codexCompleted])

  return (
    <section className="galaxy-rover-claimed" aria-live="polite">
      <header>
        <span><Check size={20} aria-hidden="true" /></span>
        <div><small>RETURN REPORT READY</small><h3>루미의 귀환 보고서</h3></div>
      </header>
      {codexCompleted && <p className="galaxy-rover-claimed__milestone"><Sparkles size={16} aria-hidden="true" /> 발견 도감 9종을 모두 복원했습니다. 아스트라의 잃어버린 기억이 온전히 되돌아왔습니다.</p>}
      <div className="galaxy-rover-claimed__loot">
        <article>
          <span><PackageOpen size={22} aria-hidden="true" /></span>
          <div><small>회수 재료</small><strong>{rewardTitle} +{rewardAmount}</strong>{Number.isFinite(Number(reward.balanceBefore)) && <em>출항 전 {reward.balanceBefore}개 → 현재 {reward.balanceAfter}개</em>}</div>
        </article>
        <article className={`rarity-${rarity.className}${isNew ? ' is-new' : ''}`}>
          <span><Sparkles size={22} aria-hidden="true" /></span>
          <div><small>{result.isNewDiscovery === false ? '다시 관측한 발견' : `${rarity.label} 새 발견`}</small><strong>{discoveryName}</strong><em>{result.isNewDiscovery === false ? '도감의 관측 횟수가 늘었습니다.' : '도감에 처음으로 기록되었습니다.'}</em></div>
        </article>
      </div>
      {routeCompleted && isNew && <p className="galaxy-rover-claimed__route-milestone"><em className="galaxy-rover-route-complete">{GALAXY_ROVER_ROUTES[routeId]?.label || '이 항로'} 기록 완성</em> 세 단계 기록을 모두 복원했습니다.</p>}
      <div className="galaxy-rover-report-breakdown"><strong>회수 계산</strong><span>기본 {baseAmount}개{beaconBonus ? ` + 원정대 비콘 ${beaconBonus}` : ''}{abilityBonus ? ` + 학습 공명 ${abilityBonus}` : ''}</span></div>
      {expedition?.storyContextAtLaunch?.title && <div className="galaxy-rover-mission-context"><small>{expedition.storyContextAtLaunch.eyebrow || '출항 당시 임무'}</small><strong>{expedition.storyContextAtLaunch.title}</strong><p>{expedition.storyContextAtLaunch.detail}</p></div>}
      {result.storyProgressAtClaim?.advancedStepIds?.length > 0 && <p>이 귀환으로 프론티어 이야기의 다음 단서가 열렸습니다.</p>}
      <p>보고서를 보관하면 이번 원정은 일지에 남고, 그때 다음 원정을 준비할 수 있습니다.</p>
      <div className="galaxy-rover-report-actions">
        <button type="button" className="galaxy-rover-primary" disabled={Boolean(busy) || !onAcknowledge} onClick={onAcknowledge}>
          {busy ? '보고서 보관 중…' : '보고서를 보관하고 다음 원정 준비'}
          {!busy && <ChevronRight size={17} aria-hidden="true" />}
        </button>
        {onOpenBuildForMaterial && <button type="button" className="galaxy-rover-secondary" onClick={() => onOpenBuildForMaterial(rewardMaterial)}>이 재료로 시설 보기</button>}
      </div>
    </section>
  )
}

function DiscoveryArchive({ discoveries, currentDiscovery }) {
  const owned = useMemo(
    () => normalizeOwnedDiscoveries(discoveries, currentDiscovery),
    [currentDiscovery, discoveries],
  )
  const ownedCount = GALAXY_ROVER_DISCOVERIES.filter((entry) => owned.has(entry.id)).length
  const codexCompleted = ownedCount >= GALAXY_ROVER_DISCOVERIES.length
  const [view, setView] = useState('all')

  return (
    <section className="galaxy-rover-archive" aria-labelledby="galaxy-rover-archive-title">
      <header>
        <div><small>ASTRA DISCOVERY ARCHIVE</small><h3 id="galaxy-rover-archive-title">루미 발견 도감</h3><p>각 항로에는 일반·희귀·전설 기록이 있습니다. 아직 발견하지 못한 칸은 다음 탐사의 목표이며, 같은 기록을 다시 만나면 관측 횟수로 남습니다.</p></div>
        <strong className={codexCompleted ? 'is-complete' : ''}><Archive size={16} aria-hidden="true" /> {ownedCount} / {GALAXY_ROVER_DISCOVERIES.length}{codexCompleted ? ' · 기억망 완성!' : ''}</strong>
      </header>
      <div className="galaxy-rover-archive__meter" aria-hidden="true"><i style={{ width: `${ownedCount / GALAXY_ROVER_DISCOVERIES.length * 100}%` }} /></div>
      <div className="galaxy-rover-archive__filters" role="group" aria-label="도감 표시 범위">
        <button type="button" className={view === 'all' ? 'is-active' : ''} onClick={() => setView('all')}>전체 {GALAXY_ROVER_DISCOVERIES.length}개</button>
        <button type="button" className={view === 'owned' ? 'is-active' : ''} onClick={() => setView('owned')}>발견 완료 {ownedCount}개</button>
      </div>
      <div className="galaxy-rover-archive__routes">
        {Object.entries(GALAXY_ROVER_ROUTES).map(([routeId, route]) => {
          const routeOwnedCount = getGalaxyRoverRouteDiscoveryCount([...owned.values()], routeId)
          const routeCompleted = routeOwnedCount === route.discoveries.length
          const visibleDiscoveries = view === 'owned'
            ? route.discoveries.filter((discovery) => owned.has(discovery.id))
            : route.discoveries
          const RouteIcon = ROUTE_ICONS[routeId] || Radar
          if (!visibleDiscoveries.length) return null
          return (
            <section className={`galaxy-rover-archive-route route-${routeId}`} key={routeId} style={{ '--rover-route-accent': route.accent }}>
              <header>
                <span><RouteIcon size={18} aria-hidden="true" /></span>
                <div><strong>{route.label}{routeCompleted && <em className="galaxy-rover-route-complete" title="이 항로의 일반·희귀·전설 세 단계 기록을 모두 복원했습니다.">항로 기록 완성</em>}</strong><small>{route.reward} 회수 항로 · 기록 복원 {routeOwnedCount}/3{routeCompleted ? ' · 세 단계 기록을 모두 복원했습니다.' : ''}</small></div>
              </header>
              <div className="galaxy-rover-discoveries">
                {visibleDiscoveries.map((discovery) => {
                  const isOwned = owned.has(discovery.id)
                  const discoveryRecord = owned.get(discovery.id) || {}
                  const rarity = RARITY_META[discovery.rarity] || RARITY_META.common
                  const Icon = DISCOVERY_ICONS[routeId] || Sparkles
                  return (
                    <article
                      className={`galaxy-rover-discovery rarity-${rarity.className}${isOwned ? ' is-owned' : ' is-locked'}`}
                      key={discovery.id}
                    >
                      <span className="galaxy-rover-discovery__icon">{isOwned ? <Icon size={20} aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />}</span>
                      <div>
                        <small>{isOwned ? `기록 등급 · ${rarity.label}${discoveryRecord.count > 1 ? ` · ${discoveryRecord.count}회 관측` : ''}` : `기록 등급 · ${rarity.label} · 아직 미발견`}</small>
                        <strong>{isOwned ? discovery.name : `${route.shortLabel} 원정에서 발견`}</strong>
                        <p>{isOwned
                          ? `${discovery.description}${discoveryRecord.discoveredAtMs ? ` · 최초 기록 ${formatGalaxyTime(discoveryRecord.discoveredAtMs)}` : ''}`
                          : '이 항로의 원정을 완료하고 귀환 보고서를 열면 발견할 수 있습니다.'}</p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
        {view === 'owned' && ownedCount === 0 && <p className="galaxy-rover-archive__empty">아직 발견물이 없습니다. 첫 원정을 완료하고 귀환 상자를 열어 보세요.</p>}
      </div>
    </section>
  )
}

function RoverJournal({ entries = [], loaded = false, loading = false, hasMore = false, onLoadMore }) {
  if (!loaded && !loading) return <section className="galaxy-rover-journal"><p>원정 일지를 열어 귀환 기록을 불러오세요.</p><button type="button" className="galaxy-rover-secondary" onClick={() => onLoadMore?.()}>원정 일지 불러오기</button></section>
  if (loading && !entries.length) return <section className="galaxy-rover-journal"><p>원정 일지를 불러오는 중입니다…</p></section>
  return (
    <section className="galaxy-rover-journal" aria-label="루미 원정 일지">
      <header><div><small>ROVER EXPEDITION JOURNAL</small><h3>완료한 원정 일지</h3><p>보관한 보고서만 여기에 남습니다. 언제 어디로 떠났고 무엇을 행성에 남겼는지 다시 볼 수 있습니다.</p></div><BookOpen size={22} aria-hidden="true" /></header>
      {!entries.length && <p className="galaxy-rover-archive__empty">아직 보관한 원정이 없습니다. 첫 귀환 보고서를 보관하면 이곳에 기록됩니다.</p>}
      <div className="galaxy-rover-journal__entries">
        {entries.map((entry) => {
          const reward = entry.reward || {}
          const discovery = entry.discovery || {}
          return <article key={entry.operationId}>
            <span>#{entry.expeditionNo || '—'}</span>
            <div><small>{entry.routeTitle || '루미 로버 원정'} · {formatGalaxyTime(entry.claimedAtMs || entry.reportAcknowledgedAtMs)}</small><strong>{reward.title || MATERIAL_LABELS[reward.material] || '원정 재료'} +{Math.max(0, Number(reward.amount || 0))}</strong><p>{discovery.name ? `${entry.isNewDiscovery === false ? '다시 관측: ' : '새 발견: '}${discovery.name}` : '귀환 기록을 보관했습니다.'}</p></div>
          </article>
        })}
      </div>
      {hasMore && <button type="button" className="galaxy-rover-secondary" disabled={loading} onClick={() => onLoadMore?.(entries.at(-1)?.operationId)}>{loading ? '더 불러오는 중…' : '이전 원정 더 보기'}</button>}
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
  storyObjective = null,
  historyEntries = [],
  historyLoaded = false,
  historyLoading = false,
  historyHasMore = false,
  onDispatch,
  onClaim,
  onAcknowledgeReport,
  onLoadHistory,
  onOpenBuildForMaterial,
}) {
  const expeditionRouteId = expedition?.route || expedition?.routeId || ''
  const initialRoute = GALAXY_ROVER_ROUTES[expeditionRouteId] ? expeditionRouteId : 'nebula'
  const [selectedRoute, setSelectedRoute] = useState(initialRoute)
  const [tab, setTab] = useState('codex')
  const status = getGalaxyRoverStatus(expedition, nowMs)
  const phase = getGalaxyRoverPhase(expedition, nowMs)
  const route = GALAXY_ROVER_ROUTES[expeditionRouteId] || GALAXY_ROVER_ROUTES[selectedRoute]
  const canChooseRoute = phase === 'prepare'
  const effectiveRouteId = canChooseRoute ? selectedRoute : expeditionRouteId || selectedRoute
  const selectedConfig = GALAXY_ROVER_ROUTES[effectiveRouteId] || GALAXY_ROVER_ROUTES.nebula
  const selectedAbilityLevel = Math.max(1, Number(
    canChooseRoute
      ? abilityValues?.[selectedConfig.ability] ?? 1
      : expedition?.bonuses?.abilityLevel ?? abilityValues?.[selectedConfig.ability] ?? 1,
  ) || 1)
  const hasAbilityBonus = selectedAbilityLevel >= 4
  const activeExpeditionLocked = phase === 'expedition' || phase === 'returned' || phase === 'report'
  const roverBayApplied = activeExpeditionLocked ? Boolean(expedition?.bonuses?.roverBay) : hasRoverBay
  const expeditionBeaconApplied = activeExpeditionLocked ? Boolean(expedition?.bonuses?.expeditionBeacon) : hasExpeditionBeacon
  const roverBayInstalledAfterLaunch = activeExpeditionLocked && hasRoverBay && !roverBayApplied
  const roverBayRemovedAfterLaunch = activeExpeditionLocked && !hasRoverBay && roverBayApplied
  const expectedReward = selectedConfig.baseReward + (hasExpeditionBeacon ? 1 : 0) + (hasAbilityBonus ? 1 : 0)
  const currentDiscovery = expedition?.discovery || expedition?.result?.discovery
  const busyLabel = String(busy || '').toLowerCase()
  const isClaimBusy = Boolean(busy) && (busyLabel.includes('claim') || busyLabel.includes('return') || busy === true)
  const isAcknowledgeBusy = Boolean(busy) && (busyLabel.includes('acknowledge') || busyLabel.includes('archive') || busy === true)
  const missionContext = phase === 'prepare' ? storyObjective : expedition?.storyContextAtLaunch

  useEffect(() => {
    if (tab === 'journal' && !historyLoaded && !historyLoading) onLoadHistory?.()
  }, [historyLoaded, historyLoading, onLoadHistory, tab])

  return (
    <div className={`galaxy-rover-panel status-${status} phase-${phase}`}>
      <header className="galaxy-rover-header">
        <div className="galaxy-rover-header__identity">
          <span><Rocket size={23} aria-hidden="true" /></span>
          <div><small>ASTRA LUMI ROVER CONTROL</small><h2>루미 로버 원정 관제</h2><p>{phase === 'expedition'
            ? '루미가 출항 당시 정한 임무를 수행하고 있습니다. 화면을 닫아도 귀환 시각과 보상 약속은 그대로 유지됩니다.'
            : phase === 'returned'
              ? '루미가 귀환했습니다. 귀환 보고서를 열어 재료와 발견 기록을 확인하세요.'
              : phase === 'report'
                ? '이번 원정의 보상이 적용되었습니다. 보고서를 보관하면 일지에 남고 다음 출항을 준비할 수 있습니다.'
                : '지금 필요한 행성의 일을 고르고 루미에게 한 가지 임무를 맡기세요. 한 번에 하나의 원정만 진행됩니다.'}</p></div>
        </div>
        <div className={`galaxy-rover-status status-${status}`} role="status" aria-live="polite">
          <i />
          {phase === 'prepare' && '출항 준비'}
          {phase === 'expedition' && '원정 진행 중'}
          {phase === 'returned' && '귀환 완료'}
          {phase === 'report' && '보고서 보관 대기'}
        </div>
      </header>

      {missionContext && <section className="galaxy-rover-story-brief"><small>{phase === 'prepare' ? missionContext.eyebrow || '현재 프론티어 임무' : missionContext.eyebrow || '출항 당시 임무'}</small><strong>{missionContext.title}</strong><p>{missionContext.detail}</p></section>}

      <div className="galaxy-rover-perks" aria-label="로버 원정 보너스">
        <ExpeditionPerk active={roverBayApplied} icon={Wrench} title={roverBayApplied ? '로버 정비소 가속 적용' : roverBayInstalledAfterLaunch ? '다음 원정부터 정비소 적용' : '로버 정비소 미적용'}>
          {roverBayInstalledAfterLaunch
            ? '이번 원정은 출발 당시 정비소가 없어 8시간이며, 다음 원정부터 6시간으로 줄어듭니다.'
            : roverBayRemovedAfterLaunch
              ? '출발할 때 적용되어 이번 원정은 6시간입니다. 다음 원정에는 정비소를 다시 설치해야 합니다.'
              : roverBayApplied
                ? activeExpeditionLocked ? '출발할 때 가속이 확정되어 이번 원정은 총 6시간입니다.' : '다음 원정 시간이 8시간에서 6시간으로 줄어듭니다.'
                : '정비소를 건설하면 다음 원정 시간이 8시간에서 6시간으로 줄어듭니다.'}
        </ExpeditionPerk>
        <ExpeditionPerk active={expeditionBeaconApplied} icon={SatelliteDish} title={expeditionBeaconApplied ? '원정대 비콘 보정 적용' : activeExpeditionLocked && hasExpeditionBeacon ? '다음 원정부터 비콘 적용' : '원정대 비콘 미적용'}>
          {activeExpeditionLocked && hasExpeditionBeacon && !expeditionBeaconApplied
            ? '이번 원정은 출발 뒤 비콘이 설치되어 보너스가 없고, 다음 원정부터 재료가 1개 늘어납니다.'
            : expeditionBeaconApplied
              ? activeExpeditionLocked ? '출발할 때 보정이 확정되어 이번 원정의 회수 재료가 1개 늘어납니다.' : '다음 원정의 회수 재료가 1개 늘어납니다.'
              : '비콘을 건설하면 다음 원정마다 회수 재료를 1개 더 가져옵니다.'}
        </ExpeditionPerk>
        <ExpeditionPerk active={hasAbilityBonus} icon={Radar} title={`${selectedConfig.abilityLabel} Lv.${selectedAbilityLevel}`}>
          {hasAbilityBonus
            ? `학습 공명이 적용되어 ${selectedConfig.reward} 보상이 1개 늘어납니다.`
            : `Lv.4에 도달하면 ${selectedConfig.reward} 보상이 1개 늘어납니다.`}
        </ExpeditionPerk>
      </div>

      {phase === 'expedition' && <ExpeditionTrack routeId={expeditionRouteId} route={route} expedition={expedition} nowMs={nowMs} />}
      {phase === 'returned' && <ReturnCrate route={route} expedition={expedition} busy={isClaimBusy} onClaim={onClaim} />}
      {phase === 'report' && <ClaimedResult expedition={expedition} fallbackRoute={route} busy={isAcknowledgeBusy} onAcknowledge={() => onAcknowledgeReport?.(expedition?.operationId)} onOpenBuildForMaterial={onOpenBuildForMaterial} discoveries={discoveries} />}

      {canChooseRoute && (
        <section className="galaxy-rover-dispatch" aria-labelledby="galaxy-rover-dispatch-title">
          <header>
            <div><small>1단계 · 이번 원정의 임무 고르기</small><h3 id="galaxy-rover-dispatch-title">어느 항로의 기억을 되찾을까요?</h3></div>
            <span><Clock3 size={15} aria-hidden="true" /> {hasRoverBay ? '정비소 가속 · 6시간' : '기본 항해 · 8시간'}</span>
          </header>
          <RouteSelector selectedRoute={selectedRoute} onSelect={setSelectedRoute} materials={materials} hasRoverBay={hasRoverBay} hasExpeditionBeacon={hasExpeditionBeacon} abilityValues={abilityValues} disabled={Boolean(busy)} />
          <div className="galaxy-rover-dispatch__footer">
            <div>
              <strong><Rocket size={16} aria-hidden="true" /> {selectedConfig.label}</strong>
              <span>{selectedConfig.reward} {expectedReward}개와 미확인 발견 신호 1개를 가져옵니다. 기본 {selectedConfig.baseReward}{hasExpeditionBeacon ? ' + 비콘 1' : ''}{hasAbilityBonus ? ' + 학습 공명 1' : ''}</span>
              <em>출항을 기록하면 {hasRoverBay ? '6시간' : '8시간'} 동안 이 원정만 관제합니다.</em>
            </div>
            <button
              type="button"
              className="galaxy-rover-primary"
              disabled={Boolean(busy) || !onDispatch}
              onClick={() => onDispatch?.(selectedRoute)}
            >
              {busy ? '출발 기록 저장 중…' : `${hasRoverBay ? '6시간' : '8시간'} 원정 출항 기록하기`}
              {!busy && <ChevronRight size={17} aria-hidden="true" />}
            </button>
          </div>
        </section>
      )}

      <div className="galaxy-rover-tabs" role="tablist" aria-label="루미 원정 기록">
        <button type="button" role="tab" aria-selected={tab === 'codex'} className={tab === 'codex' ? 'is-active' : ''} onClick={() => setTab('codex')}>발견 도감</button>
        <button type="button" role="tab" aria-selected={tab === 'journal'} className={tab === 'journal' ? 'is-active' : ''} onClick={() => setTab('journal')}>원정 일지</button>
      </div>
      {tab === 'codex'
        ? <DiscoveryArchive discoveries={discoveries} currentDiscovery={phase === 'report' ? currentDiscovery : null} />
        : <RoverJournal entries={historyEntries} loaded={historyLoaded} loading={historyLoading} hasMore={historyHasMore} onLoadMore={(cursorOperationId) => onLoadHistory?.(cursorOperationId)} />}
    </div>
  )
}
