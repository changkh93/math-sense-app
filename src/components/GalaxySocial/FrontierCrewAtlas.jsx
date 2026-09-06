import { useState } from 'react'
import { canVisitCrewRoute, getCrewHelpTasks } from './frontierCrewRoutes'
import './FrontierCrewAtlas.css'

export function CrewVisitActivities({ planet, onInspect, onReturn, onLogs }) {
  const tasks = getCrewHelpTasks(planet?.layout)
  return (
    <section className="crew-activities" aria-label="친구 행성에서 함께할 일">
      <small>CREW · 함께 가꾸는 개척지</small>
      <h3>{planet?.ownerName || '크루원'}의 행성에 도착했어요</h3>
      <p>
        시설 가까이에서 E를 눌러 도와주세요. 친구가 접속하지 않아도 도움과
        응원은 귀환 기록에 남아요. 친구의 건물 배치나 광석은 변경할 수 없어요.
      </p>
      <div className="crew-activity-list">
        {tasks.map(({ item, label }) => (
          <button
            type="button"
            key={item.instanceId}
            onClick={() => onInspect(item)}
          >
            {label}
            <span>{item.name || label} · 시설 정보</span>
          </button>
        ))}
        {!tasks.length && (
          <p>
            아직 협업 시설이 없어요. 주변 자원 지점에서 감탄·수리 신호를
            남기거나 함께 풍경을 둘러보세요.
          </p>
        )}
      </div>
      <footer>
        <button type="button" onClick={onLogs}>
          내게 도착한 귀환 기록
        </button>
        <button type="button" onClick={onReturn}>
          내 행성으로 무료 귀환
        </button>
      </footer>
    </section>
  )
}

export default function FrontierCrewAtlas({
  neighbors = [],
  currentUid,
  ownName,
  isGuest,
  busy,
  onVisit,
  onBlock,
  onReport,
}) {
  const [selection, setSelection] = useState('')
  const selected =
    neighbors.find((route) => route.uid === selection) || neighbors[0]
  return (
    <section className="crew-atlas" aria-label="크루 성도">
      <header>
        <small>CREW CONSTELLATION</small>
        <h3>가까운 별, 함께 만드는 이야기</h3>
        <p>
          승인된 크루의 공개 행성은 무료로 오갈 수 있어요. 별을 고르고 출항해
          주세요.
        </p>
        <p>
          동쪽 바다의 수심 2m, 북쪽 하늘의 고도 10m에도 항로 게이트가 있어요.
          가까이에서 E를 누르면 이 성도가 열립니다. 장비 없이도 메뉴로 출항할 수
          있어요.
        </p>
      </header>
      <div className="crew-atlas-stars" role="group" aria-label="목적지 선택">
        <div className="crew-home-star">
          <span aria-hidden="true">✦</span>
          <strong>{ownName || '내 개척지'}</strong>
          <small>HOME SECTOR</small>
        </div>
        {neighbors.map((route) => (
          <button
            type="button"
            key={route.uid}
            aria-pressed={selected?.uid === route.uid}
            onClick={() => setSelection(route.uid)}
            className={`crew-star${route.blocked || route.visitMode !== 'crew' ? ' unavailable' : ''}`}
          >
            <span aria-hidden="true">◉</span>
            <strong>{route.displayName}</strong>
            <small>
              {route.blocked
                ? '차단됨'
                : route.visitMode !== 'crew'
                  ? '방문 쉬는 중'
                  : route.uid === currentUid
                    ? '현재 위치'
                    : '크루 항로 · 무료'}
            </small>
          </button>
        ))}
      </div>
      {selected && (
        <article className="crew-destination" aria-label="선택한 목적지">
          <div>
            <small>선택한 목적지 · {selected.displayName}</small>
            <h3>{selected.planetName}</h3>
            <p>{selected.tagline}</p>
            <span>
              항로 연결도 Lv.
              {selected.connection?.level || selected.routeLevel || 1} · 최근
              도움 신호 {selected.connection?.signalCount || 0}회
            </span>
          </div>
          <p>입장권·광석 소모 없음 · 건설은 주인만, 시설 돕기는 크루와 함께</p>
          <button
            type="button"
            className="crew-depart"
            disabled={!canVisitCrewRoute(selected, currentUid) || Boolean(busy)}
            onClick={() => onVisit(selected.uid)}
          >
            {selected.blocked
              ? '차단한 항로'
              : selected.visitMode !== 'crew'
                ? '지금은 방문할 수 없어요'
                : selected.uid === currentUid
                  ? '현재 머무는 행성'
                  : isGuest
                    ? '훈련 항로 연습하기'
                    : '이 행성으로 출항'}
          </button>
          {!isGuest && (
            <div className="crew-safety">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => onBlock(selected, !selected.blocked)}
              >
                {selected.blocked ? '차단 해제' : '차단'}
              </button>
              {!selected.blocked && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => onReport(selected)}
                >
                  신고
                </button>
              )}
            </div>
          )}
        </article>
      )}
    </section>
  )
}
