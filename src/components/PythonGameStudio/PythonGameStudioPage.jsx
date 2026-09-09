import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import PythonGameStudio from './PythonGameStudio'
export default function PythonGameStudioPage({ onBack }) {
  const { user, userData, loading } = useAuth()
  const navigate = useNavigate()
  const back = onBack || (() => navigate('/?view=planet&cluster=python'))
  const allowed = user && !user.isAnonymous && !userData?.isGuest && !userData?.dataLoadError && (userData?.role === 'admin' || ['python', '파이썬'].some(id => userData?.clusterAccess?.[id] === 'active'))
  if (loading) return <div className="space-bg" style={{ padding: 40 }}>게임 스튜디오를 준비하고 있습니다…</div>
  if (!allowed) return <div className="space-bg" style={{ padding: 40, minHeight: '100vh' }}><h2>Python 게임 스튜디오</h2><p>파이썬 수강 계정으로 로그인해 주세요.</p><button onClick={back}>돌아가기</button></div>
  return <PythonGameStudio key={user.uid} uid={user.uid} onBack={onBack ? back : undefined} />
}
