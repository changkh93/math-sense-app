import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import './Dashboard.css'

export default function Dashboard({ user, userData }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'history'),
          orderBy('timestamp', 'desc'),
          limit(10)
        )
        const querySnapshot = await getDocs(q)
        const historyData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setHistory(historyData)
      } catch (error) {
        console.error("Error fetching history:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [user.uid])

  const stats = [
    { label: '전체 평균', value: `${userData?.averageScore?.toFixed(1) || '0.0'}점`, icon: '📈' },
    { label: '총 응시 퀴즈', value: `${userData?.totalQuizzes || 0}개`, icon: '📚' },
    { label: '보유 구슬', value: `${userData?.orbs || 0}개`, icon: '✨' },
  ]

  return (
    <div className="dashboard-view fadeIn">
      <div className="dashboard-header glass">
        <h2>🧑‍🎓 {user.displayName} 학생의 성장 기록</h2>
        <p>지금까지의 노력이 구슬처럼 차곡차곡 쌓이고 있어요!</p>
      </div>

      <div className="stats-grid">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card glass">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-value">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="history-section glass">
        <h3>📜 최근 학습 기록</h3>
        {loading ? (
          <p>기록을 불러오는 중...</p>
        ) : history.length > 0 ? (
          <div className="history-table">
            <div className="history-row header">
              <span>단원명</span>
              <span>점수</span>
              <span>날짜</span>
            </div>
            {history.map(item => (
              <div key={item.id} className="history-row">
                <span className="unit-title">{item.unitTitle}</span>
                <span className={`score ${item.score === 100 ? 'perfect' : ''}`}>{item.score}점</span>
                <span className="date">{new Date(item.timestamp?.seconds * 1000).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-msg">아직 기록이 없어요. 첫 번째 퀴즈를 풀어보세요!</p>
        )}
      </div>
    </div>
  )
}
