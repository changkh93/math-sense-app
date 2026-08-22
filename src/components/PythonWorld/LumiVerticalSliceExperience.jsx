import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { getLumiMissionSet } from './lumiCourseCatalog.js'
import PythonMissionLab from './PythonMissionLab'

export default function LumiVerticalSliceExperience({ actId = 'act-0-awakening', initialMissionIndex = null, onBack }) {
  const { user } = useAuth()
  const missionSet = getLumiMissionSet(actId)
  const isPreviewOnly = missionSet?.persistencePolicy === 'none'
  const unitId = missionSet?.unitId || `lumi_protocol_${actId.replace(/-/g, '_')}`
  const unit = Object.freeze({
    id: unitId,
    title: missionSet.title,
    clusterId: 'python',
  })

  const [progress, setProgress] = useState(() => {
    if (isPreviewOnly) return {}
    try {
      const local = typeof localStorage !== 'undefined'
        ? (localStorage.getItem(`metasense:lumi-progress:${actId}`) || (actId === 'act-0-awakening' ? localStorage.getItem('metasense:lumi-progress:v1') : null))
        : null
      if (local) return JSON.parse(local)
    } catch {
      // ignore
    }
    return user?.uid ? null : {}
  })

  useEffect(() => {
    let active = true
    if (isPreviewOnly || !user?.uid) {
      return () => { active = false }
    }

    getDoc(doc(db, 'users', user.uid, 'learning_progress', unitId))
      .then((snapshot) => {
        if (active && snapshot.exists()) {
          const remote = snapshot.data()?.missionLab || {}
          setProgress((prev) => ({ ...(prev || {}), ...remote }))
        } else if (active) {
          setProgress((prev) => prev || {})
        }
      })
      .catch((error) => {
        console.warn('LUMI progress load failed:', error)
        if (active) setProgress((prev) => prev || {})
      })

    return () => { active = false }
  }, [actId, isPreviewOnly, unitId, user?.uid])

  if (progress === null) {
    return <div className="python-protocol-hub">탐사 기록을 불러오는 중입니다…</div>
  }

  const completedIds = (progress?.completedMissionIds || []).concat(
    Object.keys(progress?.completedMissions || {})
  )
  const firstIncomplete = (missionSet.missions || []).findIndex((m) => !completedIds.includes(m.id))
  const resolvedMissionIndex = typeof initialMissionIndex === 'number' && initialMissionIndex >= 0
    ? initialMissionIndex
    : (firstIncomplete >= 0 ? firstIncomplete : 0)

  return (
    <PythonMissionLab
      unit={unit}
      missionSet={missionSet}
      initialMissionIndex={resolvedMissionIndex}
      initialProgress={progress}
      onBack={onBack}
    />
  )
}
