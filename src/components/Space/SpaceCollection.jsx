import React from 'react'
import { buildCollectionBadges, isBadgeUpgradeOwned } from '../../utils/badgeUtils';
/**
 * SpaceCollection - 우주 도감 및 배지
 */
export default function SpaceCollection({ userData, history }) {
  const badges = React.useMemo(
    () => buildCollectionBadges(userData, history),
    [userData, history]
  );

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>🏆 우주 도감</h2>
        <p style={{ color: 'var(--text-muted)' }}>수학 탐험을 통해 획득한 명예를 관리하세요.</p>
        
        <div className="glass-card" style={{ 
          marginTop: '2rem', 
          padding: '1rem 2rem', 
          maxWidth: '700px', 
          margin: '2rem auto 0',
          fontSize: '0.9rem',
          textAlign: 'left',
          borderLeft: '4px solid var(--star-gold)'
        }}>
          <p style={{ color: 'var(--text-bright)', marginBottom: '0.5rem', fontWeight: 700 }}>💡 도감 이용 가이드</p>
          <ul style={{ color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: '1.2rem' }}>
            <li><strong style={{ color: 'var(--star-gold)' }}>탐사 배지</strong>: 특정 목표를 달성하면 자동으로 수여되는 <strong>명예의 상징</strong>입니다.</li>
          </ul>
        </div>
      </div>

      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🏅 탐사 배지</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(목표 달성 시 자동 획득)</span>
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        {badges.map((badge) => {
          const showPremium = badge.unlocked
            && isBadgeUpgradeOwned(userData, badge.id)
            && !!badge.premiumImage;
          return (
          <div
            key={badge.id}
            className="glass-card"
            style={{
              padding: showPremium ? '0.75rem' : '1.5rem',
              textAlign: 'center',
              opacity: badge.unlocked ? 1 : 0.4,
              filter: badge.unlocked ? 'none' : 'grayscale(100%)',
              border: showPremium ? '1px solid var(--star-gold)' : (badge.unlocked ? '1px solid var(--star-gold)' : '1px solid var(--glass-border)'),
              minHeight: showPremium ? 292 : undefined,
              display: showPremium ? 'grid' : undefined,
              placeItems: showPremium ? 'center' : undefined,
              background: showPremium
                ? 'radial-gradient(circle at 50% 18%, rgba(255, 215, 0, 0.18), rgba(23, 23, 54, 0.94) 62%)'
                : undefined,
              boxShadow: showPremium ? '0 16px 44px rgba(0,0,0,0.32), 0 0 26px rgba(255, 215, 0, 0.22)' : 'none',
              transition: 'transform 0.3s ease',
              cursor: 'default'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>
              {showPremium ? (
                <img src={badge.premiumImage} alt={badge.title} style={{ width: 'min(100%, 205px)', height: 268, objectFit: 'contain', filter: 'drop-shadow(0 20px 28px rgba(0,0,0,0.4))' }} />
              ) : (
                <span>{badge.icon}</span>
              )}
            </div>
            {!showPremium && (
              <>
                <div style={{ fontWeight: 800, color: badge.unlocked ? 'var(--star-gold)' : 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {badge.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minHeight: '3em' }}>{badge.desc}</div>
                <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: badge.unlocked ? 'var(--planet-green)' : 'var(--text-muted)' }}>
                  {badge.unlocked ? '✅ 획득 완료' : '🔒 잠겨 있음'}
                </div>
              </>
            )}
          </div>
          );
        })}
      </div>


    </div>
  )
}
