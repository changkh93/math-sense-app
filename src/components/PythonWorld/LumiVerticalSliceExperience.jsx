import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { getLumiVerticalSliceSet } from './pythonMissionCatalog'
import PythonMissionLab from './PythonMissionLab'

const VERTICAL_SLICE_UNIT = Object.freeze({
  id: 'lumi_protocol_vertical_slice',
  title: 'LUMI Protocol Vertical Slice',
  clusterId: 'python',
})

export default function LumiVerticalSliceExperience({ onBack }) {
  const { user } = useAuth()
  const [progress, setProgress] = useState(() => user?.uid ? null : {})

  useEffect(() => {
    let active = true
    if (!user?.uid) {
      return () => { active = false }
    }

    getDoc(doc(db, 'users', user.uid, 'learning_progress', VERTICAL_SLICE_UNIT.id))
      .then((snapshot) => {
        if (active) setProgress(snapshot.data()?.missionLab || {})
      })
      .catch((error) => {
        console.warn('Vertical Slice progress load failed:', error)
        if (active) setProgress({})
      })

    return () => { active = false }
  }, [user?.uid])

  if (progress === null) {
    return <div className="python-protocol-hub">탐사 기록을 불러오는 중입니다…</div>
  }

  return (
    <PythonMissionLab
      unit={VERTICAL_SLICE_UNIT}
      missionSet={getLumiVerticalSliceSet()}
      initialProgress={progress}
      onBack={onBack}
    />
  )
}
