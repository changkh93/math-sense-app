import React, { useState } from 'react';
import { buildCollectionBadges, isBadgeUpgradeOwned } from '../../utils/badgeUtils';

/**
 * SpaceCollection - 우주 도감 및 배지 (Region별 아코디언 그룹화 적용)
 */
export default function SpaceCollection({ userData, history }) {
  const badges = React.useMemo(
    () => buildCollectionBadges(userData, history),
    [userData, history]
  );

  // Group state for Region Accordions: default closed for courses
  const [openRegions, setOpenRegions] = useState({
    'cluster_elementary': false,
    'middle-math': false,
    'python': false,
    'western-classic': false,
  });

  const toggleRegion = (key) => {
    setOpenRegions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const agoraBadges = badges.filter((b) => b.category === 'agora' || b.category === 'social');
  const crewBadges = badges.filter((b) => b.category === 'crew');
  const readingBadges = badges.filter((b) => b.category === 'reading');
  const generalBadges = badges.filter((b) => b.category === 'general');
  const courseMasterBadges = badges.filter((b) => b.category === 'course_master');
  const regionMasterBadges = badges.filter((b) => b.category === 'region_master');

  // Group Region Badges by Cluster
  const clusterGroups = React.useMemo(() => {
    const map = {
      'cluster_elementary': { title: '🏫 초등수학 성역 마스터 배지', badges: [] },
      'middle-math': { title: '📐 중등수학 성역 마스터 배지', badges: [] },
      'python': { title: '🐍 파이썬 코딩 성역 마스터 배지', badges: [] },
      'western-classic': { title: '🏛️ 서양 고전 성역 마스터 배지', badges: [] },
    };
    regionMasterBadges.forEach((badge) => {
      const cid = badge.clusterId || 'cluster_elementary';
      if (!map[cid]) {
        map[cid] = { title: `🛸 ${cid} 성역 마스터 배지`, badges: [] };
      }
      map[cid].badges.push(badge);
    });
    return map;
  }, [regionMasterBadges]);

  const renderBadgeCard = (badge) => {
    const showPremium = badge.unlocked && isBadgeUpgradeOwned(userData, badge.id) && !!badge.premiumImage;
    return (
      <div
        key={badge.id}
        className="glass-card"
        style={{
          padding: showPremium ? '0.75rem' : '1.25rem',
          textAlign: 'center',
          opacity: badge.unlocked ? 1 : 0.45,
          filter: badge.unlocked ? 'none' : 'grayscale(90%)',
          border: showPremium
            ? '1px solid var(--star-gold)'
            : badge.unlocked
            ? '1px solid var(--crystal-cyan)'
            : '1px solid var(--glass-border)',
          minHeight: showPremium ? 292 : undefined,
          display: showPremium ? 'grid' : 'flex',
          flexDirection: showPremium ? undefined : 'column',
          alignItems: 'center',
          justifyContent: showPremium ? undefined : 'space-between',
          background: showPremium
            ? 'radial-gradient(circle at 50% 18%, rgba(255, 215, 0, 0.18), rgba(23, 23, 54, 0.94) 62%)'
            : badge.unlocked
            ? 'rgba(15, 23, 42, 0.75)'
            : 'rgba(5, 10, 25, 0.6)',
          boxShadow: showPremium
            ? '0 16px 44px rgba(0,0,0,0.32), 0 0 26px rgba(255, 215, 0, 0.22)'
            : 'none',
          borderRadius: 12,
          transition: 'all 0.25s ease',
        }}
      >
        <div style={{ fontSize: '2.8rem', marginBottom: '0.6rem', lineHeight: 1 }}>
          {showPremium ? (
            <img
              src={badge.premiumImage}
              alt={badge.title}
              loading="lazy"
              decoding="async"
              style={{
                width: 'min(100%, 205px)',
                height: 268,
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 28px rgba(0,0,0,0.4))',
              }}
            />
          ) : (
            <span>{badge.icon}</span>
          )}
        </div>
        {!showPremium && (
          <div style={{ width: '100%' }}>
            <div
              style={{
                fontWeight: 800,
                color: badge.unlocked ? 'var(--star-gold)' : 'var(--text-bright)',
                fontSize: '0.95rem',
                marginBottom: '0.4rem',
              }}
            >
              {badge.title}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, minHeight: '2.8em' }}>
              {badge.desc}
            </div>
            <div
              style={{
                marginTop: '0.8rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: badge.unlocked ? 'var(--planet-green)' : 'var(--text-muted)',
              }}
            >
              {badge.unlocked ? '✅ 획득 완료' : '🔒 잠겨 있음'}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.3rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>🏆 우주 명예 도감</h2>
        <p style={{ color: 'var(--text-muted)' }}>성단과 성역(Region)을 개척하며 획득한 마스터 배지를 확인하세요.</p>

        <div
          className="glass-card"
          style={{
            marginTop: '1.5rem',
            padding: '1rem 1.5rem',
            maxWidth: '720px',
            margin: '1.5rem auto 0',
            fontSize: '0.88rem',
            textAlign: 'left',
            borderLeft: '4px solid var(--star-gold)',
          }}
        >
          <p style={{ color: 'var(--text-bright)', marginBottom: '0.3rem', fontWeight: 700 }}>💡 마스터 배지 도감 안내</p>
          <ul style={{ color: 'var(--text-muted)', lineHeight: 1.55, paddingLeft: '1.2rem', margin: 0 }}>
            <li><strong>코스 & 성역(Region) 마스터</strong>: 각 과정 및 행성 영역을 완주하면 수여되는 <strong>최고의 명예 배지</strong>입니다.</li>
            <li>성역 카드를 클릭하면 하위 챕터 및 성역 배지 목록을 <strong>열림/닫힘(아코디언)</strong>할 수 있습니다.</li>
          </ul>
        </div>
      </div>

      {/* 1. 코스 마스터 배지 Section */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>👑 코스(Course) 마스터 배지</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(대단원 완주 시 획득)</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.2rem' }}>
          {courseMasterBadges.map(renderBadgeCard)}
        </div>
      </div>

      {/* 2. 성역(Region) 마스터 배지 Accordion Section */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🛸 성역(Region)별 마스터 배지 그룹</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(클릭 시 열림/닫힘)</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {Object.entries(clusterGroups).map(([clusterKey, group]) => {
            const isOpen = openRegions[clusterKey] ?? false;
            return (
              <div key={clusterKey} className="glass-card" style={{ borderRadius: 14, overflow: 'hidden', padding: 0 }}>
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleRegion(clusterKey)}
                  style={{
                    width: '100%',
                    padding: '1.1rem 1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: 'none',
                    color: 'var(--text-bright)',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    outline: 'none',
                  }}
                >
                  <div>
                    <span>{group.title}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: isOpen ? 'var(--crystal-cyan)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {isOpen ? '열림 ▲' : '닫힘 ▼'}
                  </span>
                </button>

                {/* Accordion Content */}
                {isOpen && (
                  <div style={{ padding: '1.2rem', background: 'rgba(5, 10, 25, 0.4)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                      {group.badges.map(renderBadgeCard)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 스텔라 아고라 배지 Section */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>💬 스텔라 아고라 배지</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(질문·답변·채택 및 탐사 등급 달성)</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
          {agoraBadges.map(renderBadgeCard)}
        </div>
      </div>

      {/* 4. 스터디 크루 활동 배지 Section */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🚢 스터디 크루 활동 배지</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(미션·팀워크·공동 광석 상자 기여)</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
          {crewBadges.map(renderBadgeCard)}
        </div>
      </div>

      {/* 5. 서양 고전 독서 배지 Section */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📚 서양 고전 독서 배지</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(독서 기록·연속 스트릭·항행 일지·유효 완독)</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
          {readingBadges.map(renderBadgeCard)}
        </div>
      </div>

      {/* 6. 일반 & 업적 배지 Section */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🏅 일반 탐사 & 활동 배지</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
          {generalBadges.map(renderBadgeCard)}
        </div>
      </div>
    </div>
  );
}
