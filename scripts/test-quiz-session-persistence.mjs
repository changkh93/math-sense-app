import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore/lite'
import { writeQuizProgressSnapshot } from '../src/utils/quizSessionPersistence.js'
import { validateQuizCompletionSnapshot } from '../src/utils/quizSessionGuards.js'

// Exercise the real SDK's serialized write masks, with an in-memory commit
// endpoint. No credentials, production reads/writes, or network are used.
const app = initializeApp({ projectId: 'demo-quiz-session-regression', apiKey: 'test-only' }, 'quiz-regression')
const db = getFirestore(app)
connectFirestoreEmulator(db, '127.0.0.1', 9)
const progressRef = doc(db, 'users', 'test-student', 'learning_progress', 'dark_matter_zone')
const originalFetch = globalThis.fetch
let storedFields = {}
let lastMask = []

const decode = (value) => {
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, entry]) => [key, decode(entry)]))
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode)
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  return value.stringValue
}
const readStored = () => decode({ mapValue: { fields: storedFields } })

globalThis.fetch = async (url, options) => {
  const requestUrl = new URL(String(url))
  assert.equal(requestUrl.origin, 'http://127.0.0.1:9')
  assert.ok(requestUrl.pathname.endsWith('documents:commit'))
  const body = JSON.parse(options.body)
  for (const write of body.writes) {
    assert.ok(write.update, 'Only fixture document writes are expected')
    lastMask = write.updateMask?.fieldPaths || []
    if (!write.updateMask) {
      storedFields = structuredClone(write.update.fields)
      continue
    }
    for (const fieldPath of lastMask) {
      const path = fieldPath.split('.')
      let target = storedFields
      let source = write.update.fields
      for (const part of path.slice(0, -1)) {
        target[part] ||= { mapValue: { fields: {} } }
        target = target[part].mapValue.fields
        source = source[part].mapValue.fields
      }
      const leaf = path.at(-1)
      if (source[leaf] === undefined) delete target[leaf]
      else target[leaf] = structuredClone(source[leaf])
    }
  }
  return new Response(JSON.stringify({
    commitTime: '2026-09-02T00:00:00.000000Z',
    writeResults: body.writes.map(() => ({ updateTime: '2026-09-02T00:00:00.000000Z' })),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

try {
  const owner = { sessionId: 'session-a', clientInstanceId: 'tab-a' }
  const currentAnswer = { text: 'sqrt(2)', isCorrect: true, reactionId: 'understood' }
  const staleAnswers = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`old_q${i}`, { isCorrect: i < 4 }]))
  const contaminatedSession = {
    ...owner, originalTotal: 1, retryCount: 1, firstPassScore: 0, isResultMode: true,
    userAnswers: { ...staleAnswers, current_q: currentAnswer },
  }
  const expectedCompletion = {
    ...owner, questionIds: ['current_q'], totalCount: 1, correctCount: 1, score: 100,
  }
  const normalizedSession = { ...contaminatedSession, userAnswers: { current_q: currentAnswer } }
  await setDoc(progressRef, { quizSession: contaminatedSession, quizAttemptCount: 65, workbookCompleted: true })

  // Regression: recursive merging leaves six old answers even after another save.
  await setDoc(progressRef, { quizSession: normalizedSession }, { merge: true })
  assert.equal(Object.keys(readStored().quizSession.userAnswers).length, 7)
  assert.equal(validateQuizCompletionSnapshot({ ...expectedCompletion, session: readStored().quizSession }).reason, 'answer_count_mismatch')

  // The same write helper is used by initialization, answer saves and exit saves.
  const writer = { set: setDoc }
  await writeQuizProgressSnapshot(writer, progressRef, {
    quizSession: normalizedSession, unitId: 'dark_matter_zone', updatedAt: 1,
  })
  assert.ok(lastMask.includes('quizSession'), 'The SDK must replace the entire session map')
  assert.ok(lastMask.every(path => !path.startsWith('quizSession.')))
  assert.deepEqual(readStored().quizSession, normalizedSession)
  assert.equal(readStored().quizAttemptCount, 65, 'Unrelated progress must remain intact')
  assert.equal(readStored().workbookCompleted, true)
  assert.equal(validateQuizCompletionSnapshot({ ...expectedCompletion, session: readStored().quizSession }).ok, true)
  assert.equal(validateQuizCompletionSnapshot({ ...expectedCompletion, clientInstanceId: 'another-tab', session: readStored().quizSession }).reason, 'session_owner_mismatch')

  // A removed retry answer (and its reaction) must not reappear via a nested merge.
  await writeQuizProgressSnapshot(writer, progressRef, { quizSession: { ...normalizedSession, userAnswers: {}, isResultMode: false } })
  assert.deepEqual(readStored().quizSession.userAnswers, {})
  await writeQuizProgressSnapshot(writer, progressRef, { quizSession: { ...normalizedSession, userAnswers: { current_q: { isCorrect: false } } } })
  assert.deepEqual(readStored().quizSession.userAnswers.current_q, { isCorrect: false })

  const beforeAudit = readStored().quizSession
  await writeQuizProgressSnapshot(writer, progressRef, { updatedAt: 2, quizSessionGuardAudit: { event: 'focus' } })
  assert.deepEqual(readStored().quizSession, beforeAudit, 'Audit-only updates must leave the session untouched')
  console.log('quiz session persistence regression tests passed (mock transport, real SDK write masks)')
} finally {
  globalThis.fetch = originalFetch
  await deleteApp(app)
}
