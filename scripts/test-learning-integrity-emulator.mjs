import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import admin from 'firebase-admin';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, deleteField, setLogLevel } from 'firebase/firestore/lite';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8087') throw new Error('This test requires the isolated localhost:8087 emulator');
setLogLevel('silent');
const { prepareWorkbookPageCheckpoint, workbookSessionToken } = await import('../src/utils/workbookPersistence.js');
const require = createRequire(import.meta.url);
const { createLearningSummaryService } = require('../functions/learningSummaryService.cjs');
const { buildLearningSummaryFromScratch } = require('../functions/learningSummaryDomain.cjs');
const app = admin.initializeApp({ projectId: 'demo-metasense-integrity' }, 'integrity-test');
const db = app.firestore();
const uid = `student-${Date.now()}`;
const history = db.collection('users').doc(uid).collection('history');
const progress = db.collection('users').doc(uid).collection('learning_progress');
const summaryRef = db.collection('learningSummaries').doc(uid);
const service = createLearningSummaryService({ db, serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(), eventTimestamp: value => value });
let eventNumber = 0;
async function write(id, data) {
  const ref = history.doc(id), before = await ref.get();
  let result;
  if (data) result = await ref.set({ unitId: 'unit', timestamp: admin.firestore.Timestamp.now(), ...data });
  else result = await ref.delete();
  return { change: { before, after: await ref.get() }, context: { params: { uid, historyId: id }, eventId: `event-${++eventNumber}`, timestamp: result.writeTime } };
}
const send = event => service.sync(event.change, event.context);
async function assertTotals(label) {
  const [h, p, s] = await Promise.all([history.get(), progress.get(), summaryRef.get()]);
  const expected = buildLearningSummaryFromScratch(h.docs, p.docs), actual = s.data();
  assert.equal(actual.totalHistoryCount, expected.totalHistoryCount, label);
  assert.deepEqual(actual.stats, expected.stats, label);
  assert.deepEqual(actual.daily, expected.daily, label);
  for (const unit of expected.units) for (const [type, completed] of Object.entries(unit.modalities)) {
    if (completed) assert.equal(actual.units.find(u => u.unitId === unit.unitId)?.modalities[type], true, label);
  }
}
try {
  await progress.doc('unit').set({ logRead: true });
  const seed = await write('quiz', { type: 'quiz', score: 100 });
  await summaryRef.set({ schemaVersion: 3, units: [], totalHistoryCount: 77 });
  await send(seed); // old schema implementation must rebuild before applying deltas
  await assertTotals('legacy summary repair');
  await send(seed); await assertTotals('event already covered by rebuild');
  const text = await write('text', { type: 'text', crystalsEarned: 5 });
  await send(text); await assertTotals('ordinary event');
  await send(text); await assertTotals('duplicate event');

  const oldUpdate = await write('quiz', { type: 'quiz', score: 80 });
  const newUpdate = await write('quiz', { type: 'quiz', score: 90 });
  await send(newUpdate); await send(oldUpdate);
  await assertTotals('reverse delivery of updates');

  const create = await write('transient', { type: 'workbook', score: 100 });
  const remove = await write('transient', null);
  await send(remove); await send(create); await send(remove);
  await assertTotals('delete before create delivery and duplicate delete');

  const a = await write('parallel-a', { type: 'quiz', score: 50 });
  const b = await write('parallel-b', { type: 'workbook', score: 60 });
  await Promise.all([send(a), send(b)]);
  await assertTotals('concurrent independent events');
  const racing = await write('race', { type: 'video', crystalsEarned: 1 });
  await Promise.all([service.rebuild(uid), send(racing)]);
  await send(racing); await assertTotals('rebuild racing incremental event');

  // Index failure occurs before any write. Retrying must not consume an event or
  // apply the delta twice. Inject a transient read failure into a real transaction.
  const retryEvent = await write('retry', { type: 'workbook', score: 80 });
  let failOnce = true;
  const faultyDb = { collection: path => db.collection(path), runTransaction: callback => db.runTransaction(tx => callback({
    get: ref => {
      if (failOnce && ref.constructor.name === 'Query') { failOnce = false; throw new Error('simulated missing index'); }
      return tx.get(ref);
    }, set: (...args) => tx.set(...args),
  })) };
  const faulty = createLearningSummaryService({ db: faultyDb, serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(), eventTimestamp: value => value });
  await assert.rejects(faulty.sync(retryEvent.change, retryEvent.context), /missing index/);
  await send(retryEvent); await send(retryEvent); await assertTotals('failed query and retried delivery');

  const indexes = JSON.parse(readFileSync(new URL('../firestore.indexes.json', import.meta.url)));
  for (const field of ['unitId', 'chapterId', 'regionId']) {
    const config = indexes.fieldOverrides.find(x => x.collectionGroup === 'history' && x.fieldPath === field);
    for (const scope of ['COLLECTION', 'COLLECTION_GROUP']) assert.ok(config.indexes.some(x => x.queryScope === scope && x.order === 'ASCENDING'), `${field} ${scope} index must exist`);
  }

  // Page grading and rewards commit as a single unit, including retries after
  // a lost response. An abort cannot leave a paid page without its answers.
  const checkpointRef = progress.doc('atomic-page');
  const originalSession = { workbookSignature: 'p1', revision: 'initial', answers: {}, currentPageIndex: 0 };
  await checkpointRef.set({ workbookSession: originalSession, rewardCount: 0 });
  const pageRequest = { workbookSignature: 'p1', expectedWorkbookToken: workbookSessionToken(originalSession),
    workbookCheckpoint: { ...originalSession, revision: 'graded', answers: { e1: '6' }, checkedPages: { 0: true }, pageBaseRewardsPaid: 0, pageActualRewardsPaid: 0 } };
  const savePage = abort => db.runTransaction(async tx => {
    const row = (await tx.get(checkpointRef)).data();
    const next = prepareWorkbookPageCheckpoint(pageRequest, row.workbookSession, { baseAmount: 1, actualReward: 2 });
    tx.set(checkpointRef, { workbookSession: next }, { mergeFields: ['workbookSession'] });
    if (!row.rewardCount) tx.set(checkpointRef, { rewardCount: 1 }, { merge: true });
    if (abort) throw new Error('simulated interrupted page transaction');
  });
  await assert.rejects(savePage(true), /interrupted/);
  assert.deepEqual((await checkpointRef.get()).data(), { workbookSession: originalSession, rewardCount: 0 });
  await savePage(false); await savePage(false);
  const committed = (await checkpointRef.get()).data();
  assert.equal(committed.rewardCount, 1);
  assert.equal(committed.workbookSession.answers.e1, '6');
  assert.equal(committed.workbookSession.pageActualRewardsPaid, 2);
  const homeSource = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8');
  const playerSource = readFileSync(new URL('../src/components/Space/WorkbookPlayer.jsx', import.meta.url), 'utf8');
  assert.match(homeSource, /prepareWorkbookPageCheckpoint\(pageResult, freshProgressData.workbookSession, reward\)/);
  assert.match(homeSource, /const workbookCheckpoint = persistCheckpoint\(\{ baseAmount, actualReward \}\)/);
  assert.match(playerSource, /workbookCheckpoint,\s*expectedWorkbookToken:/);

  // Real security rules protect legacy browser writes, not only the new UI.
  await db.collection('users').doc(uid).set({ role: 'student' });
  const clientApp = initializeApp({ projectId: 'demo-metasense-integrity', apiKey: 'test' }, 'rules-test');
  try {
    const client = getFirestore(clientApp);
    connectFirestoreEmulator(client, '127.0.0.1', 8087, { mockUserToken: { sub: uid, user_id: uid } });
    const target = doc(client, 'users', uid, 'learning_progress', 'workbook');
    await setDoc(target, { workbookSession: { currentPageIndex: 8, answers: { e1: '6' }, checkedPages: { 0: true } }, workbookPageRewardTotal: 66 });
    await assert.rejects(setDoc(target, { workbookSession: { currentPageIndex: 0, answers: {}, checkedPages: {} } }, { merge: true }), error => error.code === 'permission-denied');
    assert.equal((await getDoc(target)).data().workbookSession.currentPageIndex, 8);
    await setDoc(target, { logRead: true }, { merge: true });
    await setDoc(target, { workbookSession: { currentPageIndex: 9, answers: { e1: '6', e2: '7' }, checkedPages: { 0: true } } }, { mergeFields: ['workbookSession'] });
    await assert.rejects(setDoc(target, { workbookSession: deleteField() }, { merge: true }), error => error.code === 'permission-denied');
    await setDoc(target, { workbookCompleted: true }, { merge: true });
    await setDoc(target, { workbookSession: deleteField() }, { merge: true });
    assert.equal((await getDoc(target)).data().workbookPageRewardTotal, 66);
    await assert.rejects(setDoc(doc(client, 'learningSummaries', uid, 'historySync', 'forged'), { eventId: 'fake' }), error => error.code === 'permission-denied');
  } finally { await deleteApp(clientApp); }
  console.log('PASS: real Firestore transactions — duplicate/reordered/concurrent events, rebuild races, failed-read retry, source completion, index contract, legacy overwrite denial and valid completion cleanup.');
} finally { await app.delete(); }
