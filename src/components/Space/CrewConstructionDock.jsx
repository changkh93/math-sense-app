import React from 'react'
import { motion as Motion } from 'framer-motion'
import { Check, ChevronRight, CircleDollarSign, Gem, Hammer, LockKeyhole, RadioTower, Sparkles, Trophy, UsersRound } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import soundManager from '../../utils/SoundManager'
import {
  CREW_CONTRIBUTION_AMOUNTS,
  CREW_DAILY_CONTRIBUTION_LIMIT,
  CREW_MOTHERSHIP_MODULES,
  getCrewModuleUnlock,
  getCrewMothershipStats,
  getOwnedCrewModules,
} from '../../utils/crewMothershipCatalog'
import './CrewConstructionDock.css'

const TIER_LABELS = { COMMON: '일반', UNCOMMON: '고급', RARE: '희귀', EPIC: '영웅', LEGEND: '전설' }

const getItemContributors = (itemId, crew) => {
  const history = crew?.completedMothershipProjectsHistory?.[itemId]
  const current = crew?.currentMothershipProject?.itemId === itemId ? crew.currentMothershipProject : null
  const source = history || current
  if (!source) return []
  const amounts = source.contributionsByUser && typeof source.contributionsByUser === 'object' ? source.contributionsByUser : {}
  const names = source.contributorNamesById && typeof source.contributorNamesById === 'object' ? source.contributorNamesById : {}
  return Object.entries(amounts)
    .map(([uid, amount]) => ({
      uid,
      name: names[uid] || '크루원',
      amount: Number(amount || 0),
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

export default function CrewConstructionDock({ crew, crewId, userData, isLeader, isGuest }) {
  const [selectedItemId, setSelectedItemId] = React.useState('')
  const [selectedAmount, setSelectedAmount] = React.useState(10)
  const [action, setAction] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [contributionSummary, setContributionSummary] = React.useState({ projectId: '', contributors: [] })
  const [contributionSummaryLoading, setContributionSummaryLoading] = React.useState(false)
  const owned = React.useMemo(() => new Set(getOwnedCrewModules(crew)), [crew])
  const stats = React.useMemo(() => getCrewMothershipStats(crew), [crew])
  const project = crew?.currentMothershipProject?.status === 'funding' ? crew.currentMothershipProject : null
  const projectItem = project ? CREW_MOTHERSHIP_MODULES.find((item) => item.id === project.itemId) : null
  const progress = project ? Math.min(1, Number(project.contributedOre || 0) / Math.max(1, Number(project.requiredOre || 1))) : 0
  const remaining = project ? Math.max(0, Number(project.requiredOre || 0) - Number(project.contributedOre || 0)) : 0
  const todayKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())
  const todayContributed = userData?.crewMothershipContributionDate === todayKey
    ? Number(userData?.crewMothershipContributionAmount || 0)
    : 0
  const acceptedPreview = Math.min(selectedAmount, remaining)
  const visibleContributors = contributionSummary.projectId === project?.projectId
    ? contributionSummary.contributors
    : []

  React.useEffect(() => {
    if (!crewId || !project?.projectId || isGuest) return undefined
    let cancelled = false
    const loadContributionSummary = async () => {
      await Promise.resolve()
      if (cancelled) return
      setContributionSummaryLoading(true)
      try {
        const fn = httpsCallable(functions, 'getCrewMothershipContributionSummary')
        const result = await fn({ crewId })
        if (cancelled || result.data?.projectId !== project.projectId) return
        setContributionSummary({
          projectId: result.data.projectId,
          contributors: Array.isArray(result.data?.contributors) ? result.data.contributors : [],
        })
      } catch {
        if (cancelled) return
        const amounts = project.contributionsByUser && typeof project.contributionsByUser === 'object'
          ? project.contributionsByUser
          : {}
        const names = project.contributorNamesById && typeof project.contributorNamesById === 'object'
          ? project.contributorNamesById
          : {}
        setContributionSummary({
          projectId: project.projectId,
          contributors: Object.entries(amounts).map(([uid, amount]) => ({
            uid,
            name: names[uid] || '크루원',
            amount: Number(amount || 0),
            lastSupportedAtMs: 0,
          })),
        })
      } finally {
        if (!cancelled) setContributionSummaryLoading(false)
      }
    }
    loadContributionSummary()
    return () => { cancelled = true }
  }, [crewId, isGuest, project?.contributedOre, project?.contributionsByUser, project?.contributorNamesById, project?.projectId])

  const startProject = async (item) => {
    if (!crewId || !isLeader || action || project) return
    const unlock = getCrewModuleUnlock(item, crew)
    if (!unlock.unlocked || owned.has(item.id)) return
    setAction(`start:${item.id}`)
    setMessage('')
    try {
      const fn = httpsCallable(functions, 'startCrewMothershipProject')
      await fn({ crewId, itemId: item.id })
      soundManager.playClick()
      setSelectedItemId('')
      setMessage(`${item.name} 공동 건설을 시작했습니다.`)
    } catch (error) {
      setMessage(error?.message || '건설 프로젝트를 시작하지 못했습니다.')
    } finally {
      setAction('')
    }
  }

  const contribute = async () => {
    if (!crewId || !project || action || isGuest || acceptedPreview <= 0) return
    if (!window.confirm(`${projectItem?.name || '현재 시설'} 건설에 내 광석 ${acceptedPreview}개를 지원할까요?\n지원 후에는 취소할 수 없습니다.`)) return
    setAction('contribute')
    setMessage('')
    try {
      const operationId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      const fn = httpsCallable(functions, 'contributeCrewMothershipOre')
      const result = await fn({ crewId, amount: selectedAmount, operationId })
      soundManager.playCrystal()
      setMessage(result.data?.completed
        ? `${projectItem?.name || '시설'} 건설 완료! 모함에 즉시 장착되었습니다.`
        : `${Number(result.data?.acceptedAmount || acceptedPreview)}광석을 건설 프로젝트에 지원했습니다.`)
    } catch (error) {
      setMessage(error?.message || '광석 지원에 실패했습니다.')
    } finally {
      setAction('')
    }
  }

  return (
    <section className="crew-construction-dock">
      <div className="crew-construction-dock__head">
        <div>
          <span className="font-tech"><Hammer size={15} /> MOTHERSHIP CONSTRUCTION DOCK</span>
          <h2 className="font-title">공동 건설소</h2>
          <p>리더가 시설을 선택하면 모든 멤버가 원하는 만큼 광석을 지원합니다.</p>
        </div>
        <div className="crew-construction-dock__stats font-tech">
          <div><span>MISSION XP</span><strong>{stats.xp.toLocaleString()}</strong></div>
          <div><span>BUILT</span><strong>{stats.completedProjects}</strong></div>
          <div><span>SUPPORTED</span><strong>{stats.totalContributedOre.toLocaleString()}</strong></div>
        </div>
      </div>

      {project && projectItem ? (
        <div className="crew-current-project">
          <div className="crew-current-project__visual">
            <div className="crew-current-project__core"><Hammer size={28} /><i /></div>
            <span className="font-tech">NOW BUILDING</span>
          </div>
          <div className="crew-current-project__main">
            <div className="crew-current-project__title">
              <div><span>{TIER_LABELS[projectItem.tier]} · {projectItem.slot.toUpperCase()}</span><h3>{projectItem.name}</h3></div>
              <strong><Gem size={15} /> {Number(project.contributedOre || 0).toLocaleString()} / {Number(project.requiredOre || 0).toLocaleString()}</strong>
            </div>
            <p>{projectItem.description}</p>
            <div className="crew-current-project__track"><Motion.i initial={false} animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} /></div>
            <div className="crew-current-project__meta font-tech"><span>{Math.round(progress * 100)}% 조립 완료</span><strong>앞으로 {remaining.toLocaleString()}광석</strong></div>
            {!isGuest && <div className="crew-support-ledger">
              <div className="crew-support-ledger__head">
                <span><UsersRound size={14} /> 지원 승무원</span>
                <small className="font-tech">{visibleContributors.length || Number(project.contributorCount || 0)}명 참여 · 최근 지원순</small>
              </div>
              {contributionSummaryLoading && visibleContributors.length === 0 ? (
                <div className="crew-support-ledger__empty">지원 내역을 불러오는 중…</div>
              ) : visibleContributors.length > 0 ? (
                <div className="crew-support-ledger__list">
                  {visibleContributors.map((contributor) => (
                    <div className="crew-support-ledger__person" key={contributor.uid}>
                      <i aria-hidden="true">{Array.from(contributor.name || '크루원')[0]}</i>
                      <span>{contributor.name || '크루원'}</span>
                      <strong><Gem size={12} /> {Number(contributor.amount || 0).toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="crew-support-ledger__empty">첫 광석을 지원하면 이곳에 승무원 이름과 지원량이 기록됩니다.</div>
              )}
            </div>}
            {!isGuest && <div className="crew-contribution-panel">
              <div className="crew-contribution-panel__amounts">
                {CREW_CONTRIBUTION_AMOUNTS.map((amount) => (
                  <button key={amount} type="button" className={selectedAmount === amount ? 'is-selected' : ''} disabled={remaining <= 0 || todayContributed + Math.min(amount, remaining) > CREW_DAILY_CONTRIBUTION_LIMIT} onClick={() => setSelectedAmount(amount)}>{amount}</button>
                ))}
              </div>
              <button type="button" className="crew-contribution-panel__submit" disabled={!!action || acceptedPreview <= 0 || Number(userData?.crystals || 0) < acceptedPreview || todayContributed + acceptedPreview > CREW_DAILY_CONTRIBUTION_LIMIT} onClick={contribute}>
                <CircleDollarSign size={17} /> {action === 'contribute' ? '전송 중…' : `${acceptedPreview}광석 지원`}
              </button>
              <small className="font-tech">내 광석 {Number(userData?.crystals || 0).toLocaleString()} · 하루 최대 {CREW_DAILY_CONTRIBUTION_LIMIT}광석 · 지원 후 취소 불가</small>
            </div>}
          </div>
        </div>
      ) : (
        <div className="crew-no-project font-tech"><RadioTower size={19} /><span>{isLeader ? '아래 시설 중 다음 공동 건설 목표를 선택하세요.' : '리더가 다음 공동 건설 목표를 준비하고 있습니다.'}</span></div>
      )}

      <div className="crew-facility-grid">
        {CREW_MOTHERSHIP_MODULES.map((item) => {
          const unlock = getCrewModuleUnlock(item, crew)
          const isOwned = owned.has(item.id)
          const isCurrent = project?.itemId === item.id
          const selected = selectedItemId === item.id
          const itemContributors = isOwned ? getItemContributors(item.id, crew) : []
          return (
            <article key={item.id} className={`crew-facility-card crew-facility-card--${item.tier.toLowerCase()} ${selected ? 'is-selected' : ''} ${isOwned ? 'is-owned' : ''}`}>
              <button type="button" className="crew-facility-card__select" onClick={() => setSelectedItemId(selected ? '' : item.id)}>
                <div className="crew-facility-card__icon">{isOwned ? <Check size={18} /> : unlock.unlocked ? <Sparkles size={18} /> : <LockKeyhole size={17} />}</div>
                <div><span>{TIER_LABELS[item.tier]} · LV.{item.minLevel}</span><strong>{item.name}</strong><small>{isOwned ? '건설 완료 · 모함에 장착됨' : isCurrent ? '현재 공동 건설 중' : unlock.reason}</small></div>
                <ChevronRight size={17} />
              </button>
              {selected && <Motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="crew-facility-card__detail">
                <p>{item.description}</p>
                {isOwned ? (
                  <div className="crew-facility-honor font-tech" style={{ marginTop: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: 10, background: 'rgba(255, 214, 108, 0.08)', border: '1px solid rgba(255, 214, 108, 0.25)', display: 'block' }}>
                    <div style={{ color: '#ffd66a', fontWeight: 900, fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                      <Trophy size={14} style={{ color: '#ffd66a' }} /> 건설 명예 기부 승무원 명단
                    </div>
                    {itemContributors.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', fontSize: '0.72rem' }}>
                        {itemContributors.map((c) => (
                          <span key={c.uid || c.name} style={{ padding: '0.2rem 0.5rem', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <strong style={{ color: '#ffffff' }}>{c.name}</strong>
                            <span style={{ color: '#ffe193', fontWeight: 800 }}><Gem size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />{c.amount.toLocaleString()}광석</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.65)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Gem size={12} style={{ color: '#ffd66a' }} /> 건설비 {item.cost.toLocaleString()}광석 · 크루원 공동 기부 완성
                      </div>
                    )}
                  </div>
                ) : (
                  <div><span><Gem size={13} /> 건설비 {item.cost.toLocaleString()}</span>{item.achievement && <span>{item.achievement.label} · {Math.min(unlock.achievementCurrent, item.achievement.value)}/{item.achievement.value}</span>}</div>
                )}
                {isLeader && !project && !isOwned && <button type="button" disabled={!unlock.unlocked || !!action} onClick={() => startProject(item)}>{action === `start:${item.id}` ? '프로젝트 생성 중…' : unlock.unlocked ? '공동 건설 시작' : unlock.reason}</button>}
              </Motion.div>}
            </article>
          )
        })}
      </div>
      {message && <div className={`crew-construction-message font-tech ${/실패|못했|부족|필요/.test(message) ? 'is-error' : ''}`}>{message}</div>}
    </section>
  )
}
