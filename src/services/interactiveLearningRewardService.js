import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase'

const completeInteractiveLearningActivity = httpsCallable(functions, 'completeInteractiveLearningActivity')

export async function claimInteractiveLearningCompletion({ userId, activityId, completionKey, metrics = {} }) {
  if (!userId || userId === 'local-qa' || !auth.currentUser || auth.currentUser.uid !== userId) {
    return { skipped: true, reason: 'signed_out' }
  }
  const result = await completeInteractiveLearningActivity({ activityId, completionKey, metrics })
  return result.data || {}
}
