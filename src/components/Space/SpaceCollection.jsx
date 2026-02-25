import React from 'react'
/**
 * SpaceCollection - 우주 도감 및 배지
 */
export default function SpaceCollection({ userData, history }) {
  const badges = [
    // --- 기존 배지 (기준 상향) ---
    { title: '코스모스 입문', icon: '🌌', unlocked: (userData?.totalQuizzes || 0) > 0, desc: '첫 번째 수학 탐사를 성공적으로 마쳤습니다.' },
    { title: '광석 수집가', icon: '💎', unlocked: (userData?.crystals || 0) >= 500, desc: '광석을 500개 이상 모았습니다. (중급 대원)' },
    { title: '은하 학자', icon: '📜', unlocked: (userData?.averageScore || 0) >= 95, desc: '평균 정답률 95% 이상을 유지 중인 엘리트 대원입니다.' },
    { title: '우주 비행사', icon: '👨‍🚀', unlocked: (userData?.totalQuizzes || 0) >= 30, desc: '탐험을 30번 이상 완료한 숙련된 비행사입니다.' },
    { title: '행성 개척자', icon: '🚩', unlocked: (userData?.totalQuizzes || 0) >= 70, desc: '수많은 행성을 개척한 위대한 탐험가입니다.' },
    { title: '태양계 마스터', icon: '☀️', unlocked: (userData?.totalQuizzes || 0) >= 132 && (userData?.averageScore || 0) >= 99, desc: '132개 모든 세트의 탐사를 마친 전설의 마스터입니다.' },
    
    // --- 신규 배지 (태도 중심) ---
    { title: '무결점 궤도', icon: '🛰️', unlocked: (userData?.consecutiveGood || 0) >= 10, desc: '연속 10세트 동안 정답률 90% 이상을 유지했습니다.' },
    { title: '슈퍼노바', icon: '💥', unlocked: (userData?.dailyQuizCount || 0) >= 5, desc: '하루에 5세트 이상의 탐사를 완수했습니다.' },
    { title: '심우주 항해사', icon: '🌠', unlocked: (userData?.totalQuizzes || 0) >= 100, desc: '누적 퀴즈 100세트를 돌파한 베테랑 항해사입니다.' },
    { title: '수학의 수호자', icon: '🛡️', unlocked: (userData?.shieldDefended || 0) >= 200, desc: '광자 쉴드로 에너지(광석) 손실을 200회 이상 방어했습니다.' },
    { title: '완벽한 도약', icon: '⚡', unlocked: (userData?.perfectCount || 0) >= 20, desc: '백점 보너스(+10)를 20회 달성한 완벽주의 대원입니다.' },
    
    // --- 연속 학습(Streak) 배지 ---
    { title: '항해의 시작', icon: '🕯️', unlocked: (userData?.longestStreak || 0) >= 3, desc: '3일 연속 학습을 달성했습니다.' },
    { title: '궤도 진입', icon: '🔵', unlocked: (userData?.longestStreak || 0) >= 7, desc: '7일 연속 학습! 안정 궤도에 진입했습니다.' },
    { title: '항성풍 서퍼', icon: '🟣', unlocked: (userData?.longestStreak || 0) >= 30, desc: '30일 연속! 항성풍을 타고 항해 중입니다.' },
    { title: '초신성 폭발', icon: '💫', unlocked: (userData?.longestStreak || 0) >= 100, desc: '100일 연속! 초신성급 에너지를 방출합니다.' },
    { title: '영원한 항해사', icon: '🌌', unlocked: (userData?.longestStreak || 0) >= 365, desc: '365일 연속! 은하핵에 도달한 전설의 항해사.' },
  ]

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>🏆 우주 도감</h2>
        <p style={{ color: 'var(--text-muted)' }}>수학 탐험을 통해 획득한 명예와 장비를 관리하세요.</p>
        
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
            <li><strong style={{ color: 'var(--crystal-cyan)' }}>보유 장비</strong>: 수학 탐사로 모은 광석(Ore)에 따라 해제되는 <strong>업그레이드 아이템</strong>입니다.</li>
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
        {badges.map((badge, idx) => (
          <div 
            key={idx} 
            className="glass-card" 
            style={{ 
              padding: '1.5rem', 
              textAlign: 'center',
              opacity: badge.unlocked ? 1 : 0.4,
              filter: badge.unlocked ? 'none' : 'grayscale(100%)',
              border: badge.unlocked ? '1px solid var(--star-gold)' : '1px solid var(--glass-border)',
              transition: 'transform 0.3s ease',
              cursor: 'default'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{badge.icon}</div>
            <div style={{ fontWeight: 800, color: badge.unlocked ? 'var(--star-gold)' : 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {badge.title}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minHeight: '3em' }}>{badge.desc}</div>
            <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: badge.unlocked ? 'var(--planet-green)' : 'var(--text-muted)' }}>
              {badge.unlocked ? '✅ 획득 완료' : '🔒 잠겨 있음'}
            </div>
          </div>
        ))}
      </div>


    </div>
  )
}
