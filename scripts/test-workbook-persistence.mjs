import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { createWorkbookSaveQueue, assertWorkbookWriteAllowed, hasWorkbookWork, selectWorkbookSession, resolveWorkbookRestore, workbookSessionToken } from '../src/utils/workbookPersistence.js';
import { getLearningProgressCompletion, mergeUnitProgressCompletion } from '../src/utils/learningSummaryUtils.js';

const saved = { workbookSignature: 'p1|p2', currentPageIndex: 1, answers: { e1: '3' }, checkedPages: { 0: true }, savedAtMs: 10 };
const blank = { workbookSignature: 'p1|p2', currentPageIndex: 0, answers: {}, savedAtMs: 20 };
assert.equal(selectWorkbookSession([blank, saved], 'p1|p2'), saved, 'newer blank cache cannot hide server work');
assert.equal(selectWorkbookSession([saved], 'changed'), null, 'do not transplant answers onto another workbook');
assert.throws(() => assertWorkbookWriteAllowed(saved, workbookSessionToken(saved), blank), /빈 페이지/);
assert.throws(() => assertWorkbookWriteAllowed(saved, 'different-tab', saved), /다른 창/);
assert.equal(resolveWorkbookRestore({ ...saved, baseToken: 'old', revision: 'local', savedAtMs: 999 }, { ...saved, revision: 'another-device' }, saved.workbookSignature).session.revision, 'another-device', 'reopening a conflicted local draft must not overwrite newer server work');
assert.doesNotThrow(() => assertWorkbookWriteAllowed(saved, workbookSessionToken(saved), { ...saved, revision: 'new' }));

const writes = [];
const statuses = [];
const queue = createWorkbookSaveQueue({
  saveLocal: () => { throw new Error('QuotaExceededError'); },
  saveRemote: session => new Promise((resolve, reject) => writes.push({ session, resolve, reject })),
  onStatus: status => statuses.push(status),
});
queue.stage(saved);
const first = queue.flush();
await Promise.resolve();
assert.equal(writes.length, 1, 'storage quota must not block cloud writes');
const newer = { ...saved, answers: { e1: '4' }, savedAtMs: 30 };
queue.stage(newer);
const overlapping = queue.flush();
assert.equal(writes.length, 1);
writes[0].resolve();
await Promise.resolve();
assert.equal(writes.length, 2, 'pause/unmount must drain changes arriving during an earlier write');
writes[1].resolve();
await Promise.all([first, overlapping]);
assert.equal(queue.isDirty(), false);
assert.equal(statuses.at(-1).state, 'saved');
assert.equal(statuses.at(-1).localSaved, false);
queue.stage({ ...newer, currentPageIndex: 2 });
const failed = queue.flush();
await Promise.resolve();
writes[2].reject(new Error('offline'));
await assert.rejects(failed, /offline/);
assert.equal(queue.isDirty(), true);
assert.equal(statuses.at(-1).state, 'error');
const retry = queue.flush();
await Promise.resolve();
writes[3].resolve();
await retry;
queue.stop();
queue.stage(blank);
await queue.flush();
assert.equal(writes.length, 4, 'completed/unmounted writer must not resurrect a draft after stop');

// Execute the actual production hydration/autosave/pause effects with synthetic I/O.
// This tests the component wiring, not a reimplementation of its save handlers.
const source = readFileSync(new URL('../src/components/Space/WorkbookPlayer.jsx', import.meta.url), 'utf8');
const effectSource = source.slice(source.indexOf('  useEffect(() => {\n    if (previewMode)'), source.indexOf('  const handlePauseWorkbook'));
const pauseSource = source.slice(source.indexOf('  const handlePauseWorkbook'), source.indexOf('  const checkAnswer')) + '\n globalThis.pause = handlePauseWorkbook;';
async function harness({ remote = saved, local = blank, readError = false, storageError = false } = {}) {
  const effects = [];
  const store = new Map([['cache', JSON.stringify(local)]]);
  const timers = [];
  const remoteWrites = [];
  const context = {
    previewMode: false, unitId: 'unit', userId: 'student', user: { uid: 'student' },
    auth: { currentUser: { uid: 'student' } }, unitTitle: 'Workbook', db: {}, pages: [{ id: 'p1' }, { id: 'p2' }],
    workbookSignature: 'p1|p2', progressStorageKey: 'cache', restoreAttempt: 0,
    currentPageIndex: 0, answers: {}, checkedElements: {}, checkedPages: {}, attemptCounts: {}, firstAttemptCorrect: {}, wrongAnswerHistory: {},
    sessionCrystals: 0, pageBaseRewardsPaid: 0, pageActualRewardsPaid: 0, isResultMode: false, progressHydrated: false,
    savingPause: false, savingPageReward: false, savingCompletion: false,
    autosaveTimerRef: { current: null }, saveQueueRef: { current: null }, savedContentRef: { current: null }, acceptCheckpointRef: { current: null },
    createWorkbookSaveQueue, assertWorkbookWriteAllowed, hasWorkbookWork, selectWorkbookSession, resolveWorkbookRestore, workbookSessionToken,
    useEffect: callback => effects.push(callback),
    getDocFromServer: async () => { if (readError) throw new Error('offline'); return { exists: () => true, data: () => ({ workbookSession: remote }) }; },
    doc: (...parts) => parts.slice(1).join('/'), serverTimestamp: () => 'server-time', deleteField: () => null,
    runTransaction: async (_db, callback) => {
      if (context.failWrites) throw new Error('offline');
      return callback({
      get: async () => ({ data: () => ({ workbookSession: remote }) }),
      set: (_ref, value, options) => {
        assert.deepEqual(Array.from(options.mergeFields), ['workbookSession', 'workbookSessionUpdatedAt']);
        remoteWrites.push(value.workbookSession); remote = value.workbookSession;
      },
    }); },
    localStorage: { getItem: key => store.get(key), removeItem: key => store.delete(key), setItem: (key, value) => { if (storageError) throw new Error('quota'); store.set(key, value); } },
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout: () => {},
    window: { addEventListener: () => {}, removeEventListener: () => {} }, document: { addEventListener: () => {}, removeEventListener: () => {} },
    console: { warn: () => {}, error: () => {} }, crypto: { randomUUID },
    soundManager: { playClick: () => {}, playWarp: () => {} }, onClose: () => { context.closed = true; },
  };
  for (const key of ['CurrentPageIndex','Answers','CheckedElements','CheckedPages','AttemptCounts','FirstAttemptCorrect','WrongAnswerHistory','SessionCrystals','PageBaseRewardsPaid','PageActualRewardsPaid','PageRewardError','ProgressHydrated','RestoreError','SaveStatus','SavingPause','PauseError','SavingCompletion','CompletionError']) {
    const stateKey = key[0].toLowerCase() + key.slice(1);
    context[`set${key}`] = value => { context[stateKey] = typeof value === 'function' ? value(context[stateKey]) : value; };
  }
  vm.createContext(context);
  vm.runInContext(effectSource + pauseSource, context);
  const cleanup = effects[0]();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  return { context, effects, remoteWrites, cleanup, timers };
}
const loaded = await harness();
assert.equal(loaded.context.progressHydrated, true);
assert.equal(loaded.context.currentPageIndex, 1);
loaded.effects[1]();
assert.equal(loaded.remoteWrites.length, 0, 'mount/hydration cannot replace or retimestamp server work');
loaded.context.answers = { e1: '6' };
loaded.effects[1]();
assert.equal(loaded.remoteWrites.length, 0, 'autosave is debounced until flush');
await loaded.context.pause();
assert.equal(loaded.context.closed, true);
assert.equal(loaded.remoteWrites.at(-1).answers.e1, '6', '오늘은 여기까지 persists the current answer before closing');
assert.equal(loaded.remoteWrites.at(-1).currentPageIndex, 1);

const unavailable = await harness({ readError: true });
assert.equal(unavailable.context.progressHydrated, false, 'do not expose editable empty state after failed hydration');
unavailable.effects[1]();
await unavailable.context.pause();
assert.equal(unavailable.context.closed, undefined);
assert.equal(unavailable.remoteWrites.length, 0);

const failedPause = await harness();
failedPause.effects[1]();
failedPause.context.failWrites = true;
await failedPause.context.pause();
assert.equal(failedPause.context.closed, undefined);
assert.equal(failedPause.context.pauseError, 'offline');
failedPause.context.failWrites = false;
await failedPause.context.saveQueueRef.current.flush();
assert.equal(failedPause.context.saveStatus.state, 'saved');
assert.equal(failedPause.context.pauseError, '', 'successful retry clears the stale pause error');

const quota = await harness({ storageError: true });
quota.effects[1]();
quota.context.answers = { e1: 'quota answer' };
quota.effects[1]();
await quota.context.pause();
assert.equal(quota.context.closed, true, 'pause still saves remotely when local storage is unavailable');
assert.equal(quota.remoteWrites.at(-1).answers.e1, 'quota answer');

const unmount = await harness();
unmount.effects[1]();
unmount.context.answers = { e1: 'last edit' };
unmount.effects[1]();
unmount.cleanup();
for (let i = 0; i < 10; i++) await Promise.resolve();
assert.equal(unmount.remoteWrites.at(-1).answers.e1, 'last edit', 'unmount flushes a pending debounced edit');

const accountSwitch = await harness();
accountSwitch.effects[1]();
accountSwitch.context.answers = { e1: 'private' };
accountSwitch.effects[1]();
accountSwitch.context.auth.currentUser = { uid: 'other-student' };
await accountSwitch.context.pause();
assert.equal(accountSwitch.remoteWrites.length, 0);
assert.equal(accountSwitch.context.closed, undefined);

// The reported stale summary: quiz, workbook and video were present, text was omitted.
const completion = mergeUnitProgressCompletion({ unit: { quiz: true, workbook: true, video: true, text: false } },
  { unit: getLearningProgressCompletion({ logRead: true }) });
assert.equal(completion.unit.text, true);
assert.equal(completion.unit.quiz, true);
const partial = getLearningProgressCompletion({ workbookSession: saved, workbookPageRewardAttempts: { page: {} } });
assert.equal(partial.workbook, false, 'page rewards and drafts are not full completion');
assert.equal(getLearningProgressCompletion({ workbookCompleted: true }).workbook, true);
let syncAttempts = 0;
const syncFailure = createWorkbookSaveQueue({ saveLocal: () => {}, saveRemote: () => { if (++syncAttempts === 1) throw new Error('sync failure'); } });
syncFailure.stage(saved);
await assert.rejects(syncFailure.flush(), /sync failure/);
await syncFailure.flush();
assert.equal(syncAttempts, 2, 'synchronous transport errors must not wedge the queue forever');

const final = await harness();
final.effects[1]();
final.context.answers = { e1: '6', e2: '6' };
final.effects[1]();
final.context.pages = [{ id: 'p1', elements: [{ id: 'e1', type: 'input' }] }, { id: 'p2', elements: [{ id: 'e2', type: 'input' }] }];
final.context.WORKBOOK_GRADABLE_TYPES = new Set(['input']);
final.context.WORKBOOK_INTERACTION_TYPES = new Set();
final.context.serializeWorkbookResponse = String;
final.context.onComplete = async () => { final.cleanup(); return { ok: true }; };
const completionSource = source.slice(source.indexOf('  const completeWorkbook'), source.indexOf("  // Pull the current page")) + '\n globalThis.complete = completeWorkbook;';
vm.runInContext(completionSource, final.context);
await final.context.complete();
assert.equal(final.context.completionError, '');
assert.equal(final.remoteWrites.at(-1), null, 'parent unmount during onComplete must still clean the captured draft');

console.log('Workbook persistence: queue failures/retries, production hydrate/pause/unmount, account isolation and completion regression passed.');
