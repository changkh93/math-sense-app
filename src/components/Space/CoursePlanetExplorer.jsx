import { ArrowLeft, ArrowUpRight, Check, Grid2X2, LockKeyhole, Orbit, Rocket } from 'lucide-react'
import { filterWesternClassicRegions } from '../../constants/westernClassicNavigation'
import {
  getCourseAccess,
  getCourseExplorerConfig,
  getCourseStations,
  getCourseWorld,
} from './coursePlanetCatalog'
import './CoursePlanetExplorer.css'

function PlanetThumbnail({ item, compact = false }) {
  if (item.image) {
    return (
      <img
        aria-hidden="true"
        alt=""
        className={`course-orb-image${compact ? ' is-compact' : ''}`}
        src={item.image}
        width={compact ? 48 : 160}
        height={compact ? 48 : 132}
        loading="lazy"
        decoding="async"
      />
    )
  }

  return <span aria-hidden="true" className={`course-orb-glyph${compact ? ' is-compact' : ''}`}>{item.icon || '◌'}</span>
}

export default function CoursePlanetExplorer({
  clusterId,
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
  const config = getCourseExplorerConfig(clusterId)
  if (!config) return null

  const displayedRegions = config.key === 'classic' ? filterWesternClassicRegions(regions, clusterId) : regions
  const worlds = displayedRegions.map((region, index) => getCourseWorld(region, index, clusterId)).filter(Boolean)
  const stations = getCourseStations(clusterId)
  const completeCount = worlds.filter((world) => explorationStatus[world.id] === 'completed').length

  const statusFor = (world) => {
    const access = getCourseAccess(world.region, regionAccess)
    if (access === 'suspended') return '이용 일시정지'
    if (access === 'locked') return '참여 신청'
    if (explorationStatus[world.id] === 'completed') return '탐사 완료'
    if (recentRegionId === world.id) return '최근 학습'
    return config.key === 'classic' ? '작품 탐험하기' : '탐사하기'
  }

  return (
    <section
      className="course-explorer"
      data-course={config.key}
      aria-label={`${config.sectionLabel} 목록`}
      style={{
        '--course-accent': config.accent,
        '--course-accent-soft': config.accentSoft,
        '--course-columns': config.columns,
      }}
    >
      <div className="course-topline">
        {onBack && (
          <button type="button" className="course-back" onClick={onBack}>
            <ArrowLeft size={16} /> 행성 군집 목록
          </button>
        )}
        <button type="button" className="course-frontier" onClick={onEnterFrontier}>
          <Rocket size={16} /> 아스트라 프론티어 <ArrowUpRight size={14} />
        </button>
      </div>

      <header className="course-heading">
        <div>
          <p className="course-eyebrow">{config.eyebrow} <span>/ {config.sequence}</span></p>
          <h1>{config.title} <span>{config.highlight}</span></h1>
          <p className="course-intro">{config.intro}</p>
        </div>
        <div className="course-mode" role="group" aria-label="행성 보기 방식">
          <button type="button" disabled={!canUse3D} onClick={onToggleMode}>
            <Orbit size={16} /> 3D 우주 탐사
          </button>
          <button type="button" aria-pressed="true">
            <Grid2X2 size={15} /> 2D 목록
          </button>
        </div>
      </header>

      <div className="course-sectionbar">
        <div><span className="course-live-dot" /> {config.sectionLabel} <span className="course-count">{worlds.length}개의 학습 행성</span></div>
        <span>탐사 완료 <b>{completeCount}</b> / {worlds.length}</span>
      </div>

      {loading ? (
        <div className="course-empty" role="status">행성 목록을 불러오고 있어요…</div>
      ) : error ? (
        <div className="course-empty" role="alert">
          <p>행성 목록을 불러오지 못했어요.</p>
          <button type="button" onClick={onRetry}>다시 시도</button>
        </div>
      ) : !worlds.length ? (
        <div className="course-empty">아직 등록된 학습 행성이 없어요.</div>
      ) : (
        <div className="course-world-grid">
          {worlds.map((world, index) => {
            const access = getCourseAccess(world.region, regionAccess)
            const isCompleted = explorationStatus[world.id] === 'completed'
            return (
              <button
                type="button"
                key={world.id}
                className="course-world-card"
                style={{ '--world-color': world.color }}
                onClick={() => onSelectRegion(world.id)}
              >
                <span className="course-card-top">
                  <span>{String(index + 1).padStart(2, '0')} / {world.topic}</span>
                  <ArrowUpRight size={17} />
                </span>
                <PlanetThumbnail item={world} />
                <span className="course-world-name">{world.title}</span>
                <span className="course-world-subtitle">{world.subtitle}</span>
                <span className="course-card-status">
                  {access !== 'open'
                    ? <LockKeyhole size={12} />
                    : isCompleted
                      ? <Check size={13} />
                      : <span className="course-status-dot" />}
                  {statusFor(world)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <section className="course-stations" aria-label="나의 학습 스테이션">
        <h2>{config.key === 'classic' ? '나의 독서 스테이션' : '나의 학습 스테이션'}</h2>
        <div className="course-station-grid">
          {stations.map((station) => (
            <button type="button" key={station.id} onClick={() => onSelectStation(station.id)} style={{ '--world-color': station.color }}>
              <PlanetThumbnail item={station} compact />
              <span>
                <strong>{station.title}</strong>
                <small>{station.topic}{station.showsCount ? ` · ${darkMatterCount}` : ''}</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      </section>

      <footer className="course-map-footer">
        <span><Orbit size={14} /> 3D 우주에서는 드래그로 둘러보고, 휠로 가까이 갈 수 있어요.</span>
        <span>METASENSE · LEARNING WITHOUT LIMITS</span>
      </footer>
    </section>
  )
}
