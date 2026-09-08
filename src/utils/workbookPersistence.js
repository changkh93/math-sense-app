// A pristine mount is not a student edit. Never let it replace a saved workbook.
export function hasWorkbookWork(session) {
  return !!session && (Number(session.currentPageIndex) > 0 ||
    Object.keys(session.answers || {}).length > 0 ||
    Object.values(session.checkedPages || {}).some(Boolean));
}

export function workbookSessionToken(session) {
  return session ? (session.revision || `${session.workbookSignature}:${session.savedAtMs || 0}`) : null;
}

export function selectWorkbookSession(sessions, signature) {
  const matching = sessions.filter(s => s?.workbookSignature === signature);
  // A newer empty snapshot must not hide real work from another cache/backup.
  const work = matching.filter(hasWorkbookWork);
  return (work.length ? work : matching).sort((a, b) => Number(b.savedAtMs || 0) - Number(a.savedAtMs || 0))[0] || null;
}

export function resolveWorkbookRestore(local, server, signature) {
  const conflict = !!local && Object.hasOwn(local, 'baseToken') &&
    local.baseToken !== workbookSessionToken(server) &&
    workbookSessionToken(local) !== workbookSessionToken(server);
  return { session: selectWorkbookSession(conflict ? [server] : [local, server], signature), conflict };
}

export function assertWorkbookWriteAllowed(remote, expectedToken, next) {
  if (workbookSessionToken(remote) !== expectedToken) {
    throw new Error('다른 창이나 기기에서 진행 기록이 바뀌었습니다. 이 창의 내용은 보관했습니다. 다시 열어 최신 기록을 확인해 주세요.');
  }
  if (hasWorkbookWork(remote) && !hasWorkbookWork(next)) {
    throw new Error('빈 페이지로 기존 학습 기록을 덮어쓸 수 없습니다.');
  }
}

// I/O is injected so failures, overlapping saves and unmount flushes can be tested.
export function createWorkbookSaveQueue({ saveLocal, saveRemote, initialSession = null, onStatus = () => {} }) {
  let latest = initialSession;
  let acknowledged = initialSession;
  let inFlight = null;
  let stopped = false;
  let localSaved = false;
  const stage = (session) => {
    if (stopped) return;
    latest = session;
    try { saveLocal(session); localSaved = true; } catch { localSaved = false; }
    onStatus({ state: 'pending', localSaved });
  };
  const flush = () => {
    if (stopped || !latest || latest === acknowledged) return Promise.resolve();
    if (inFlight) return inFlight;
    inFlight = Promise.resolve().then(async () => {
      try {
        while (!stopped && latest !== acknowledged) {
          const captured = latest;
          onStatus({ state: 'saving', localSaved });
          await saveRemote(captured);
          acknowledged = captured;
          // If an edit arrived during this commit, its local base must advance
          // to our newly acknowledged version before a subsequent offline retry.
          if (latest !== captured) {
            try { saveLocal(latest); localSaved = true; } catch { localSaved = false; }
          }
        }
        onStatus({ state: 'saved', localSaved });
      } catch (error) {
        onStatus({ state: 'error', localSaved, message: error.message });
        throw error;
      } finally { inFlight = null; }
    });
    return inFlight;
  };
  const acceptCommitted = session => {
    latest = acknowledged = session;
    try { saveLocal(session); localSaved = true; } catch { localSaved = false; }
    onStatus({ state: 'saved', localSaved });
  };
  return { stage, flush, acceptCommitted, getSession: () => latest, stop: () => { stopped = true; }, isDirty: () => latest !== acknowledged };
}

// Called inside the existing page-reward transaction. Answer/grade checkpoint
// and reward receipt commit together, including idempotent reward retries.
export function prepareWorkbookPageCheckpoint(pageResult, remote, reward) {
  const checkpoint = pageResult.workbookCheckpoint;
  if (!checkpoint) return null; // Legacy clients/legacy session settlement.
  if (checkpoint.workbookSignature !== pageResult.workbookSignature || !checkpoint.revision) {
    throw new Error('워크북 저장 정보가 일치하지 않습니다.');
  }
  if (remote?.revision === checkpoint.revision) return remote;
  assertWorkbookWriteAllowed(remote || null, pageResult.expectedWorkbookToken, checkpoint);
  return {
    ...checkpoint,
    pageBaseRewardsPaid: Number(checkpoint.pageBaseRewardsPaid || 0) + Number(reward.baseAmount || 0),
    pageActualRewardsPaid: Number(checkpoint.pageActualRewardsPaid || 0) + Number(reward.actualReward || 0),
  };
}
