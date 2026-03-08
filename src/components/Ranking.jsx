import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import './Ranking.css'

export default function Ranking({ user }) {
  const [topUsers, setTopUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeSnapshot = null;
    let cleanupTimeout = null;
    // 광석 개수 기준으로 상위 20명 가져오기
    const q = query(
      collection(db, 'users'),
      orderBy('crystals', 'desc'),
      limit(20)
    )

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setTopUsers(users)
      setLoading(false)
    })

    return () => {
      // Delay to prevent Firestore assertion errors (b815/ca9) on rapid remounts
      if (unsubscribeSnapshot) {
        cleanupTimeout = setTimeout(() => {
          if (unsubscribeSnapshot) unsubscribeSnapshot();
        }, 100);
      }
    };
  }, [])

  if (loading) return <div className="loading-small">랭킹 불러오는 중...</div>

  return (
    <div className="ranking-view fadeIn">
      <div className="hall-of-fame-header glass">
        <h2>🏆 명예의 전당</h2>
        <p>메타 센스의 우주를 가장 많이 항해한 영웅들이에요!</p>
      </div>

      <div className="ranking-list glass">
        <div className="ranking-item header">
          <span className="rank">순위</span>
          <span className="name">이름</span>
          <span className="orbs">메타 광석</span>
          <span className="avg">평균 점수</span>
        </div>
        
        {topUsers.map((u, index) => (
          <div key={u.id} className={`ranking-item ${u.id === user.uid ? 'me' : ''}`}>
            <span className="rank">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
            </span>
            <span className="name">{u.name || '무명탐험가'}</span>
            <span className="orbs">💎 {u.crystals || 0}</span>
            <span className="avg">{u.averageScore ? u.averageScore.toFixed(1) : '0.0'}점</span>
          </div>
        ))}
      </div>
    </div>
  )
}
