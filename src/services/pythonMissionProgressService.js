import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { buildMissionLabCompletion } from '../utils/pythonMissionProgressUtils.js'

export async function recordMissionLabCompletion({
  userId,
  unitId,
  unitTitle = '',
  missionSet,
  missionId,
  stars = 0,
  assistanceLevel = 0,
}) {
  if (!userId || !unitId || !missionSet?.id || !missionId) {
    return { completionRecorded: false, reason: 'missing_args' }
  }

  const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
  try {
    return await runTransaction(db, async (transaction) => {
      const progressSnap = await transaction.get(progressRef)
      const progressData = progressSnap.exists() ? progressSnap.data() : {}
      const timestamp = serverTimestamp()
      const missionLab = buildMissionLabCompletion({
        existingMissionLab: progressData.missionLab || {},
        missionSet,
        missionId,
        stars,
        assistanceLevel,
        timestamp,
      })
      if (!missionLab) {
        return { completionRecorded: false, reason: 'mission_not_in_set' }
      }

      transaction.set(progressRef, {
        unitId,
        unitTitle,
        clusterId: 'python',
        updatedAt: timestamp,
        missionLab,
      }, { merge: true })

      return {
        completionRecorded: true,
        completedMissionCount: missionLab.completedMissionCount,
        totalMissionCount: missionLab.totalMissionCount,
        completed: missionLab.completed,
      }
    })
  } catch (error) {
    console.error('Mission Lab completion transaction error:', error)
    return {
      completionRecorded: false,
      reason: 'transaction_failed',
      error: error?.message || 'transaction_failed',
    }
  }
}
