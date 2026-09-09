import { ArrowLeft, ArrowUpRight, Check, Grid2X2, LockKeyhole, Orbit, Rocket } from 'lucide-react'
import { ELEMENTARY_STATIONS, getElementaryAccess, getElementaryWorld } from './elementaryPlanetCatalog'
import './ElementaryPlanetExplorer.css'

function PlanetThumbnail({ world }) {
  return (
    <img
      aria-hidden="true"
      alt=""
      className="elementary-orb-image"
      src={`/assets/planets/elementary/${world.key || world.id}.webp`}
      width="256"
      height="224"
      loading="lazy"
      decoding="async"
    />
  )
}

export default function ElementaryPlanetExplorer({
  regions = [],
  loading,
  error,
  onRetry,
  onToggleMode,
  onBack,
  onSelectRegion,
  onSelectStation,
  onEnterFrontier,
  canUse3D = true,
  regionAccess = {},
  explorationStatus = {},
  recentRegionId,
  darkMatterCount = 0,
}) {
  const worlds = regions.map(getElementaryWorld)
  const completeCount = worlds.filter((world) => explorationStatus[world.id] === 'completed').length

  const statusFor = (world) => {
    const access = getElementaryAccess(world.region, regionAccess)
    if (access === 'suspended') return '이용 일시정지'
    if (access === 'locked') return '참여 신청'
    if (explorationStatus[world.id] === 'completed') return '탐사 완료'
    if (recentRegionId === world.id) return '최근 학습'
    return '탐사하기'
  }

  return (
    <section className="elementary-explorer" aria-label="초등수학 행성 목록">
      <div className="elementary-topline">
        {onBack && (
          <button type="button" className="elementary-back" onClick={onBack}>
            <ArrowLeft size={16} /> 행성 군집 목록
          </button>
        )}
        <button type="button" className="elementary-frontier" onClick={onEnterFrontier}>
          <Rocket size={16} /> 아스트라 프론티어 <ArrowUpRight size={14} />
        </button>
      </div>

      <header className="elementary-heading">
        <div>
          <p className="elementary-eyebrow">MATH UNIVERSE <span>/ 01</span></p>
          <h1>생각이 자라는 <span>수학 우주</span></h1>
          <p className="elementary-intro">학습 행성을 빠르게 찾을 수 있는 2D 목록이에요.</p>
        </div>
        <div className="elementary-mode" role="group" aria-label="행성 보기 방식">
          <button type="button" disabled={!canUse3D} onClick={onToggleMode}>
            <Orbit size={16} /> 3D 우주 탐사
          </button>
          <button type="button" aria-pressed="true">
            <Grid2X2 size={15} /> 2D 목록
          </button>
        </div>
      </header>

      <div className="elementary-sectionbar">
        <div><span className="elementary-live-dot" /> 초등수학 행성군 <span className="elementary-count">{worlds.length}개의 학습 행성</span></div>
        <span>탐사 완료 <b>{completeCount}</b> / {worlds.length}</span>
      </div>

      {loading ? (
        <div className="elementary-empty" role="status">행성 지도를 불러오고 있어요…</div>
      ) : error ? (
        <div className="elementary-empty" role="alert">
          <p>행성 지도를 불러오지 못했어요.</p>
          <button type="button" onClick={onRetry}>다시 시도</button>
        </div>
      ) : !worlds.length ? (
        <div className="elementary-empty">아직 등록된 학습 행성이 없어요.</div>
      ) : (
        <div className="elementary-world-grid">
          {worlds.map((world, index) => (
            <button
              type="button"
              key={world.id}
              className="elementary-world-card"
              style={{ '--world-color': world.color }}
              onClick={() => onSelectRegion(world.id)}
            >
              <span className="elementary-card-top">
                <span>{String(index + 1).padStart(2, '0')} / {world.topic}</span>
                <ArrowUpRight size={17} />
              </span>
              <PlanetThumbnail world={world} />
              <span className="elementary-world-name">{world.title}</span>
              <span className="elementary-world-latin">{world.subtitle}</span>
              <span className="elementary-card-status">
                {getElementaryAccess(world.region, regionAccess) !== 'open'
                  ? <LockKeyhole size={12} />
                  : explorationStatus[world.id] === 'completed'
                    ? <Check size={13} />
                    : <span className="elementary-status-dot" />}
                {statusFor(world)}
              </span>
            </button>
          ))}
        </div>
      )}

      <section className="elementary-stations" aria-label="나의 학습 스테이션">
        <h2>나의 학습 스테이션</h2>
        <div className="elementary-station-grid">
          {ELEMENTARY_STATIONS.map((station) => (
            <button type="button" key={station.id} onClick={() => onSelectStation(station.id)} style={{ '--world-color': station.color }}>
              <PlanetThumbnail world={station} />
              <span>
                <strong>{station.title}</strong>
                <small>{station.topic}{station.id === 'dark' || station.id === 'refinery' ? ` · ${darkMatterCount}` : ''}</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      </section>

      <footer className="elementary-map-footer">
        <span><Orbit size={14} /> 3D 우주에서는 드래그로 둘러보고, 휠로 가까이 갈 수 있어요.</span>
        <span>METASENSE · LEARNING WITHOUT LIMITS</span>
      </footer>
    </section>
  )
}
