import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { getPythonMissionSetForUnit } from '../components/PythonWorld/pythonMissionCatalog'

export function usePythonMissionSet(unit, clusterId = '') {
  const builtin = getPythonMissionSetForUnit(unit, clusterId)
  const requestedSetId = unit?.pythonMissionSetId || unit?.missionLab?.setId || ''
  const shouldFetch = Boolean(requestedSetId && (!builtin || builtin.id !== requestedSetId))

  const query = useQuery({
    queryKey: ['python-mission-set', requestedSetId],
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const snapshot = await getDoc(doc(db, 'pythonMissionSets', requestedSetId))
      if (!snapshot.exists()) throw new Error('연결된 Mission Lab 콘텐츠를 찾을 수 없습니다.')
      const data = snapshot.data()
      if (data.status !== 'published') throw new Error('아직 발행되지 않은 Mission Lab 콘텐츠입니다.')
      return { id: snapshot.id, ...data }
    },
  })

  return {
    missionSet: shouldFetch ? query.data || null : builtin,
    isLoading: shouldFetch && query.isLoading,
    error: shouldFetch ? query.error : null,
  }
}
