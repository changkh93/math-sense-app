/**
 * Durable storage adapters for Algorithm Constellation.
 * Production uses Firestore; tests use the explicit in-memory adapter.
 */

function clone(value) {
  return value == null ? value : structuredClone(value)
}

function createInMemoryAlgorithmStore() {
  const sessions = new Map()
  const journals = new Map()
  const progress = new Map()
  const attempts = new Map()
  const rewards = new Set()
  const returns = new Map()

  return {
    async createSession(session) {
      if (sessions.has(session.attemptId)) {
        const error = new Error('Attempt session already exists')
        error.code = 'ALREADY_EXISTS'
        throw error
      }
      sessions.set(session.attemptId, clone(session))
    },

    async getSession(attemptId) {
      return clone(sessions.get(attemptId) || null)
    },

    async updateSession(attemptId, mutate) {
      const current = sessions.get(attemptId)
      if (!current) throw new Error('Attempt session not found')
      const next = await mutate(clone(current))
      sessions.set(attemptId, clone(next))
      return clone(next)
    },

    async recordAssistance({ attemptId, uid, eventRecord, mutateSession }) {
      const current = sessions.get(attemptId)
      if (!current) throw new Error('Attempt session not found')
      const eventKey = `${attemptId}:${eventRecord.eventId}`
      if (journals.has(eventKey)) {
        return { duplicated: true, session: clone(current) }
      }
      const next = await mutateSession(clone(current))
      journals.set(eventKey, { ...clone(eventRecord), uid, attemptId })
      sessions.set(attemptId, clone(next))
      return { duplicated: false, session: clone(next) }
    },

    async getProgress(uid, problemId) {
      return clone(progress.get(`${uid}:${problemId}`) || null)
    },

    async getAllProgress(uid) {
      const userProgress = {}
      const prefix = `${uid}:`
      for (const [key, value] of progress.entries()) {
        if (key.startsWith(prefix)) {
          const problemId = key.slice(prefix.length)
          userProgress[problemId] = clone(value)
        }
      }
      return userProgress
    },

    async finalizeSuccessfulTransfer({
      attemptId,
      uid,
      expectedState,
      finalizedSession,
      attemptSnapshot,
      progressRecord,
      rewardKey,
      returnRecord,
    }) {
      const current = sessions.get(attemptId)
      if (!current) throw new Error('Attempt session not found')
      if (current.uid !== uid || current.state !== expectedState) {
        const error = new Error('Attempt changed before finalization')
        error.code = 'FAILED_PRECONDITION'
        throw error
      }

      const rewardCreated = !rewards.has(rewardKey)
      const previousProgress = progress.get(`${uid}:${progressRecord.problemId}`)
      const durableProgress = mergeProgress(previousProgress, progressRecord)

      sessions.set(attemptId, clone(finalizedSession))
      attempts.set(`${uid}:${attemptId}`, clone(attemptSnapshot))
      progress.set(`${uid}:${progressRecord.problemId}`, clone(durableProgress))
      rewards.add(rewardKey)
      if (returnRecord) returns.set(returnRecord.returnId, clone(returnRecord))

      return {
        progress: clone(durableProgress),
        rewardCreated,
      }
    },
  }
}

function createFirestoreAlgorithmStore({ db, FieldValue }) {
  if (!db || !FieldValue) throw new Error('Firestore and FieldValue are required')

  const sessionRef = (attemptId) => db.collection('algorithmAttemptSessions').doc(attemptId)
  const attemptRef = (uid, attemptId) => db.collection('users').doc(uid).collection('algorithmAttempts').doc(attemptId)
  const progressRef = (uid, problemId) => db.collection('users').doc(uid).collection('algorithmProgress').doc(problemId)

  return {
    async createSession(session) {
      await sessionRef(session.attemptId).create({
        ...clone(session),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    },

    async getSession(attemptId) {
      const snap = await sessionRef(attemptId).get()
      return snap.exists ? snap.data() : null
    },

    async updateSession(attemptId, mutate) {
      return db.runTransaction(async (tx) => {
        const ref = sessionRef(attemptId)
        const snap = await tx.get(ref)
        if (!snap.exists) throw new Error('Attempt session not found')
        const next = await mutate(snap.data())
        tx.set(ref, { ...next, updatedAt: FieldValue.serverTimestamp() }, { merge: false })
        return next
      })
    },

    async recordAssistance({ attemptId, uid, eventRecord, mutateSession }) {
      return db.runTransaction(async (tx) => {
        const sRef = sessionRef(attemptId)
        const eRef = attemptRef(uid, attemptId).collection('events').doc(eventRecord.eventId)
        const [sessionSnap, eventSnap] = await Promise.all([tx.get(sRef), tx.get(eRef)])
        if (!sessionSnap.exists) throw new Error('Attempt session not found')
        if (eventSnap.exists) return { duplicated: true, session: sessionSnap.data() }

        const next = await mutateSession(sessionSnap.data())
        tx.create(eRef, {
          ...clone(eventRecord),
          uid,
          attemptId,
          createdAt: FieldValue.serverTimestamp(),
        })
        tx.set(sRef, { ...next, updatedAt: FieldValue.serverTimestamp() }, { merge: false })
        return { duplicated: false, session: next }
      })
    },

    async getProgress(uid, problemId) {
      const snap = await progressRef(uid, problemId).get()
      return snap.exists ? snap.data() : null
    },

    async getAllProgress(uid) {
      const snap = await db.collection('users').doc(uid).collection('algorithmProgress')
        .select('problemId', 'bestStars', 'masteryStatus', 'nextReturnAt', 'masteryHoldReasons', 'lastFinalizedAtMs')
        .get()
      const userProgress = {}
      snap.forEach((doc) => {
        userProgress[doc.id] = doc.data()
      })
      return userProgress
    },

    async finalizeSuccessfulTransfer({
      attemptId,
      uid,
      expectedState,
      finalizedSession,
      attemptSnapshot,
      progressRecord,
      rewardKey,
      returnRecord,
    }) {
      return db.runTransaction(async (tx) => {
        const sRef = sessionRef(attemptId)
        const aRef = attemptRef(uid, attemptId)
        const pRef = progressRef(uid, progressRecord.problemId)
        const rRef = db.collection('algorithmRewardLedger').doc(rewardKey)
        const returnRef = returnRecord
          ? db.collection('algorithmReturnQueue').doc(returnRecord.returnId)
          : null

        const reads = [tx.get(sRef), tx.get(aRef), tx.get(pRef), tx.get(rRef)]
        if (returnRef) reads.push(tx.get(returnRef))
        const [sessionSnap, attemptSnap, progressSnap, rewardSnap] = await Promise.all(reads)

        if (!sessionSnap.exists) throw new Error('Attempt session not found')
        const current = sessionSnap.data()
        if (current.uid !== uid || current.state !== expectedState) {
          const error = new Error('Attempt changed before finalization')
          error.code = 'FAILED_PRECONDITION'
          throw error
        }

        tx.set(sRef, {
          ...clone(finalizedSession),
          finalizedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: false })
        if (!attemptSnap.exists) {
          tx.create(aRef, {
            ...clone(attemptSnapshot),
            finalizedAt: FieldValue.serverTimestamp(),
          })
        }
        const durableProgress = mergeProgress(
          progressSnap.exists ? progressSnap.data() : null,
          progressRecord
        )
        tx.set(pRef, {
          ...clone(durableProgress),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: false })
        if (!rewardSnap.exists) {
          tx.create(rRef, {
            rewardKey,
            uid,
            problemId: progressRecord.problemId,
            rewardType: 'exploration',
            createdAt: FieldValue.serverTimestamp(),
          })
        }
        if (returnRef) {
          tx.set(returnRef, {
            ...clone(returnRecord),
            createdAt: FieldValue.serverTimestamp(),
          }, { merge: false })
        }

        return { progress: durableProgress, rewardCreated: !rewardSnap.exists }
      })
    },
  }
}

function mergeProgress(previous, proposed) {
  if (!previous) return clone(proposed)
  const alreadyMastered = previous.masteryStatus === 'mastered'
  return {
    ...clone(previous),
    ...clone(proposed),
    bestStars: Math.max(previous.bestStars || 0, proposed.bestStars || 0),
    masteryStatus: alreadyMastered ? 'mastered' : proposed.masteryStatus,
    nextReturnAt: alreadyMastered ? null : proposed.nextReturnAt,
  }
}

module.exports = {
  createInMemoryAlgorithmStore,
  createFirestoreAlgorithmStore,
}
