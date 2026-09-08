import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore/lite';

const oldSource = readFileSync(new URL('./fixtures/workbook-save-before-stability.txt', import.meta.url), 'utf8');
const signature = Array.from({ length: 10 }, (_, i) => `p${i + 1}`).join('|');
const realWork = { workbookSignature: signature, currentPageIndex: 8,
  answers: Object.fromEntries(Array.from({ length: 59 }, (_, i) => [`e${i}`, '6'])),
  checkedPages: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, true])), savedAtMs: 10 };
function legacy() {
  const effects = [], writes = [], timers = [];
  let completeRead;
  const context = {
    previewMode: false, progressHydrated: false, unitId: 'unit', workbookSignature: signature,
    progressStorageKey: 'cache', pages: Array.from({ length: 10 }, (_, i) => ({ id: `p${i+1}` })),
    currentPageIndex: 0, answers: {}, checkedElements: {}, checkedPages: {}, attemptCounts: {},
    firstAttemptCorrect: {}, wrongAnswerHistory: {}, sessionCrystals: 0, pageBaseRewardsPaid: 0, pageActualRewardsPaid: 0,
    savingPause: false, savingPageReward: false, isResultMode: false, autosaveTimerRef: { current: null },
    auth: { currentUser: { uid: 'synthetic-student' } }, db: {},
    useEffect: fn => effects.push(fn), localStorage: { getItem: () => null, setItem: () => {} },
    getDoc: () => new Promise((resolve, reject) => { completeRead = { resolve, reject }; }),
    doc: () => 'test-progress', setDoc: async (_ref, data, options) => writes.push({ data, options }),
    serverTimestamp: () => 1, setTimeout: fn => { timers.push(fn); return 1; }, clearTimeout: () => {},
    soundManager: { playClick: () => {} }, onClose: () => { context.closed = true; }, console: { warn: () => {}, error: () => {} },
  };
  for (const key of ['CurrentPageIndex','Answers','CheckedElements','CheckedPages','AttemptCounts','FirstAttemptCorrect','WrongAnswerHistory','SessionCrystals','PageBaseRewardsPaid','PageActualRewardsPaid','ProgressHydrated','SavingPause','PauseError']) {
    const field = key[0].toLowerCase() + key.slice(1);
    context[`set${key}`] = value => { context[field] = value; };
  }
  vm.createContext(context); vm.runInContext(oldSource, context);
  const cleanup = effects[0]();
  return { context, effects, writes, timers, completeRead, cleanup };
}
const earlyPause = legacy();
await earlyPause.context.pause();
assert.equal(earlyPause.context.closed, true);
assert.equal(earlyPause.writes[0].data.workbookSession.currentPageIndex, 0);
assert.equal(Object.keys(earlyPause.writes[0].data.workbookSession.answers).length, 0);
earlyPause.cleanup();
earlyPause.completeRead.resolve({ exists: () => true, data: () => ({ workbookSession: realWork }) });
await Promise.resolve();
assert.equal(earlyPause.context.currentPageIndex, 0, 'late restore is discarded after pause closes the screen');

const failedRead = legacy();
failedRead.completeRead.reject(new Error('server unavailable'));
for (let i = 0; i < 10; i++) await Promise.resolve();
assert.equal(failedRead.context.progressHydrated, true, 'old code incorrectly treats a failed read as successful empty hydration');
failedRead.effects[1](); await failedRead.timers[0]();
assert.equal(Object.keys(failedRead.writes[0].data.workbookSession.answers).length, 0);

// The actual Firebase SDK's masks prove that merge:true with {} deletes the
// prior answers/checkedPages maps. This is not just a visual reset or mock merge.
const app = initializeApp({ projectId: 'demo-workbook-loss', apiKey: 'test' }, 'workbook-loss');
const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 9);
const originalFetch = globalThis.fetch; let fields = {}; let mask = [];
globalThis.fetch = async (url, options) => {
  assert.equal(new URL(String(url)).origin, 'http://127.0.0.1:9');
  const body = JSON.parse(options.body);
  for (const write of body.writes) {
    if (!write.updateMask) fields = structuredClone(write.update.fields);
    else for (const path of (mask = write.updateMask.fieldPaths)) {
      const parts = path.split('.'); let target = fields, source = write.update.fields;
      for (const part of parts.slice(0, -1)) { target[part] ||= { mapValue: { fields: {} } }; target = target[part].mapValue.fields; source = source[part].mapValue.fields; }
      target[parts.at(-1)] = structuredClone(source[parts.at(-1)]);
    }
  }
  return new Response(JSON.stringify({ commitTime: '2026-09-08T00:00:00Z', writeResults: body.writes.map(() => ({ updateTime: '2026-09-08T00:00:00Z' })) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
try {
  const ref = doc(db, 'users', 'synthetic-student', 'learning_progress', 'unit');
  await setDoc(ref, { workbookSession: realWork, workbookPageRewardTotal: 66 });
  const captured = earlyPause.writes[0];
  await setDoc(ref, JSON.parse(JSON.stringify(captured.data)), JSON.parse(JSON.stringify(captured.options)));
  assert.ok(mask.includes('workbookSession.answers'));
  assert.deepEqual(fields.workbookSession.mapValue.fields.answers.mapValue.fields || {}, {});
  assert.equal(fields.workbookPageRewardTotal.integerValue, '66', 'reward evidence survives while the separate answer maps are erased, matching the incident');
} finally { globalThis.fetch = originalFetch; await deleteApp(app); }
console.log('REPRODUCED old loss paths: pause-before-hydration, failed-read-autosave, actual SDK empty-map overwrite with reward ledger preserved.');
