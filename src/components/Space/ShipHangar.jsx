import React from 'react'
import { Check, ChevronRight, Gem, LockKeyhole, Orbit, ShoppingBag, Sparkles, Wrench } from 'lucide-react'
import ModularShip from './ModularShip'
import {
  buildShipPreviewLoadout,
  getShipAchievementStats,
  getShipGrade,
  getShipItemUnlock,
  normalizeOwnedShipItems,
  normalizeShipLoadout,
  SHIP_ITEMS,
  SHIP_SLOT_META,
  SHIP_SLOT_ORDER,
} from '../../utils/shipCatalog'
import './ShipHangar.css'

const TIER_LABELS = {
  BASIC: '기본',
  UNCOMMON: '고급',
  RARE: '희귀',
  EPIC: '영웅',
  LEGEND: '전설',
}

export default function ShipHangar({ userData, history = [], busy = false, onAction }) {
  const loadout = React.useMemo(() => normalizeShipLoadout(userData), [userData])
  const ownedItems = React.useMemo(() => new Set(normalizeOwnedShipItems(userData)), [userData])
  const stats = React.useMemo(() => getShipAchievementStats(userData, history), [userData, history])
  const grade = React.useMemo(() => getShipGrade(userData), [userData])
  const [activeSlot, setActiveSlot] = React.useState('wings')
  const [previewItemId, setPreviewItemId] = React.useState(loadout.wings)

  React.useEffect(() => {
    setPreviewItemId(loadout[activeSlot])
  }, [activeSlot, loadout])

  const slotItems = SHIP_ITEMS.filter((item) => item.slot === activeSlot)
  const previewItem = SHIP_ITEMS.find((item) => item.id === previewItemId) || slotItems[0]
  const previewLoadout = buildShipPreviewLoadout(loadout, previewItem)
  const previewOwned = ownedItems.has(previewItem?.id)
  const previewEquipped = loadout[activeSlot] === previewItem?.id
  const previewUnlock = getShipItemUnlock(previewItem, stats)
  const canAfford = Number(userData?.crystals || 0) >= Number(previewItem?.cost || 0)

  const actionLabel = previewEquipped
    ? '현재 장착 중'
    : previewOwned
      ? '이 부품 장착하기'
      : !previewUnlock.unlocked
        ? `${previewUnlock.label} 달성 필요`
        : !canAfford
          ? `광석 ${Number(previewItem?.cost || 0) - Number(userData?.crystals || 0)}개 더 필요`
          : `${previewItem.cost} 광석으로 구매·장착`

  return (
    <section className="ship-hangar" aria-labelledby="ship-hangar-title">
      <div className="ship-hangar__ambient" aria-hidden="true" />
      <header className="ship-hangar__header">
        <div>
          <div className="ship-hangar__eyebrow"><Orbit size={15} /> PERSONAL EXPLORER / SCOUT FAMILY</div>
          <h2 id="ship-hangar-title">나의 조립식 탐사선</h2>
          <p>광석으로 부품을 해금하고 장착하세요. 완성한 탐사선은 지도·프로필·크루·퀴즈 배틀에 그대로 출격합니다.</p>
        </div>
        <div className="ship-hangar__wallet"><Gem size={17} /> <span>보유 광석</span><strong>{Number(userData?.crystals || 0).toLocaleString()}</strong></div>
      </header>

      <div className="ship-hangar__layout">
        <div className="ship-hangar__bay">
          <div className="ship-hangar__grade">
            <span>SHIP GRADE · {String(grade.level).padStart(2, '0')}</span>
            <strong>{grade.name}</strong>
            <small>{grade.code}</small>
          </div>
          <div className="ship-hangar__ship-stage">
            <div className="ship-hangar__orbit ship-hangar__orbit--outer" />
            <div className="ship-hangar__orbit ship-hangar__orbit--inner" />
            <div className="ship-hangar__scanline" />
            <ModularShip loadout={previewLoadout} size={360} title={`${previewItem?.name || ''} 미리보기`} />
            {!previewEquipped && <span className="ship-hangar__preview-chip">PREVIEW</span>}
          </div>
          <div className="ship-hangar__specs">
            <div><span>계열</span><strong>정찰선</strong></div>
            <div><span>보유 부품</span><strong>{ownedItems.size}</strong></div>
            <div><span>장착 슬롯</span><strong>{SHIP_SLOT_ORDER.length}</strong></div>
          </div>
        </div>

        <div className="ship-hangar__console">
          <nav className="ship-hangar__slots" aria-label="탐사선 부품 슬롯">
            {SHIP_SLOT_ORDER.map((slot) => {
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
              const unlock = getShipItemUnlock(item, stats)
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
                    <small>{equipped ? '장착 중' : owned ? '보유 중' : unlock.unlocked ? `${item.cost} 광석` : unlock.label}</small>
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
              </div>
              <strong>{previewItem.cost === 0 ? '기본 제공' : <><Gem size={15} /> {previewItem.cost}</>}</strong>
            </div>
            <p>{previewItem.tagline}</p>
            {previewItem.unlock && <div className={`ship-hangar__unlock ${previewUnlock.unlocked ? 'is-complete' : ''}`}>
              <div><Sparkles size={14} /><span>{previewUnlock.label}</span><strong>{Math.min(previewUnlock.current, previewUnlock.target)} / {previewUnlock.target}</strong></div>
              <i><span style={{ width: `${previewUnlock.progress * 100}%` }} /></i>
            </div>}
            <button
              type="button"
              className="ship-hangar__action"
              disabled={busy || previewEquipped || !previewUnlock.unlocked || (!previewOwned && !canAfford)}
              onClick={() => onAction?.(previewItem, { owned: previewOwned })}
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
