import { useCallback, useRef, useState } from 'react'
import { claimInteractiveLearningCompletion } from '../services/interactiveLearningRewardService'

const INITIAL_STATE = { status: 'idle', amount: 0, message: '' }

export function useInteractiveLearningReward(userId) {
  const [rewardState, setRewardState] = useState(INITIAL_STATE)
  const inFlightRef = useRef(new Set())
  const viewVersionRef = useRef(0)

  const claimCompletion = useCallback(async ({ activityId, completionKey, metrics }) => {
    const requestKey = `${activityId}:${completionKey}`
    if (inFlightRef.current.has(requestKey)) return
    inFlightRef.current.add(requestKey)
    const viewVersion = viewVersionRef.current
    setRewardState({ status: 'loading', amount: 0, message: '광석을 담고 있어요…' })
    try {
      const result = await claimInteractiveLearningCompletion({ userId, activityId, completionKey, metrics })
      if (viewVersionRef.current !== viewVersion) return
      if (result.skipped) {
        setRewardState(INITIAL_STATE)
      } else if (result.alreadyRewarded) {
        setRewardState({ status: 'already', amount: 0, message: '이 항목의 광석은 이미 받았어요. 다시 연습한 성취도 기록했어요!' })
      } else {
        setRewardState({ status: 'earned', amount: Number(result.crystalsEarned || 0), message: '정답! 광석을 바로 받았어요!' })
      }
    } catch (error) {
      console.error('Interactive learning reward failed:', error)
      if (viewVersionRef.current === viewVersion) {
        setRewardState({ status: 'error', amount: 0, message: '학습은 완료했어요. 기록 저장은 잠시 뒤 다시 시도해 주세요.' })
      }
    } finally {
      inFlightRef.current.delete(requestKey)
    }
  }, [userId])

  const resetRewardState = useCallback(() => {
    viewVersionRef.current += 1
    setRewardState(INITIAL_STATE)
  }, [])
  return { claimCompletion, rewardState, resetRewardState }
}
