const {
  LEARNING_SUMMARY_SCHEMA_VERSION, LEARNING_SUMMARY_MAX_DAYS,
  applyHistoryToDailyStats, historyActivityType, buildUnitLearningSummary, buildLearningSummaryFromScratch,
} = require('./learningSummaryDomain.cjs');

const SYNC_VERSION = 1;
const stampKey = stamp => stamp && Number.isFinite(stamp.seconds)
  ? `${stamp.seconds}:${String(stamp.nanoseconds || 0).padStart(9, '0')}` : null;
const atOrBefore = (left, right) => left && right && (
  left.seconds < right.seconds || (left.seconds === right.seconds && left.nanoseconds <= right.nanoseconds)
);

function updateStats(previous, before, after) {
  const stats = {
    quizAttempts: 0, quizScoreSum: 0, perfectAttempts: 0,
    workbookAttempts: 0, workbookScoreSum: 0, workbookPerfectAttempts: 0, darkMatterRecovered: 0,
    ...previous,
  };
  for (const [data, direction] of [[before, -1], [after, 1]]) {
    if (!data) continue;
    const type = historyActivityType(data);
    if (type === 'quiz') {
      stats.quizAttempts += direction;
      stats.quizScoreSum += direction * Number(data.score || 0);
      if (Number(data.score) === 100) stats.perfectAttempts += direction;
    } else if (type === 'workbook') {
      stats.workbookAttempts += direction;
      stats.workbookScoreSum += direction * Number(data.score || 0);
      if (Number(data.score) === 100) stats.workbookPerfectAttempts += direction;
    }
    if (String(data.unitId || '').includes('dark_matter') && Number(data.score || 0) >= 80) stats.darkMatterRecovered += direction;
  }
  return stats;
}

// Each normal event reconciles its exact predecessor once. Duplicate, delayed,
// reordered events and full rebuilds must never apply the same delta twice.
function createLearningSummaryService({ db, serverTimestamp, eventTimestamp }) {
  const refsFor = uid => ({
    summary: db.collection('learningSummaries').doc(uid),
    history: db.collection('users').doc(uid).collection('history'),
    progress: db.collection('users').doc(uid).collection('learning_progress'),
  });
  async function rebuildInTransaction(tx, refs, existing) {
    const [history, progress] = await Promise.all([tx.get(refs.history), tx.get(refs.progress)]);
    const next = buildLearningSummaryFromScratch(history.docs, progress.docs);
    // Completion is monotonic. A repair must not erase legitimate prior badges.
    const units = new Map((existing?.units || []).map(row => [row.unitId, row]));
    next.units.forEach(row => {
      const old = units.get(row.unitId);
      units.set(row.unitId, old ? {
        ...row, modalities: Object.fromEntries(Object.keys(row.modalities).map(type => [type, row.modalities[type] || old.modalities?.[type] === true])),
      } : row);
    });
    const result = {
      ...next, units: [...units.values()], syncVersion: SYNC_VERSION,
      sourceReadTime: history.readTime, generation: stampKey(history.readTime),
      updatedAt: serverTimestamp(),
    };
    if (!result.generation) throw new Error('Summary rebuild requires a consistent Firestore read timestamp');
    tx.set(refs.summary, result);
    return { ready: true, rebuilt: true };
  }
  async function rebuild(uid) {
    const refs = refsFor(uid);
    return db.runTransaction(async tx => {
      const existing = await tx.get(refs.summary);
      return rebuildInTransaction(tx, refs, existing.data());
    });
  }
  async function sync(change, context) {
    const refs = refsFor(context.params.uid);
    const historyRef = refs.history.doc(context.params.historyId);
    // Private projection bookkeeping; contains versions only, never student answers.
    const receiptRef = refs.summary.collection('historySync').doc(context.params.historyId);
    return db.runTransaction(async tx => {
      const [summarySnap, receiptSnap, currentSnap] = await Promise.all([
        tx.get(refs.summary), tx.get(receiptRef), tx.get(historyRef),
      ]);
      const summary = summarySnap.data();
      if (!summary || summary.schemaVersion !== LEARNING_SUMMARY_SCHEMA_VERSION || summary.syncVersion !== SYNC_VERSION || !summary.sourceReadTime) {
        return rebuildInTransaction(tx, refs, summary);
      }
      const occurredAt = change.after.exists ? change.after.updateTime : eventTimestamp(context.timestamp);
      if (!occurredAt) return rebuildInTransaction(tx, refs, summary);
      if (atOrBefore(occurredAt, summary.sourceReadTime)) return { ignored: 'covered-by-rebuild' };
      const receipt = receiptSnap.data();
      const currentReceipt = receipt?.generation === summary.generation ? receipt : null;
      if (currentReceipt?.eventId === context.eventId) return { ignored: 'duplicate' };
      const beforeVersion = change.before.exists ? stampKey(change.before.updateTime) : null;
      const afterVersion = change.after.exists ? stampKey(change.after.updateTime) : null;
      const sourceMatches = currentSnap.exists === change.after.exists &&
        (!currentSnap.exists || stampKey(currentSnap.updateTime) === afterVersion);
      const predecessorMatches = currentReceipt
        ? currentReceipt.sourceVersion === beforeVersion
        : (!change.before.exists || atOrBefore(change.before.updateTime, summary.sourceReadTime));
      if (!sourceMatches || !predecessorMatches) return rebuildInTransaction(tx, refs, summary);

      const before = change.before.exists ? change.before.data() : null;
      const after = currentSnap.exists ? currentSnap.data() : null;
      const unitIds = [...new Set([before?.unitId, after?.unitId].filter(Boolean))];
      const unitSources = await Promise.all(unitIds.map(async unitId => {
        const [history, progress] = await Promise.all([
          tx.get(refs.history.where('unitId', '==', unitId)), tx.get(refs.progress.doc(unitId)),
        ]);
        return { unitId, history: history.docs.map(row => row.data()), progress: progress.data() };
      }));
      const daily = new Map((summary.daily || []).map(row => [row.date, { ...row }]));
      applyHistoryToDailyStats(daily, before, -1);
      applyHistoryToDailyStats(daily, after, 1);
      const units = new Map((summary.units || []).map(row => [row.unitId, row]));
      unitSources.forEach(({ unitId, history, progress }) => {
        const next = buildUnitLearningSummary(unitId, history, progress, units.get(unitId));
        if (next) units.set(unitId, next);
      });
      tx.set(refs.summary, {
        ...summary,
        totalHistoryCount: Number(summary.totalHistoryCount || 0) + (after ? 1 : 0) - (before ? 1 : 0),
        daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-LEARNING_SUMMARY_MAX_DAYS),
        units: [...units.values()], stats: updateStats(summary.stats, before, after), updatedAt: serverTimestamp(),
      });
      tx.set(receiptRef, {
        generation: summary.generation, sourceVersion: afterVersion, eventId: context.eventId,
      });
      return { ready: true, rebuilt: false };
    });
  }
  return { rebuild, sync };
}
module.exports = { SYNC_VERSION, stampKey, atOrBefore, createLearningSummaryService };
