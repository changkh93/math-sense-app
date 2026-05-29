import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDoc,
  collection,
  doc,
  documentId,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  query
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase'
import { auth } from '../firebase'

const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 120]

function timestampMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (value.seconds) return value.seconds * 1000
  if (value._seconds) return value._seconds * 1000
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function splitTags(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function getNextReviewState(result, previous = {}) {
  const now = Date.now()
  const normalizedResult = ({
    unknown: 'again',
    known: 'good'
  }[result] || result)

  if (normalizedResult === 'again') {
    return {
      reviewCount: previous.reviewCount || 0,
      knowCount: previous.knowCount || 0,
      unknownCount: (previous.unknownCount || 0) + 1,
      intervalDays: 0,
      nextReviewAt: Timestamp.fromMillis(now + 10 * 60 * 1000),
      masteryLevel: 'needs_recheck',
      easeSignal: Math.max(130, (previous.easeSignal || 250) - 20)
    }
  }

  if (normalizedResult === 'hard') {
    const previousInterval = Number(previous.intervalDays || 0)
    const intervalDays = Math.max(1, Math.ceil(previousInterval * 0.8) || 1)
    return {
      reviewCount: (previous.reviewCount || 0) + 1,
      knowCount: previous.knowCount || 0,
      hardCount: (previous.hardCount || 0) + 1,
      unknownCount: previous.unknownCount || 0,
      intervalDays,
      nextReviewAt: Timestamp.fromMillis(now + intervalDays * 24 * 60 * 60 * 1000),
      masteryLevel: 'building',
      easeSignal: Math.max(130, (previous.easeSignal || 250) - 10)
    }
  }

  const stepBoost = normalizedResult === 'easy' ? 2 : 1
  const nextReviewCount = (previous.reviewCount || 0) + stepBoost
  const intervalIndex = Math.min(nextReviewCount - 1, REVIEW_INTERVALS_DAYS.length - 1)
  const intervalDays = REVIEW_INTERVALS_DAYS[intervalIndex]

  return {
    reviewCount: nextReviewCount,
    knowCount: (previous.knowCount || 0) + 1,
    easyCount: normalizedResult === 'easy' ? (previous.easyCount || 0) + 1 : (previous.easyCount || 0),
    unknownCount: previous.unknownCount || 0,
    intervalDays,
    nextReviewAt: Timestamp.fromMillis(now + intervalDays * 24 * 60 * 60 * 1000),
    masteryLevel: nextReviewCount >= 4 ? 'stable' : 'building',
    easeSignal: (previous.easeSignal || 250) + (normalizedResult === 'easy' ? 15 : 0)
  }
}

function sortByCreatedDesc(a, b) {
  return timestampMs(b.createdAt || b.updatedAt) - timestampMs(a.createdAt || a.updatedAt)
}

async function fetchCardsByIds(cardIds = []) {
  const uniqueIds = Array.from(new Set(cardIds.filter(Boolean)))
  if (uniqueIds.length === 0) return {}

  const cardMap = {}
  for (let i = 0; i < uniqueIds.length; i += 30) {
    const chunk = uniqueIds.slice(i, i + 30)
    const snap = await getDocs(query(collection(db, 'mistakeCards'), where(documentId(), 'in', chunk)))
    snap.docs.forEach(item => {
      cardMap[item.id] = { id: item.id, ...item.data() }
    })
  }
  return cardMap
}

export function useStudentMistakeNotebook(userId) {
  return useQuery({
    queryKey: ['mistakeNotebook', 'student', userId],
    enabled: !!userId,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const [uploadSnap, cardSnap, reviewSnap] = await Promise.all([
        getDocs(query(collection(db, 'mistakeUploads'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'mistakeCards'), where('userId', '==', userId))),
        getDocs(collection(db, 'users', userId, 'mistake_reviews'))
      ])

      const uploads = uploadSnap.docs.map(item => ({ id: item.id, ...item.data() })).sort(sortByCreatedDesc)
      const reviews = reviewSnap.docs.map(item => ({ id: item.id, ...item.data() }))
      const reviewMap = reviews.reduce((acc, item) => {
        acc[item.cardId || item.id] = item
        return acc
      }, {})
      const cards = cardSnap.docs
        .map(item => {
          const card = { id: item.id, ...item.data() }
          return { ...card, review: reviewMap[card.id] || null }
        })
        .filter(card => card.status !== 'archived')
        .sort((a, b) => {
          const aDue = timestampMs(a.review?.nextReviewAt)
          const bDue = timestampMs(b.review?.nextReviewAt)
          if (!aDue && bDue) return -1
          if (aDue && !bDue) return 1
          if (aDue !== bDue) return aDue - bDue
          return sortByCreatedDesc(a, b)
        })

      const now = Date.now()
      const dueCards = cards.filter(card => {
        const dueMs = timestampMs(card.review?.nextReviewAt)
        return !dueMs || dueMs <= now
      })
      const pendingUploads = uploads.filter(item => item.status === 'pending')

      return { uploads, pendingUploads, cards, dueCards, reviews }
    }
  })
}

export function useSubmitMistakeUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, user, userData, title, note, tags }) => {
      if (!file || !user?.uid) throw new Error('업로드할 이미지가 없습니다.')
      if (!file.type?.startsWith('image/')) throw new Error('이미지 파일만 업로드할 수 있습니다.')
      if (file.size > 12 * 1024 * 1024) throw new Error('이미지는 12MB 이하로 올려 주세요.')

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
      const path = `mistake-notes/${user.uid}/${Date.now()}_${safeName}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const imageUrl = await getDownloadURL(storageRef)

      const payload = {
        userId: user.uid,
        userName: userData?.studentName || user.displayName || user.email || '학생',
        imageUrl,
        imagePath: path,
        title: String(title || '').trim().slice(0, 120),
        note: String(note || '').trim().slice(0, 2000),
        tags: splitTags(tags),
        status: 'pending',
        source: 'student_upload',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const uploadRef = await addDoc(collection(db, 'mistakeUploads'), payload)
      return { id: uploadRef.id, ...payload }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mistakeNotebook', 'student', variables.user?.uid] })
      queryClient.invalidateQueries({ queryKey: ['mistakeNotebook', 'admin'] })
    }
  })
}

export function useReviewMistakeCard(userId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ card, result }) => {
      if (!userId || !card?.id) throw new Error('복습할 카드 정보가 없습니다.')
      if (!['known', 'unknown', 'again', 'hard', 'good', 'easy'].includes(result)) throw new Error('복습 결과가 올바르지 않습니다.')

      const previous = card.review || {}
      const nextState = getNextReviewState(result, previous)
      const normalizedResult = ({ unknown: 'again', known: 'good' }[result] || result)
      const reviewRef = doc(db, 'users', userId, 'mistake_reviews', card.id)
      await setDoc(reviewRef, {
        cardId: card.id,
        userId,
        result: normalizedResult,
        lastResult: normalizedResult,
        lastReviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...nextState
      }, { merge: true })

      await setDoc(doc(db, 'mistakeCards', card.id), {
        lastReviewedAt: serverTimestamp(),
        lastReviewResult: normalizedResult
      }, { merge: true })

      return { cardId: card.id, result: normalizedResult, nextState }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mistakeNotebook', 'student', userId] })
    }
  })
}

export function useAdminMistakeUploads(status = 'pending') {
  return useQuery({
    queryKey: ['mistakeNotebook', 'admin', 'uploads', status],
    staleTime: 1000 * 20,
    queryFn: async () => {
      const snap = status === 'all'
        ? await getDocs(collection(db, 'mistakeUploads'))
        : await getDocs(query(collection(db, 'mistakeUploads'), where('status', '==', status)))

      const uploads = snap.docs.map(item => ({ id: item.id, ...item.data() })).sort(sortByCreatedDesc)
      const cardMap = await fetchCardsByIds(uploads.map(item => item.cardId))

      return uploads.map(upload => ({
        ...upload,
        card: upload.cardId ? cardMap[upload.cardId] || null : null
      }))
    }
  })
}

export function useCreateMistakeCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ upload, form }) => {
      if (!upload?.id) throw new Error('업로드 기록을 선택해 주세요.')
      if (!String(form.answer || '').trim()) throw new Error('정답을 입력해 주세요.')
      if (!String(form.explanation || '').trim()) throw new Error('해설을 입력해 주세요.')

      const payload = {
        userId: upload.userId,
        userName: upload.userName || '',
        sourceUploadId: upload.id,
        imageUrl: upload.imageUrl,
        imagePath: upload.imagePath || '',
        questionTitle: String(form.questionTitle || upload.title || '나의 오답 카드').trim().slice(0, 140),
        answer: String(form.answer || '').trim(),
        explanation: String(form.explanation || '').trim(),
        concept: String(form.concept || '').trim().slice(0, 120),
        tags: splitTags(form.tags || upload.tags?.join?.(',') || ''),
        difficulty: form.difficulty || 'normal',
        status: 'active',
        updatedAt: serverTimestamp()
      }
      if (!upload.cardId) {
        payload.createdBy = auth.currentUser?.uid || ''
        payload.createdAt = serverTimestamp()
      }

      const cardRef = upload.cardId
        ? doc(db, 'mistakeCards', upload.cardId)
        : doc(collection(db, 'mistakeCards'))

      await setDoc(cardRef, payload, { merge: true })
      await updateDoc(doc(db, 'mistakeUploads', upload.id), {
        status: 'card_created',
        cardId: cardRef.id,
        reviewedBy: auth.currentUser?.uid || '',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      return { id: cardRef.id, ...payload }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mistakeNotebook', 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['mistakeNotebook', 'student', variables.upload?.userId] })
    }
  })
}

export function useArchiveMistakeUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ uploadId }) => {
      if (!uploadId) throw new Error('보관할 업로드를 선택해 주세요.')
      await updateDoc(doc(db, 'mistakeUploads', uploadId), {
        status: 'archived',
        archivedBy: auth.currentUser?.uid || '',
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return { uploadId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mistakeNotebook', 'admin'] })
    }
  })
}
