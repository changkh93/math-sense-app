import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import PythonGameStudio from './PythonGameStudio'
import { hasFullStudioAccess, PUBLIC_STUDIO_UID } from './studioAccess'

export default function PythonGameStudioPage({ onBack }) {
  const { user, userData, loading } = useAuth()
  const navigate = useNavigate()
  const fullAccess = hasFullStudioAccess(user, userData)
  const back = onBack || (() => navigate(fullAccess ? '/?view=planet&cluster=python' : '/'))
  if (loading) return <div className="space-bg" style={{ padding: 40 }}>코드 스튜디오를 준비하고 있습니다…</div>
  return <PythonGameStudio
    key={fullAccess ? user.uid : PUBLIC_STUDIO_UID}
    uid={fullAccess ? user.uid : PUBLIC_STUDIO_UID}
    onBack={fullAccess && !onBack ? undefined : back}
    publicAccess={!fullAccess}
  />
}
