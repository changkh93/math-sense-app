import React from 'react'
import { getCometTier } from '../../utils/streakUtils'
import './CometBadge.css'

/**
 * ☄️ CometBadge — 연속 학습 혜성 등급 표시 컴포넌트
 * 
 * @param {number} streak - 현재 연속 학습 일수
 * @param {boolean} [compact=false] - 랭킹 등 좁은 공간용 축소 표시
 * @param {boolean} [mini=false] - 초소형 인라인 표시
 * @param {boolean} [celebrating=false] - 마일스톤 달성 직후 축하 효과
 * @param {boolean} [showTooltip=true] - 호버 툴팁 표시 여부
 */
export default function CometBadge({ 
  streak = 0, 
  compact = false, 
  mini = false, 
  celebrating = false,
  showTooltip = true 
}) {
  const tier = getCometTier(streak)
  
  if (streak <= 0 && mini) return null // mini 모드에서 비활성은 숨김
  
  const sizeClass = mini ? 'mini' : compact ? 'compact' : ''
  const activeClass = streak > 0 ? 'is-active' : ''
  const celebrateClass = celebrating ? 'celebrating' : ''
  
  return (
    <div 
      className={`comet-badge tier-${tier.tier} ${sizeClass} ${activeClass} ${celebrateClass}`}
      style={{ '--comet-glow': tier.glowColor }}
    >
      <span className="comet-icon">{tier.icon}</span>
      {streak > 0 && (
        <span className="comet-streak-number">{streak}</span>
      )}
      {!mini && streak > 0 && (
        <span className="comet-tail" style={{ background: tier.gradient }} />
      )}
      
      {showTooltip && (
        <div className="comet-tooltip">
          {streak > 0 
            ? `${streak}일 연속 항해 중! (${tier.label} 등급)`
            : '아직 항해를 시작하지 않았습니다'
          }
        </div>
      )}
    </div>
  )
}
