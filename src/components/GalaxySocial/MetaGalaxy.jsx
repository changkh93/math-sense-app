import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { db, functions } from '../../firebase'
import {
  GALAXY_ABILITIES,
  GALAXY_MISSION_ROUTES,
  GALAXY_PLAY_STYLES,
  GALAXY_THEMES,
  GALAXY_VISIT_ACTIONS,
  MATERIAL_LABELS,
  formatGalaxyTime,
  getMissionCooldown,
} from '../../utils/galaxyGame'
import './MetaGalaxy.css'

const callGalaxy = (name, payload = {}) => httpsCallable(functions, name)(payload).then((result) => result.data)
const VISIT_MESSAGES = [
  '새로운 풍경이 정말 멋져!',
  '다음 탐사도 같이 가자!',
  '정원을 조금 돌보고 갔어.',
  '이 행성의 색 조합이 좋아!',
]

function GalaxyLoading() {
  return (
    <div className="galaxy-loading" role="status">
      <span className="galaxy-loader-orbit"><i /></span>
      <strong>당신의 행성 신호를 찾고 있어요</strong>
      <small>학습 보급과 탐사 기록을 동기화하는 중입니다.</small>
    </div>
  )
}

function MaterialStrip({ materials = {} }) {
  return (
    <div className="galaxy-material-strip" aria-label="게임 재료">
      {Object.entries(MATERIAL_LABELS).map(([id, label]) => (
        <span key={id}><i className={`material-dot ${id}`} />{label}<strong>{Number(materials[id] || 0)}</strong></span>
      ))}
    </div>
  )
}

function PlanetCanvas({ planet, isOwner, selectedId, onSelect, onMove }) {
  const layout = Array.isArray(planet?.layout) ? planet.layout : []
  const selected = layout.find((item) => item.instanceId === selectedId)

  return (
    <div className={`galaxy-planet-canvas theme-${planet?.theme || 'forest'}`}>
      <div className="planet-aurora" />
      <div className="planet-orbit orbit-one" />
      <div className="planet-orbit orbit-two" />
      <div className="planet-surface">
        <div className="planet-grid" />
        {layout.map((item) => (
          <button
            type="button"
            key={item.instanceId}
            className={`planet-object ${selectedId === item.instanceId ? 'selected' : ''}`}
            style={{ left: `${item.x}%`, top: `${item.y}%`, transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)` }}
            onClick={() => isOwner && onSelect(item.instanceId)}
            aria-label={`${item.name}${isOwner ? ', 배치 선택' : ''}`}
          >
            <span>{item.icon || '✦'}</span>
            <small>{item.name}</small>
          </button>
        ))}
      </div>
      <div className="planet-moon moon-one" />
      <div className="planet-moon moon-two" />
      {isOwner && selected && !selected.locked && (
        <div className="planet-move-controls" aria-label={`${selected.name} 배치 조정`}>
          <strong>{selected.name}</strong>
          <div>
            <button type="button" onClick={() => onMove(selected, 0, -7)}>↑</button>
            <button type="button" onClick={() => onMove(selected, -7, 0)}>←</button>
            <button type="button" onClick={() => onMove(selected, 7, 0)}>→</button>
            <button type="button" onClick={() => onMove(selected, 0, 7)}>↓</button>
            <button type="button" onClick={() => onMove(selected, 0, 0, 45)}>↻</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PassportEditor({ planet, onSave, busy }) {
  const [form, setForm] = useState(() => ({
    planetName: planet?.planetName || '',
    tagline: planet?.tagline || '',
    theme: planet?.theme || 'forest',
    playStyles: planet?.playStyles || [],
    visitMode: planet?.visitMode || 'crew',
  }))

  const toggleStyle = (style) => {
    setForm((current) => {
      const active = current.playStyles.includes(style)
      if (!active && current.playStyles.length >= 3) return current
      return { ...current, playStyles: active ? current.playStyles.filter((id) => id !== style) : [...current.playStyles, style] }
    })
  }

  return (
    <form className="galaxy-passport-editor" onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
      <label>
        <span>행성 이름</span>
        <input value={form.planetName} maxLength={30} onChange={(event) => setForm({ ...form, planetName: event.target.value })} />
      </label>
      <label>
        <span>방문자에게 보여줄 한마디</span>
        <input value={form.tagline} maxLength={80} onChange={(event) => setForm({ ...form, tagline: event.target.value })} />
      </label>
      <fieldset>
        <legend>행성 기후</legend>
        <div className="passport-choice-grid themes">
          {Object.entries(GALAXY_THEMES).map(([id, theme]) => (
            <button type="button" key={id} className={form.theme === id ? 'active' : ''} onClick={() => setForm({ ...form, theme: id })}>
              <span>{theme.icon}</span>{theme.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>나의 게임 취향 · 최대 3개</legend>
        <div className="passport-choice-grid">
          {Object.entries(GALAXY_PLAY_STYLES).map(([id, style]) => (
            <button type="button" key={id} className={form.playStyles.includes(id) ? 'active' : ''} onClick={() => toggleStyle(id)}>
              <span>{style.icon}</span>{style.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="passport-visit-toggle">
        <span><strong>크루 방문 허용</strong><small>같은 스터디 크루 친구가 돌보고 감탄을 남길 수 있어요.</small></span>
        <input type="checkbox" checked={form.visitMode === 'crew'} onChange={(event) => setForm({ ...form, visitMode: event.target.checked ? 'crew' : 'private' })} />
      </label>
      <button className="galaxy-primary-btn" type="submit" disabled={busy === 'passport'}>{busy === 'passport' ? '기록 중…' : '탐험가 패스포트 저장'}</button>
    </form>
  )
}

export default function MetaGalaxy({ user, userData, onBack }) {
  const [home, setHome] = useState(null)
  const [targetUid, setTargetUid] = useState(user?.uid || '')
  const [tab, setTab] = useState('planet')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [visitMessage, setVisitMessage] = useState(VISIT_MESSAGES[0])
  const [missionPartnerUid, setMissionPartnerUid] = useState('')
  const [nowMs, setNowMs] = useState(Date.now())
  const isOwner = targetUid === user?.uid

  const loadHome = useCallback(async (nextTargetUid = user?.uid, { quiet = false } = {}) => {
    if (!user?.uid) return
    if (!quiet) setLoading(true)
    setError('')
    try {
      const data = await callGalaxy('openGalaxyHome', { targetUid: nextTargetUid })
      setHome(data)
      setTargetUid(nextTargetUid || user.uid)
    } catch (err) {
      setError(err?.message || '행성 신호를 불러오지 못했습니다.')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => { loadHome(user?.uid) }, [loadHome, user?.uid])

  useEffect(() => {
    if (!targetUid) return undefined
    return onSnapshot(doc(db, 'galaxyPlanets', targetUid), (snapshot) => {
      if (!snapshot.exists()) return
      setHome((current) => current ? { ...current, planet: { id: snapshot.id, ...snapshot.data() }, ...(targetUid === user?.uid ? { ownPlanet: { id: snapshot.id, ...snapshot.data() } } : {}) } : current)
    })
  }, [targetUid, user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    const eventQuery = query(collection(db, 'galaxyPlanets', user.uid, 'visitEvents'), orderBy('createdAt', 'desc'), limit(30))
    return onSnapshot(eventQuery, (snapshot) => {
      const events = snapshot.docs.map((eventDoc) => ({ id: eventDoc.id, ...eventDoc.data(), createdAt: eventDoc.data()?.createdAt?.toDate?.()?.toISOString?.() || '' }))
      setHome((current) => current ? { ...current, events } : current)
    })
  }, [user?.uid])

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const planet = home?.planet || {}
  const ownPlanet = home?.ownPlanet || {}
  const events = home?.events || []
  const unreadCount = events.filter((event) => !event.seen).length
  const wallet = Number(userData?.crystals ?? home?.wallet ?? 0)
  const theme = GALAXY_THEMES[planet.theme] || GALAXY_THEMES.forest
  const missionCooldown = getMissionCooldown(ownPlanet.lastMissionAtMs, nowMs)

  const flash = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3600)
  }

  const runAction = async (key, fn, successMessage) => {
    setBusy(key)
    setError('')
    try {
      const result = await fn()
      if (successMessage) flash(typeof successMessage === 'function' ? successMessage(result) : successMessage)
      return result
    } catch (err) {
      setError(err?.message || '은하 통신 중 문제가 발생했습니다.')
      return null
    } finally {
      setBusy('')
    }
  }

  const visitNeighbor = async (neighborUid) => {
    setSelectedId('')
    setTab('planet')
    await loadHome(neighborUid)
  }

  const buildItem = (itemId) => runAction(`build:${itemId}`, () => callGalaxy('buildGalaxyItem', { itemId }), (result) => `${result?.placed?.name || '새 시설'}이 행성에 도착했습니다.`)

  const moveItem = (item, dx, dy, rotationDelta = 0) => runAction('move', () => callGalaxy('moveGalaxyItem', {
    instanceId: item.instanceId,
    x: Number(item.x || 50) + dx,
    y: Number(item.y || 50) + dy,
    rotation: Number(item.rotation || 0) + rotationDelta,
  }))

  const performVisitAction = (actionId) => runAction(`visit:${actionId}`, () => callGalaxy('performGalaxyVisitAction', { targetUid, actionId, message: visitMessage }), (result) => result?.rewarded ? '도움이 기록되고 별가루 1개를 발견했습니다.' : '친구의 귀환 로그에 도움을 남겼습니다.')

  const runMission = async (route) => {
    const result = await runAction(`mission:${route}`, () => callGalaxy('runGalaxyMission', { route, partnerUid: missionPartnerUid }), (missionResult) => `${missionResult?.reward?.title || '탐사 표본'} ${missionResult?.reward?.amount || 1}개를 회수했습니다.`)
    if (!result) return
    const completedAtMs = Number(result.nextMissionAtMs || Date.now()) - (2 * 60 * 60 * 1000)
    setHome((current) => current ? { ...current, ownPlanet: { ...current.ownPlanet, lastMissionAtMs: completedAtMs } } : current)
    setNowMs(Date.now())
  }

  const savePassport = (form) => runAction('passport', () => callGalaxy('saveGalaxyPassport', form), '탐험가 패스포트가 갱신되었습니다.')

  const openLogs = async () => {
    setTab('logs')
    const unreadIds = events.filter((event) => !event.seen).map((event) => event.id)
    if (unreadIds.length) await runAction('logs', () => callGalaxy('markGalaxyEventsSeen', { eventIds: unreadIds }))
  }

  const statCards = useMemo(() => [
    { label: '정원 생명력', value: Number(planet.stats?.gardenVitality || 0), icon: '🌿' },
    { label: '시설 안정도', value: Number(planet.stats?.facilityHealth || 0), icon: '🛠️' },
    { label: '생명체 행복', value: Number(planet.stats?.creatureHappiness || 0), icon: '🌱' },
  ], [planet.stats])

  if (loading) return <GalaxyLoading />

  return (
    <div className="meta-galaxy">
      <div className="galaxy-deep-space" aria-hidden="true"><i /><i /><i /><i /></div>
      <header className="galaxy-command-header">
        <div>
          <button type="button" className="galaxy-back-btn" onClick={onBack}>← 학습 우주로</button>
          <span className="galaxy-kicker">METASENSE GALAXY · SOCIAL WORLD</span>
          <h1>{isOwner ? '나의 행성' : `${planet.ownerName || '친구'}의 행성`}</h1>
          <p>학습은 가능성을 공급하고, 친구는 이 세계에 기억을 남깁니다.</p>
        </div>
        <div className="galaxy-supply-capsule">
          <span>학습 보급 캡슐</span>
          <strong><i className="ore-gem" /> {wallet.toLocaleString()} 광석</strong>
          <small>누적 학습 {Number(home?.learningState?.lifetimeLearningOre || ownPlanet.lifetimeLearningOre || 0).toLocaleString()} · 탐사선 T{home?.learningState?.shipHullTier || ownPlanet.shipHullTier || 1}</small>
        </div>
      </header>

      <nav className="galaxy-tabs" aria-label="은하 게임 메뉴">
        <button type="button" className={tab === 'planet' ? 'active' : ''} onClick={() => setTab('planet')}>🪐 행성</button>
        <button type="button" className={tab === 'neighbors' ? 'active' : ''} onClick={() => setTab('neighbors')}>🛸 이웃 행성 <span>{home?.neighbors?.length || 0}</span></button>
        <button type="button" className={tab === 'mission' ? 'active' : ''} onClick={() => setTab('mission')}>🚀 은하 의뢰</button>
        <button type="button" className={tab === 'logs' ? 'active' : ''} onClick={openLogs}>📡 귀환 로그 {unreadCount > 0 && <b>{unreadCount}</b>}</button>
        <button type="button" className={tab === 'passport' ? 'active' : ''} onClick={() => setTab('passport')}>🪪 패스포트</button>
      </nav>

      <AnimatePresence>
        {(error || notice) && (
          <Motion.div className={`galaxy-toast ${error ? 'error' : 'success'}`} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {error || notice}<button type="button" onClick={() => { setError(''); setNotice('') }}>×</button>
          </Motion.div>
        )}
      </AnimatePresence>

      {tab === 'planet' && (
        <main className="galaxy-planet-layout">
          <section className="galaxy-world-panel">
            <div className="galaxy-world-title">
              <div><span style={{ color: theme.accent }}>{theme.icon} {theme.label}</span><h2>{planet.planetName}</h2><p>{planet.tagline}</p></div>
              {!isOwner && <button type="button" className="galaxy-secondary-btn" onClick={() => visitNeighbor(user.uid)}>내 행성으로 귀환</button>}
            </div>
            <PlanetCanvas planet={planet} isOwner={isOwner} selectedId={selectedId} onSelect={setSelectedId} onMove={moveItem} />
            <MaterialStrip materials={(isOwner ? planet : ownPlanet).materials} />
          </section>

          <aside className="galaxy-side-panel">
            {isOwner ? (
              <>
                <section className="galaxy-panel-card">
                  <span className="panel-eyebrow">PLANET STATUS</span>
                  <h3>오늘의 행성 상태</h3>
                  <div className="planet-stat-list">
                    {statCards.map((stat) => <div key={stat.label}><span>{stat.icon}</span><p>{stat.label}<i><b style={{ width: `${Math.min(100, stat.value)}%` }} /></i></p><strong>{stat.value}</strong></div>)}
                  </div>
                  <small className="planet-visit-count">누적 방문 {Number(planet.stats?.visits || 0)}회 · 감탄 신호 {Number(planet.stats?.admirationCount || 0)}개</small>
                </section>
                <section className="galaxy-panel-card build-card">
                  <span className="panel-eyebrow">ORBITAL WORKSHOP</span>
                  <h3>광석으로 세계 확장</h3>
                  <p>게임에서 찾은 재료와 학습 광석을 함께 사용합니다.</p>
                  <div className="galaxy-build-list">
                    {Object.entries(home?.catalog || {}).map(([itemId, item]) => {
                      const hasMaterial = Number(planet.materials?.[item.material] || 0) >= Number(item.materialCost || 0)
                      const canAfford = wallet >= Number(item.cost || 0)
                      return (
                        <button type="button" key={itemId} onClick={() => buildItem(itemId)} disabled={busy || !hasMaterial || !canAfford}>
                          <span>{item.icon}</span><p><strong>{item.name}</strong><small>{MATERIAL_LABELS[item.material]} {item.materialCost} · 광석 {item.cost}</small></p><b>{busy === `build:${itemId}` ? '건설 중' : '건설'}</b>
                        </button>
                      )
                    })}
                  </div>
                </section>
              </>
            ) : (
              <section className="galaxy-panel-card visit-actions-card">
                <span className="panel-eyebrow">VISITOR ACTION</span>
                <h3>{planet.ownerName}의 행성을 도와주세요</h3>
                <p>당신의 행동은 친구가 돌아왔을 때 귀환 로그와 행성 변화로 남습니다.</p>
                <div className="galaxy-visit-actions">
                  {Object.entries(GALAXY_VISIT_ACTIONS).map(([actionId, action]) => (
                    <button type="button" key={actionId} disabled={busy || planet.visitMode === 'private'} onClick={() => performVisitAction(actionId)}>
                      <span>{action.icon}</span><p><strong>{action.label}</strong><small>{action.description}</small></p>
                    </button>
                  ))}
                </div>
                <label className="galaxy-preset-message">
                  <span>함께 남길 안전 메시지</span>
                  <select value={visitMessage} onChange={(event) => setVisitMessage(event.target.value)}>
                    {VISIT_MESSAGES.map((message) => <option key={message} value={message}>{message}</option>)}
                  </select>
                </label>
                {planet.visitMode === 'private' && <div className="galaxy-private-note">이 행성은 지금 조용한 휴식 모드입니다.</div>}
              </section>
            )}
          </aside>
        </main>
      )}

      {tab === 'neighbors' && (
        <main className="galaxy-section-shell">
          <div className="galaxy-section-heading"><span>NEIGHBOR SIGNALS</span><h2>같은 크루의 이웃 행성</h2><p>친구를 공개 순위가 아니라 취향과 세계로 알아가세요.</p></div>
          {(home?.neighbors || []).length ? (
            <div className="galaxy-neighbor-grid">
              {home.neighbors.map((neighbor) => {
                const neighborTheme = GALAXY_THEMES[neighbor.theme] || GALAXY_THEMES.forest
                return (
                  <button type="button" key={neighbor.uid} onClick={() => visitNeighbor(neighbor.uid)}>
                    <span className={`neighbor-planet theme-${neighbor.theme}`}>{neighborTheme.icon}<i /></span>
                    <small>{neighbor.displayName} · 탐사선 T{neighbor.shipHullTier}</small>
                    <strong>{neighbor.planetName}</strong>
                    <p>{neighbor.tagline}</p>
                    <b>워프 방문 →</b>
                  </button>
                )
              })}
            </div>
          ) : <div className="galaxy-empty-state"><span>🛰️</span><h3>아직 연결된 이웃 행성이 없어요</h3><p>스터디 크루에 참여하면 크루원의 행성을 안전하게 오갈 수 있습니다.</p></div>}
        </main>
      )}

      {tab === 'mission' && (
        <main className="galaxy-section-shell">
          <div className="galaxy-section-heading"><span>GALACTIC CONTRACTS</span><h2>학습 문제가 없는 순수 게임 의뢰</h2><p>항로를 선택해 게임 재료를 회수하세요. 학습 공명은 더 좋은 선택지만 열어줍니다.</p></div>
          <div className="galaxy-mission-status">
            <span className={missionCooldown.ready ? 'ready' : ''}>{missionCooldown.ready ? '● 탐사선 출항 준비 완료' : `● 탐사선 정비 중 · ${missionCooldown.label}`}</span>
            <label>비동기 릴레이 파트너
              <select value={missionPartnerUid} onChange={(event) => setMissionPartnerUid(event.target.value)}>
                <option value="">혼자 출항</option>
                {(home?.neighbors || []).map((neighbor) => <option key={neighbor.uid} value={neighbor.uid}>{neighbor.displayName}</option>)}
              </select>
            </label>
            <small>의뢰 보상에는 학습 광석이 포함되지 않습니다.</small>
          </div>
          <div className="galaxy-mission-grid">
            {Object.entries(GALAXY_MISSION_ROUTES).map(([routeId, route]) => {
              const ability = GALAXY_ABILITIES[route.ability]
              const level = Number(ownPlanet.abilitySnapshot?.values?.[route.ability] || 1)
              return (
                <article key={routeId}>
                  <div className="mission-art"><span>{route.icon}</span><i /></div>
                  <span className="mission-ability">{ability.icon} {ability.label} Lv.{level}</span>
                  <h3>{route.label}</h3><p>{route.copy}</p>
                  <small>예상 회수 · {route.reward}{level >= 4 ? ' + 공명 보너스' : ''}</small>
                  <button type="button" disabled={busy || !missionCooldown.ready} onClick={() => runMission(routeId)}>{busy === `mission:${routeId}` ? '항해 중…' : missionCooldown.ready ? '이 항로로 출항' : missionCooldown.label}</button>
                </article>
              )
            })}
          </div>
        </main>
      )}

      {tab === 'logs' && (
        <main className="galaxy-section-shell logs-shell">
          <div className="galaxy-section-heading"><span>RETURN LOG</span><h2>내가 없을 때도 살아 있던 행성</h2><p>친구가 남긴 도움과 탐사 릴레이가 시간 순서로 기록됩니다.</p></div>
          {events.length ? <div className="galaxy-log-list">{events.map((event) => (
            <article key={event.id} className={!event.seen ? 'unread' : ''}><span>{event.actionIcon || '✦'}</span><div><strong>{event.actorName} · {event.actionLabel}</strong>{event.message && <p>{event.message}</p>}<small>{formatGalaxyTime(event.createdAt)}</small></div>{!event.seen && <i>NEW</i>}</article>
          ))}</div> : <div className="galaxy-empty-state"><span>📡</span><h3>아직 수신된 방문 신호가 없어요</h3><p>이웃이 다녀가면 행동과 메시지가 이곳에 남습니다.</p></div>}
        </main>
      )}

      {tab === 'passport' && (
        <main className="galaxy-passport-layout galaxy-section-shell">
          <section className={`galaxy-passport-preview theme-${ownPlanet.theme || 'forest'}`}>
            <span className="passport-overline">EXPLORER PASSPORT</span><div className="passport-avatar">🚀<i>T{home?.learningState?.shipHullTier || ownPlanet.shipHullTier || 1}</i></div>
            <small>{ownPlanet.ownerName || userData?.publicDisplayName || '탐사원'}</small><h2>{ownPlanet.planetName}</h2><p>{ownPlanet.tagline}</p>
            <div className="passport-tags">{(ownPlanet.playStyles || []).map((styleId) => <span key={styleId}>{GALAXY_PLAY_STYLES[styleId]?.icon} {GALAXY_PLAY_STYLES[styleId]?.label}</span>)}</div>
            <div className="passport-abilities">{Object.entries(GALAXY_ABILITIES).slice(0, 4).map(([id, ability]) => <span key={id}><i>{ability.icon}</i><small>{ability.label}</small><strong>Lv.{ownPlanet.abilitySnapshot?.values?.[id] || 1}</strong></span>)}</div>
          </section>
          <section className="galaxy-panel-card passport-form-card"><span className="panel-eyebrow">IDENTITY CONTROL</span><h3>나를 세계로 표현하기</h3><PassportEditor key={`${ownPlanet.id || user?.uid}:${ownPlanet.createdAt || ''}`} planet={ownPlanet} onSave={savePassport} busy={busy} /></section>
        </main>
      )}
    </div>
  )
}
