import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { useChapters, useClusters, useRegions } from '../../hooks/useContent'
import QuizBattleView from './QuizBattleView'
import './QuizBattleHub.css'

const COURSE_META = [
  { match: /elementary|초등/i, icon: '➗', tone: 'cyan', fallback: '초등수학' },
  { match: /middle|중등/i, icon: '📐', tone: 'violet', fallback: '중등수학' },
  { match: /python|파이썬/i, icon: '⌁', tone: 'green', fallback: '파이썬' },
  { match: /classic|고전|reading/i, icon: '✦', tone: 'gold', fallback: '고전 읽기' },
]

const getId = (item) => item?.docId || item?.id || ''
const getTitle = (item, fallback = '') => item?.title || item?.name || fallback

export default function QuizBattleHub({ onBack, onSoloQuiz }) {
  const { userData } = useAuth()
  const { data: clusters = [], isLoading: clustersLoading } = useClusters()
  const [clusterId, setClusterId] = useState('')
  const clusterAccess = userData?.clusterAccess || { cluster_elementary: 'active' }
  const authorizedClusters = userData?.isGuest === true
    ? clusters
    : clusters.filter((cluster) => clusterAccess[getId(cluster)] === 'active')
  const selectedClusterIsAuthorized = authorizedClusters.some((cluster) => getId(cluster) === clusterId)
  const effectiveClusterId = selectedClusterIsAuthorized ? clusterId : getId(authorizedClusters[0])
  const { data: regions = [], isLoading: regionsLoading } = useRegions(effectiveClusterId, { enabled: Boolean(effectiveClusterId) })
  const [regionId, setRegionId] = useState('')
  const regionAccess = userData?.regionAccess || {}
  const authorizedRegions = userData?.isGuest === true
    ? regions
    : regions.filter((region) => regionAccess[getId(region)] === 'active')
  const effectiveRegionId = authorizedRegions.some((region) => getId(region) === regionId) ? regionId : ''
  const { data: chapters = [], isLoading: chaptersLoading } = useChapters(effectiveRegionId)
  const [chapterId, setChapterId] = useState('')
  const [scope, setScope] = useState(null)
  const [mode, setMode] = useState('pvp')
  const [launched, setLaunched] = useState(false)

  const unitQueries = useQueries({
    queries: chapters.map((chapter) => ({
      queryKey: ['battle-hub-units', getId(chapter)],
      queryFn: async () => {
        const snap = await getDocs(query(collection(db, 'units'), where('chapterId', '==', getId(chapter))))
        return snap.docs
          .map((docSnap) => ({ ...docSnap.data(), docId: docSnap.id }))
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      },
      enabled: Boolean(effectiveRegionId),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const unitsByChapter = {}
  chapters.forEach((chapter, index) => { unitsByChapter[getId(chapter)] = unitQueries[index]?.data || [] })
  const allUnits = chapters.flatMap((chapter) => unitsByChapter[getId(chapter)] || [])
  const selectedChapter = chapters.find((chapter) => getId(chapter) === chapterId)
  const selectedUnits = unitsByChapter[chapterId] || []
  const selectedCluster = authorizedClusters.find((cluster) => getId(cluster) === effectiveClusterId)
  const selectedRegion = authorizedRegions.find((region) => getId(region) === effectiveRegionId)
  const unitsLoading = unitQueries.some((item) => item.isLoading)

  const courseCards = authorizedClusters.map((cluster, index) => {
    const searchable = `${getId(cluster)} ${getTitle(cluster)}`
    const meta = COURSE_META.find((item) => item.match.test(searchable)) || COURSE_META[index % COURSE_META.length]
    return { ...cluster, _meta: meta }
  })

  const selectRegionFull = () => {
    const lastUnit = allUnits[allUnits.length - 1]
    if (!lastUnit) return
    setScope({
      entryUnitId: getId(lastUnit),
      battleScope: 'cumulative',
      selectionKind: 'region',
      label: `${getTitle(selectedRegion, '선택 리전')} · 전범위`,
      detail: '이 리전의 첫 개념부터 마지막 유닛까지',
    })
  }

  const selectChapterFull = () => {
    const lastUnit = selectedUnits[selectedUnits.length - 1]
    if (!lastUnit || !selectedChapter) return
    setScope({
      entryUnitId: getId(lastUnit),
      battleScope: 'cumulative',
      selectionKind: 'chapter',
      label: `${getTitle(selectedChapter, '선택 챕터')}까지`,
      detail: '리전 시작부터 이 챕터의 마지막 유닛까지',
    })
  }

  if (launched && scope) {
    return (
      <QuizBattleView
        clusterId={effectiveClusterId}
        regionId={effectiveRegionId}
        entryUnitId={scope.entryUnitId}
        entryUnitTitle={scope.label}
        initialBattleScope={scope.battleScope}
        opponentMode={mode}
        rangeLabel={scope.label}
        onExit={() => setLaunched(false)}
        onSoloQuiz={() => onSoloQuiz?.({
          clusterId: effectiveClusterId,
          regionId: effectiveRegionId,
          unitId: scope.entryUnitId,
        })}
      />
    )
  }

  return (
    <main className="battle-hub">
      <div className="battle-hub__stars" aria-hidden="true" />
      <header className="battle-hub__hero">
        <button type="button" className="battle-hub__back" onClick={onBack}>← NAV</button>
        <div className="battle-hub__eyebrow">LIVE KNOWLEDGE ARENA</div>
        <h1>QUIZ BATTLE</h1>
        <p>먼저 전장을 고르세요. 배운 범위만 정확히 지정하고, 사람 또는 NOVA-7과 바로 대결합니다.</p>
        <div className="battle-hub__pulse"><span /> ARENA NETWORK ONLINE</div>
      </header>

      <section className="battle-deck">
        <div className="battle-deck__step"><span>01</span><div><b>COURSE</b><small>어떤 지식 우주에서 싸울까요?</small></div></div>
        <div className="battle-course-grid">
          {clustersLoading ? <div className="battle-empty">과정 좌표를 불러오는 중…</div> : courseCards.length === 0 ? <div className="battle-empty">운영툴에서 접근 허용된 과정이 없습니다.</div> : courseCards.map((cluster) => {
            const id = getId(cluster)
            const selected = id === effectiveClusterId
            return (
              <button key={id} type="button" className={`battle-course battle-course--${cluster._meta.tone} ${selected ? 'is-selected' : ''}`} onClick={() => { setClusterId(id); setRegionId(''); setChapterId(''); setScope(null) }}>
                <span className="battle-course__icon">{cluster._meta.icon}</span>
                <strong>{getTitle(cluster, cluster._meta.fallback)}</strong>
                <small>{selected ? '좌표 연결됨' : '과정 선택'}</small>
              </button>
            )
          })}
        </div>

        <div className="battle-deck__step"><span>02</span><div><b>RANGE LOCK</b><small>REGIONS → CHAPTERS → UNITS</small></div></div>
        <div className="battle-range-grid">
          <div className="battle-range-column">
            <div className="battle-range-column__title">REGIONS</div>
            {regionsLoading ? <div className="battle-empty">리전 탐색 중…</div> : authorizedRegions.length === 0 ? <div className="battle-empty">이 과정에서 접근 허용된 리전이 없습니다.</div> : authorizedRegions.map((region) => (
              <button key={getId(region)} type="button" className={getId(region) === regionId ? 'is-active' : ''} onClick={() => { setRegionId(getId(region)); setChapterId(''); setScope(null) }}>
                <span>{getTitle(region, '이름 없는 리전')}</span><i>›</i>
              </button>
            ))}
          </div>
          <div className="battle-range-column">
            <div className="battle-range-column__title">CHAPTERS</div>
            {!effectiveRegionId ? <div className="battle-empty">먼저 리전을 선택하세요.</div> : chaptersLoading ? <div className="battle-empty">챕터 분석 중…</div> : <>
              <button type="button" className={scope?.selectionKind === 'region' ? 'is-active is-full' : 'is-full'} onClick={selectRegionFull} disabled={!allUnits.length}>◎ 전범위</button>
              {chapters.map((chapter) => (
                <button key={getId(chapter)} type="button" className={getId(chapter) === chapterId ? 'is-active' : ''} onClick={() => { setChapterId(getId(chapter)); setScope(null) }}>
                  <span>{getTitle(chapter, '이름 없는 챕터')}</span><i>›</i>
                </button>
              ))}
            </>}
          </div>
          <div className="battle-range-column battle-range-column--units">
            <div className="battle-range-column__title">UNITS / SCOPE</div>
            {!chapterId ? <div className="battle-empty">챕터를 선택하거나 전범위를 고르세요.</div> : unitsLoading ? <div className="battle-empty">유닛 스캔 중…</div> : <>
              <button type="button" className={scope?.selectionKind === 'chapter' ? 'is-active is-full' : 'is-full'} onClick={selectChapterFull}>◉ 이 챕터까지</button>
              {selectedUnits.map((unit) => (
                <button key={getId(unit)} type="button" className={scope?.selectionKind === 'unit' && scope?.entryUnitId === getId(unit) ? 'is-active' : ''} onClick={() => setScope({ entryUnitId: getId(unit), battleScope: 'cumulative', selectionKind: 'unit', label: `${getTitle(unit, '선택 유닛')}까지`, detail: '리전 시작부터 선택한 유닛까지 누적 출제' })}>
                  <span>{getTitle(unit, '이름 없는 유닛')}</span><i>+</i>
                </button>
              ))}
            </>}
          </div>
        </div>

        <div className="battle-launch-grid">
          <div className="battle-scope-lock">
            <div className="battle-deck__step"><span>03</span><div><b>LOCKED TARGET</b><small>내가 선택한 퀴즈 범위</small></div></div>
            {scope ? <><strong>{scope.label}</strong><p>{scope.detail}</p><div className="battle-scope-lock__path">{getTitle(selectedCluster)} / {getTitle(selectedRegion)} / {scope.label}</div></> : <div className="battle-empty battle-empty--large">범위를 선택하면 출격 좌표가 여기에 고정됩니다.</div>}
          </div>
          <div className="battle-opponents">
            <button type="button" className={mode === 'pvp' ? 'is-selected' : ''} onClick={() => setMode('pvp')}>
              <span>⚔️</span><div><b>LIVE CHALLENGER</b><small>대기자 선택 또는 자동 매칭 · 일반 광석</small></div>
            </button>
            <button type="button" className={mode === 'ai' ? 'is-selected' : ''} onClick={() => setMode('ai')}>
              <span>◈</span><div><b>NOVA-7 AI</b><small>내 속도에 적응 · 광석 1/3</small></div>
            </button>
          </div>
        </div>

        {userData?.isGuest === true && <div className="battle-guest-note"><b>GUEST RUN</b> 모든 배틀에 참여할 수 있습니다. 내 전적·광석은 저장되지 않으며 상대방 전적에는 게스트전으로 반영됩니다.</div>}
        <div className="battle-guest-note"><b>FAIR PLAY</b> 현재 학습 중인 과정과 리전에서만 참여할 수 있습니다. 하루 배틀 광석은 최대 500개이며, 같은 범위 또는 같은 상대와의 반복 대결은 하루 3회까지만 보상·공식 전적에 반영됩니다. AI 사용 및 부정행위가 적발되면 퀴즈 배틀에서 영구 퇴출될 수 있습니다.</div>
        <button type="button" className="battle-launch" disabled={!scope} onClick={() => setLaunched(true)}>
          <span>{scope ? `${mode === 'ai' ? 'NOVA-7' : '배틀 대기룸'}으로 출격` : '먼저 퀴즈 범위를 선택하세요'}</span><i>→</i>
        </button>
      </section>
    </main>
  )
}
