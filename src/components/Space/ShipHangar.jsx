import React from 'react'
import { Check, ChevronRight, Gem, LockKeyhole, Orbit, Rocket, ShoppingBag, Sparkles, Wrench } from 'lucide-react'
import ModularShip from './ModularShip'
import {
  buildShipPreviewLoadout,
  getActiveShipFamily,
  getShipAchievementStats,
  getShipFamilyProgress,
  getShipFamilySlotOrder,
  getShipGrade,
  getShipItemFamily,
  getShipItemUnlock,
  normalizeOwnedShipItems,
  normalizeShipLoadout,
  ownsShipFamily,
  SHIP_FAMILIES,
  SHIP_ITEMS,
  SHIP_SLOT_META,
} from '../../utils/shipCatalog'
import './ShipHangar.css'

const TIER_LABELS = {
  BASIC: '기본',
  UNCOMMON: '고급',
  RARE: '희귀',
  EPIC: '영웅',
  LEGEND: '전설',
}

export default function ShipHangar({ userData, history = [], busy = false, onAction, onFamilyAction }) {
  const activeFamily = React.useMemo(() => getActiveShipFamily(userData), [userData])
  const [displayedFamily, setDisplayedFamily] = React.useState(activeFamily)
  const loadout = React.useMemo(() => normalizeShipLoadout(userData, displayedFamily), [userData, displayedFamily])
  const ownedItems = React.useMemo(() => new Set(normalizeOwnedShipItems(userData)), [userData])
  const stats = React.useMemo(() => getShipAchievementStats(userData, history), [userData, history])
  const grade = React.useMemo(() => getShipGrade(userData, displayedFamily), [userData, displayedFamily])
  const slotOrder = React.useMemo(() => getShipFamilySlotOrder(displayedFamily), [displayedFamily])
  const familyProgress = React.useMemo(() => getShipFamilyProgress(userData, displayedFamily), [userData, displayedFamily])
  const familyOwned = ownsShipFamily(userData, displayedFamily)
  const [activeSlot, setActiveSlot] = React.useState('wings')
  const [previewItemId, setPreviewItemId] = React.useState(loadout.wings)

  React.useEffect(() => {
    setDisplayedFamily(activeFamily)
  }, [activeFamily])

  React.useEffect(() => {
    const nextSlot = displayedFamily === 'pathfinder' ? 'hull' : 'wings'
    setActiveSlot(nextSlot)
    setPreviewItemId(normalizeShipLoadout(userData, displayedFamily)[nextSlot])
  }, [displayedFamily, userData])

  React.useEffect(() => {
    setPreviewItemId(loadout[activeSlot])
  }, [activeSlot, loadout])

  const slotItems = SHIP_ITEMS.filter((item) => item.slot === activeSlot && getShipItemFamily(item) === displayedFamily)
  const previewItem = SHIP_ITEMS.find((item) => item.id === previewItemId) || slotItems[0]
  const previewLoadout = buildShipPreviewLoadout(loadout, previewItem)
  const previewOwned = ownedItems.has(previewItem?.id)
  const previewEquipped = loadout[activeSlot] === previewItem?.id
  const previewUnlock = getShipItemUnlock(previewItem, stats, userData)
  const canAfford = Number(userData?.crystals || 0) >= Number(previewItem?.cost || 0)

  const actionLabel = previewEquipped
    ? '현재 장착 중'
    : previewOwned
      ? '이 부품 장착하기'
      : !previewUnlock.unlocked
        ? `${previewUnlock.label} 달성 필요`
        : !canAfford
          ? `광석 ${(Number(previewItem?.cost || 0) - Number(userData?.crystals || 0)).toLocaleString()}개 더 필요`
          : `${previewItem.cost.toLocaleString()} 광석으로 구매·장착`

  return (
    <section className="ship-hangar" aria-labelledby="ship-hangar-title">
      <div className="ship-hangar__ambient" aria-hidden="true" />
      <header className="ship-hangar__header">
        <div>
          <div className="ship-hangar__eyebrow"><Orbit size={15} /> PERSONAL EXPLORER / MULTI-CLASS HANGAR</div>
          <h2 id="ship-hangar-title">나의 조립식 탐사선</h2>
          <p>광석으로 부품을 해금하고 장착하세요. 완성한 탐사선은 지도·프로필·크루·퀴즈 배틀에 그대로 출격합니다.</p>
        </div>
        <div className="ship-hangar__wallet"><Gem size={17} /> <span>보유 광석</span><strong>{Number(userData?.crystals || 0).toLocaleString()}</strong></div>
      </header>

      <nav className="ship-hangar__families" aria-label="탐사선 함급 선택">
        {Object.values(SHIP_FAMILIES).map((family) => {
          const isActive = activeFamily === family.id
          const isSelected = displayedFamily === family.id
          const owned = ownsShipFamily(userData, family.id)
          const familyGrade = family.id === 'scout' ? getShipGrade(userData, 'scout').level : family.grade
          return (
            <button key={family.id} type="button" className={`${isSelected ? 'is-selected' : ''} ${isActive ? 'is-active' : ''}`} onClick={() => setDisplayedFamily(family.id)}>
              <span>GRADE {String(familyGrade).padStart(2, '0')}</span>
              <strong>{family.name}</strong>
              <small>{isActive ? '현재 출격 중' : owned ? '보유 함급' : family.id === 'pathfinder' ? '건조 가능' : family.description}</small>
            </button>
          )
        })}
      </nav>

      <div className={`ship-hangar__layout ship-hangar__layout--${displayedFamily}`}>
        <div className={`ship-hangar__bay ship-hangar__bay--${displayedFamily}`}>
          <div className="ship-hangar__grade">
            <span>SHIP GRADE · {String(grade.level).padStart(2, '0')}</span>
            <strong>{grade.name}</strong>
            <small>{grade.code}</small>
          </div>
          {displayedFamily === 'pathfinder' && <div className="ship-hangar__construction">
            <div><span>개척함 건조 가치</span><strong>{familyProgress.spentCost.toLocaleString()} / {familyProgress.totalCost.toLocaleString()} 광석</strong></div>
            <i><span style={{ width: `${familyProgress.progress * 100}%` }} /></i>
            <small>{familyProgress.complete ? 'GRADE 03 전체 모듈 완성' : `부품 ${familyProgress.ownedCount}/${familyProgress.totalCount} · 앞으로 ${familyProgress.remainingCost.toLocaleString()}광석`}</small>
          </div>}
          <div className="ship-hangar__ship-stage">
            <div className="ship-hangar__orbit ship-hangar__orbit--outer" />
            <div className="ship-hangar__orbit ship-hangar__orbit--inner" />
            <div className="ship-hangar__scanline" />
            <ModularShip loadout={previewLoadout} family={displayedFamily} size={displayedFamily === 'pathfinder' ? 430 : 360} title={`${previewItem?.name || ''} 미리보기`} />
            {!previewEquipped && <span className="ship-hangar__preview-chip">PREVIEW</span>}
          </div>
          <div className="ship-hangar__specs">
            <div><span>계열</span><strong>{displayedFamily === 'pathfinder' ? '개척함' : '정찰선'}</strong></div>
            <div><span>보유 부품</span><strong>{displayedFamily === 'pathfinder' ? familyProgress.ownedCount : SHIP_ITEMS.filter((item) => getShipItemFamily(item) === 'scout' && ownedItems.has(item.id)).length}</strong></div>
            <div><span>장착 슬롯</span><strong>{slotOrder.length}</strong></div>
          </div>
          {familyOwned && activeFamily !== displayedFamily && <button type="button" className="ship-hangar__deploy" disabled={busy} onClick={() => onFamilyAction?.(displayedFamily)}><Rocket size={16} /> {grade.name}으로 출격</button>}
        </div>

        <div className="ship-hangar__console">
          <nav className={`ship-hangar__slots ${displayedFamily === 'pathfinder' ? 'is-pathfinder' : ''}`} aria-label="탐사선 부품 슬롯">
            {slotOrder.map((slot) => {
              const equipped = SHIP_ITEMS.find((item) => item.id === loadout[slot])
              return (
                <button key={slot} type="button" className={activeSlot === slot ? 'is-active' : ''} onClick={() => setActiveSlot(slot)}>
                  <span>{SHIP_SLOT_META[slot].shortLabel}</span>
                  <small>{equipped?.name}</small>
                </button>
              )
            })}
          </nav>

          <div className="ship-hangar__parts">
            {slotItems.map((item) => {
              const owned = ownedItems.has(item.id)
              const equipped = loadout[item.slot] === item.id
              const unlock = getShipItemUnlock(item, stats, userData)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${previewItem?.id === item.id ? 'is-selected' : ''} ${equipped ? 'is-equipped' : ''}`}
                  onClick={() => setPreviewItemId(item.id)}
                >
                  <div className={`ship-part-token ship-part-token--${item.tier.toLowerCase()}`}>
                    {equipped ? <Check size={17} /> : owned ? <Wrench size={16} /> : unlock.unlocked ? <ShoppingBag size={16} /> : <LockKeyhole size={15} />}
                  </div>
                  <div className="ship-part-copy">
                    <div><strong>{item.name}</strong><em data-tier={item.tier}>{TIER_LABELS[item.tier]}</em></div>
                    <small>{equipped ? '장착 중' : owned ? '보유 중' : unlock.unlocked ? `${item.cost.toLocaleString()} 광석` : unlock.label}</small>
                  </div>
                  <ChevronRight size={16} />
                </button>
              )
            })}
          </div>

          {previewItem && <div className="ship-hangar__selection">
            <div className="ship-hangar__selection-top">
              <div>
                <span>{SHIP_SLOT_META[previewItem.slot].label} · {TIER_LABELS[previewItem.tier]}</span>
                <h3>{previewItem.name}</h3>
                {previewItem.englishName && <small>{previewItem.englishName}</small>}
              </div>
              <strong>{previewItem.cost === 0 ? '기본 제공' : <><Gem size={15} /> {previewItem.cost.toLocaleString()}</>}</strong>
            </div>
            <p>{previewItem.tagline}</p>
            {(previewItem.unlock || !previewUnlock.unlocked) && <div className={`ship-hangar__unlock ${previewUnlock.unlocked ? 'is-complete' : ''}`}>
              <div><Sparkles size={14} /><span>{previewUnlock.label}</span><strong>{Math.min(previewUnlock.current, previewUnlock.target)} / {previewUnlock.target}</strong></div>
              <i><span style={{ width: `${previewUnlock.progress * 100}%` }} /></i>
            </div>}
            <button
              type="button"
              className="ship-hangar__action"
              disabled={busy || previewEquipped || !previewUnlock.unlocked || (!previewOwned && !canAfford)}
              onClick={() => onAction?.(previewItem, { owned: previewOwned, family: displayedFamily })}
            >
              {busy ? '격납고 작업 중…' : actionLabel}
              {!busy && !previewEquipped && previewUnlock.unlocked && (previewOwned || canAfford) && <ChevronRight size={18} />}
            </button>
          </div>}
        </div>
      </div>
    </section>
  )
}
