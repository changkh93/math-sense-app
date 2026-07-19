import { useCallback, useEffect, useState } from 'react'
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { db, functions } from '../../firebase'
import {
  GALAXY_ABILITIES,
  GALAXY_PLAY_STYLES,
  GALAXY_THEMES,
  MATERIAL_LABELS,
  formatGalaxyTime,
  getMissionCooldown,
} from '../../utils/galaxyGame'
import GalaxyWorld3D from './GalaxyWorld3D'
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
      <strong>아스트라 프론티어로 워프 중</strong>
      <small>학습 보급과 행성 지형을 동기화하고 있습니다.</small>
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
      <label><span>행성 이름</span><input value={form.planetName} maxLength={30} onChange={(event) => setForm({ ...form, planetName: event.target.value })} /></label>
      <label><span>방문자에게 보여줄 한마디</span><input value={form.tagline} maxLength={80} onChange={(event) => setForm({ ...form, tagline: event.target.value })} /></label>
      <fieldset>
        <legend>행성 기후</legend>
        <div className="passport-choice-grid themes">
          {Object.entries(GALAXY_THEMES).map(([id, theme]) => <button type="button" key={id} className={form.theme === id ? 'active' : ''} onClick={() => setForm({ ...form, theme: id })}><span>{theme.icon}</span>{theme.label}</button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>나의 게임 취향 · 최대 3개</legend>
        <div className="passport-choice-grid">
          {Object.entries(GALAXY_PLAY_STYLES).map(([id, style]) => <button type="button" key={id} className={form.playStyles.includes(id) ? 'active' : ''} onClick={() => toggleStyle(id)}><span>{style.icon}</span>{style.label}</button>)}
        </div>
      </fieldset>
      <label className="passport-visit-toggle">
        <span><strong>크루 방문 허용</strong><small>같은 크루 친구가 월드를 걷고 도움을 남길 수 있어요.</small></span>
        <input type="checkbox" checked={form.visitMode === 'crew'} onChange={(event) => setForm({ ...form, visitMode: event.target.checked ? 'crew' : 'private' })} />
      </label>
      <button className="galaxy-primary-btn" type="submit" disabled={busy === 'passport'}>{busy === 'passport' ? '기록 중…' : '패스포트 저장'}</button>
    </form>
  )
}

export default function MetaGalaxy({ user, userData, onBack }) {
  const [home, setHome] = useState(null)
  const [targetUid, setTargetUid] = useState(user?.uid || '')
  const [menu, setMenu] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedStructureId, setSelectedStructureId] = useState('')
  const [selectedBuildItem, setSelectedBuildItem] = useState('')
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
      const nextPlanet = { id: snapshot.id, ...snapshot.data() }
      setHome((current) => current ? { ...current, planet: nextPlanet, ...(targetUid === user?.uid ? { ownPlanet: nextPlanet } : {}) } : current)
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
  const missionCooldown = getMissionCooldown(ownPlanet.lastMissionAtMs, nowMs)

  const flash = useCallback((message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3600)
  }, [])

  const runAction = useCallback(async (key, fn, successMessage) => {
    setBusy(key)
    setError('')
    try {
      const result = await fn()
      if (successMessage) flash(typeof successMessage === 'function' ? successMessage(result) : successMessage)
      return result
    } catch (err) {
      setError(err?.message || '프론티어 통신 중 문제가 발생했습니다.')
      return null
    } finally {
      setBusy('')
    }
  }, [flash])

  const visitNeighbor = async (neighborUid) => {
    setSelectedStructureId('')
    setSelectedBuildItem('')
    setMenu('')
    await loadHome(neighborUid)
  }

  const buildItemAt = async (worldX, worldZ) => {
    if (!selectedBuildItem || !isOwner) return
    const itemId = selectedBuildItem
    const result = await runAction(`build:${itemId}`, () => callGalaxy('buildGalaxyItem', {
      itemId,
      x: 50 + Number(worldX || 0) * 3,
      y: 50 + Number(worldZ || 0) * 3,
    }), (buildResult) => `${buildResult?.placed?.name || '새 시설'}을 이곳에 건설했습니다.`)
    if (result) setSelectedBuildItem('')
  }

  const performVisitAction = (actionId) => runAction(`visit:${actionId}`, () => callGalaxy('performGalaxyVisitAction', { targetUid, actionId, message: visitMessage }), (result) => result?.rewarded ? '도움이 기록되고 별가루 1개를 발견했습니다.' : '친구의 귀환 로그에 행동을 남겼습니다.')

  const performWorldAction = async (node) => {
    if (!node) return
    if (!isOwner) {
      if (planet.visitMode === 'private') { flash('이 행성은 지금 조용한 휴식 모드입니다.'); return }
      const visitActionMap = { crystal: 'admire', fiber: 'water', salvage: 'repair', beacon: 'repair', plant: 'feed' }
      return performVisitAction(visitActionMap[node.actionId] || 'admire')
    }
    return runAction(`world:${node.id}`, () => callGalaxy('performGalaxyWorldAction', {
      actionId: node.actionId,
      nodeId: node.id,
      x: node.position?.[0] || 0,
      z: node.position?.[2] || 0,
    }), (result) => result?.label || '월드 활동을 완료했습니다.')
  }

  const runMission = useCallback(async (route) => {
    const result = await runAction(`mission:${route}`, () => callGalaxy('runGalaxyMission', { route, partnerUid: missionPartnerUid }), (missionResult) => `${missionResult?.reward?.title || '탐사 표본'} ${missionResult?.reward?.amount || 1}개를 회수했습니다.`)
    if (!result) return null
    const completedAtMs = Number(result.nextMissionAtMs || Date.now()) - (2 * 60 * 60 * 1000)
    setHome((current) => current ? { ...current, ownPlanet: { ...current.ownPlanet, lastMissionAtMs: completedAtMs } } : current)
    setNowMs(Date.now())
    return result
  }, [missionPartnerUid, runAction])

  const savePassport = (form) => runAction('passport', () => callGalaxy('saveGalaxyPassport', form), '탐험가 패스포트가 갱신되었습니다.')

  const openLogs = async () => {
    setMenu('logs')
    const unreadIds = events.filter((event) => !event.seen).map((event) => event.id)
    if (unreadIds.length) await runAction('logs', () => callGalaxy('markGalaxyEventsSeen', { eventIds: unreadIds }))
  }

  const openGameMenu = (nextMenu) => {
    if (nextMenu === 'logs') { openLogs(); return }
    setMenu(nextMenu)
  }

  if (loading) return <GalaxyLoading />

  return (
    <div className="meta-galaxy frontier-immersive">
      <GalaxyWorld3D
        planet={planet}
        materials={(isOwner ? planet : ownPlanet).materials || {}}
        missionReady={isOwner && missionCooldown.ready}
        missionCooldownLabel={isOwner ? missionCooldown.label : '탐사 의뢰는 내 행성에서 출항할 수 있어요'}
        selectedBuildItem={selectedBuildItem}
        onCancelBuild={() => setSelectedBuildItem('')}
        onBuildAt={buildItemAt}
        onWorldAction={performWorldAction}
        onMissionComplete={runMission}
        selectedStructureId={selectedStructureId}
        onSelectStructure={(item) => { setSelectedStructureId(item.instanceId); flash(`${item.name} 시설을 확인했습니다.`) }}
        onOpenMenu={openGameMenu}
        onMessage={flash}
      />

      <button type="button" className="frontier-learning-route" onClick={onBack}>
        <span>↖</span><div><small>EXIT ROUTE</small><strong>메타센스 학습으로 귀환</strong></div>
      </button>

      <div className="frontier-ore-capsule" title="학습을 통해서만 얻는 메타 광석">
        <i className="ore-gem" /><div><small>LEARNING ORE</small><strong>{wallet.toLocaleString()}</strong></div>
      </div>

      <div className="frontier-utility-dock">
        {!isOwner && <button type="button" onClick={() => visitNeighbor(user.uid)}><span>🏠</span><small>내 행성</small></button>}
        <button type="button" onClick={openLogs}><span>📡</span><small>로그</small>{unreadCount > 0 && <b>{unreadCount}</b>}</button>
        <button type="button" onClick={() => setMenu('passport')}><span>🪪</span><small>패스포트</small></button>
      </div>

      {busy && <div className="frontier-network-busy"><i /> 은하 네트워크 동기화</div>}

      <AnimatePresence>
        {(error || notice) && (
          <Motion.div className={`frontier-game-toast ${error ? 'error' : 'success'}`} initial={{ opacity: 0, y: -14, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
            {error || notice}<button type="button" onClick={() => { setError(''); setNotice('') }}>×</button>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && (
          <Motion.div className="frontier-menu-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu('')}>
            <Motion.section className={`frontier-menu-panel menu-${menu}`} initial={{ opacity: 0, x: 30, scale: .97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 25 }} onClick={(event) => event.stopPropagation()}>
              <header><div><span>ASTRA FRONTIER</span><h2>{menu === 'build' ? '개척자 건설 가방' : menu === 'neighbors' ? '이웃 항로' : menu === 'logs' ? '귀환 신호 기록' : '탐험가 패스포트'}</h2></div><button type="button" onClick={() => setMenu('')} aria-label="메뉴 닫기">×</button></header>

              {menu === 'build' && (
                <div className="frontier-build-menu">
                  {!isOwner ? (
                    <div className="galaxy-empty-state"><span>🏠</span><h3>건설 가방은 내 행성에서 열 수 있어요</h3><button type="button" className="galaxy-primary-btn" onClick={() => visitNeighbor(user.uid)}>내 행성으로 귀환</button></div>
                  ) : (
                    <>
                      <p>시설을 선택하면 월드로 돌아갑니다. 직접 걸어가 원하는 지면을 눌러 건설하세요.</p>
                      <MaterialStrip materials={planet.materials} />
                      <div className="frontier-build-catalog">
                        {Object.entries(home?.catalog || {}).map(([itemId, item]) => {
                          const hasMaterial = Number(planet.materials?.[item.material] || 0) >= Number(item.materialCost || 0)
                          const canAfford = wallet >= Number(item.cost || 0)
                          return (
                            <button type="button" key={itemId} disabled={busy || !hasMaterial || !canAfford} onClick={() => { setSelectedBuildItem(itemId); setMenu('') }}>
                              <span>{item.icon}</span><div><strong>{item.name}</strong><small>{MATERIAL_LABELS[item.material]} {item.materialCost} · 학습 광석 {item.cost}</small></div><b>{hasMaterial && canAfford ? '월드에 배치 →' : '재료 부족'}</b>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {menu === 'neighbors' && (
                <div className="frontier-social-menu">
                  <div className="frontier-relay-setting"><label>비동기 탐사 릴레이 파트너<select value={missionPartnerUid} onChange={(event) => setMissionPartnerUid(event.target.value)}><option value="">혼자 출항</option>{(home?.neighbors || []).map((neighbor) => <option key={neighbor.uid} value={neighbor.uid}>{neighbor.displayName}</option>)}</select></label><small>월드의 탐사 관문을 완료하면 선택한 친구에게 공동 기록이 남습니다.</small></div>
                  {!isOwner && <label className="galaxy-preset-message"><span>친구 월드에 남길 안전 메시지</span><select value={visitMessage} onChange={(event) => setVisitMessage(event.target.value)}>{VISIT_MESSAGES.map((message) => <option key={message} value={message}>{message}</option>)}</select></label>}
                  {(home?.neighbors || []).length ? <div className="frontier-neighbor-list">{home.neighbors.map((neighbor) => { const theme = GALAXY_THEMES[neighbor.theme] || GALAXY_THEMES.forest; return <button type="button" key={neighbor.uid} onClick={() => visitNeighbor(neighbor.uid)}><span className={`neighbor-planet theme-${neighbor.theme}`}>{theme.icon}<i /></span><div><small>{neighbor.displayName} · SHIP T{neighbor.shipHullTier}</small><strong>{neighbor.planetName}</strong><p>{neighbor.tagline}</p></div><b>WARP</b></button> })}</div> : <div className="galaxy-empty-state"><span>🛰️</span><h3>아직 연결된 이웃 행성이 없어요</h3><p>스터디 크루에 참여하면 크루원의 월드를 오갈 수 있습니다.</p></div>}
                </div>
              )}

              {menu === 'logs' && (events.length ? <div className="galaxy-log-list">{events.map((event) => <article key={event.id} className={!event.seen ? 'unread' : ''}><span>{event.actionIcon || '✦'}</span><div><strong>{event.actorName} · {event.actionLabel}</strong>{event.message && <p>{event.message}</p>}<small>{formatGalaxyTime(event.createdAt)}</small></div>{!event.seen && <i>NEW</i>}</article>)}</div> : <div className="galaxy-empty-state"><span>📡</span><h3>수신된 방문 신호가 없어요</h3><p>친구가 월드에서 행동하면 여기에 흔적이 남습니다.</p></div>)}

              {menu === 'passport' && (
                <div className="frontier-passport-menu">
                  <section className={`galaxy-passport-preview theme-${ownPlanet.theme || 'forest'}`}><span className="passport-overline">EXPLORER PASSPORT</span><div className="passport-avatar">🚀<i>T{home?.learningState?.shipHullTier || ownPlanet.shipHullTier || 1}</i></div><small>{ownPlanet.ownerName || userData?.publicDisplayName || '탐사원'}</small><h2>{ownPlanet.planetName}</h2><p>{ownPlanet.tagline}</p><div className="passport-tags">{(ownPlanet.playStyles || []).map((styleId) => <span key={styleId}>{GALAXY_PLAY_STYLES[styleId]?.icon} {GALAXY_PLAY_STYLES[styleId]?.label}</span>)}</div><div className="passport-abilities">{Object.entries(GALAXY_ABILITIES).slice(0, 4).map(([id, ability]) => <span key={id}><i>{ability.icon}</i><small>{ability.label}</small><strong>Lv.{ownPlanet.abilitySnapshot?.values?.[id] || 1}</strong></span>)}</div></section>
                  <section className="passport-editor-shell"><PassportEditor key={`${ownPlanet.id || user?.uid}:${String(ownPlanet.createdAt || '')}`} planet={ownPlanet} onSave={savePassport} busy={busy} /></section>
                </div>
              )}
            </Motion.section>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
