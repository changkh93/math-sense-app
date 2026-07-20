import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  Clock3,
  Database,
  LoaderCircle,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { functions } from '../../firebase';
import './GalaxyLearningLedgerBackfill.css';

const STEP_TIMEOUT_MS = 330000;
const AUTO_STEP_LIMIT = 100;
const RESUMABLE_JOB_STATUSES = new Set(['queued', 'running', 'failed', 'paused']);
const USER_STATUS_LABELS = {
  complete: '완료',
  in_progress: '진행 중',
  not_started: '미시작',
};
const JOB_STATUS_LABELS = {
  queued: '다음 배치 · 재개 대기',
  running: '배치 실행 중',
  failed: '오류 · 재개 가능',
  paused: '일시 중지',
  completed: '완료',
  cancelled: '종료됨 · 원장 유지',
};
const STOP_REASON_LABELS = {
  completed: '전체 완료',
  user_budget: '사용자 배치 한도',
  page_budget: '원장 페이지 배치 한도',
  per_user_page_budget: '한 학생의 페이지 한도',
  queued: '다음 배치 대기',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(Math.max(0, Number(value || 0)));
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

function getErrorMessage(error) {
  if (error?.message === 'internal' || error?.code === 'functions/internal') {
    return '관리자 백필 API가 아직 배포되지 않았거나 서버 내부 오류가 발생했습니다. Functions 배포 상태와 로그를 확인해 주세요.';
  }
  return error?.message || '관리자 백필 작업 중 알 수 없는 오류가 발생했습니다.';
}

function getUserStatusClass(status) {
  if (status === 'complete') return 'is-complete';
  if (status === 'in_progress') return 'is-progress';
  return 'is-pending';
}

export default function GalaxyLearningLedgerBackfill() {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [endingJob, setEndingJob] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [scope, setScope] = useState('all');
  const [targetUid, setTargetUid] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('pending');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const stopRef = useRef(false);
  const runningRef = useRef(false);
  const endingRef = useRef(false);
  const mountedRef = useRef(true);
  const startPanelRef = useRef(null);

  const appendLog = useCallback((message, tone = 'info') => {
    if (!mountedRef.current) return;
    setLogs((current) => [{
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      time: new Date().toLocaleTimeString('ko-KR'),
      message,
      tone,
    }, ...current].slice(0, 30));
  }, []);

  const loadStatus = useCallback(async ({ initial = false, clearError = true } = {}) => {
    if (!mountedRef.current) return null;
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const callable = httpsCallable(functions, 'adminGetGalaxyLearningBackfillStatus');
      const result = await callable({});
      if (mountedRef.current) {
        setStatusData(result.data || null);
        if (clearError) setError('');
      }
      return result.data || null;
    } catch (statusError) {
      const message = getErrorMessage(statusError);
      if (mountedRef.current && clearError) setError(message);
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadStatus({ initial: true });
    return () => {
      mountedRef.current = false;
      stopRef.current = true;
    };
  }, [loadStatus]);

  const runJob = useCallback(async (initialJob) => {
    if (
      !mountedRef.current
      || !initialJob?.jobRunId
      || !RESUMABLE_JOB_STATUSES.has(initialJob.status)
      || runningRef.current
      || endingRef.current
    ) return;
    runningRef.current = true;
    stopRef.current = false;
    setStopRequested(false);
    setAutoRunning(true);
    setError('');
    let job = initialJob;
    let steps = 0;

    try {
      const runStep = httpsCallable(functions, 'adminRunGalaxyLearningBackfillStep', {
        timeout: STEP_TIMEOUT_MS,
      });
      while (RESUMABLE_JOB_STATUSES.has(job?.status) && !stopRef.current && steps < AUTO_STEP_LIMIT) {
        steps += 1;
        appendLog(`${steps}번째 안전 배치를 실행합니다.`);
        const response = await runStep({
          jobRunId: job.jobRunId,
          userBudget: 20,
          pageBudget: 15,
        });
        const payload = response.data || {};
        job = payload.job || job;
        const step = payload.step || {};
        appendLog(
          `${formatNumber(step.usersHandled)}명 확인 · 원장 ${formatNumber(step.ledgerDocsScanned)}건 스캔 · ` +
          `${formatNumber(step.eventsCredited)}건/${formatNumber(step.oreCredited)}광석 반영 · ` +
          `${STOP_REASON_LABELS[step.stopReason] || step.stopReason || '배치 종료'}`,
          job.status === 'completed' ? 'success' : 'info',
        );
        const freshStatus = await loadStatus();
        if (freshStatus?.job?.jobRunId === job.jobRunId) job = freshStatus.job;
      }

      if (job?.status === 'completed') {
        appendLog('학습 광석 원장 백필 작업이 완료되었습니다.', 'success');
      } else if (job?.status === 'cancelled') {
        appendLog('다른 화면에서 관리자 작업이 종료되어 자동 실행도 멈췄습니다. 반영된 원장은 유지됩니다.', 'warning');
      } else if (stopRef.current) {
        appendLog('현재 배치가 끝난 뒤 자동 실행을 멈췄습니다. 같은 작업에서 계속 실행할 수 있습니다.', 'warning');
      } else if (steps >= AUTO_STEP_LIMIT) {
        appendLog('안전 한도 100회에 도달해 자동 실행을 멈췄습니다. 현황을 확인한 뒤 계속 실행하세요.', 'warning');
      }
    } catch (runError) {
      const message = getErrorMessage(runError);
      if (mountedRef.current) setError(message);
      appendLog(`배치 오류: ${message}`, 'error');
    } finally {
      runningRef.current = false;
      if (mountedRef.current) {
        setAutoRunning(false);
        setStopRequested(false);
      }
      stopRef.current = false;
      await loadStatus({ clearError: false });
    }
  }, [appendLog, loadStatus]);

  const startJob = async () => {
    const phrase = statusData?.confirmationPhrase || '';
    const cleanTargetUid = targetUid.trim();
    if (scope === 'user' && !cleanTargetUid) {
      setError('개별 실행할 학생 UID를 입력해 주세요.');
      return;
    }
    if (!phrase || confirmation.trim() !== phrase) {
      setError('안전 확인 문구를 정확히 입력해 주세요.');
      return;
    }
    const targetLabel = scope === 'all' ? '미완료 학생 전체' : cleanTargetUid;
    if (!window.confirm(`${targetLabel}의 학습 광석 원장을 백필할까요?\n\n완료된 거래 마커는 다시 지급되지 않습니다.`)) return;

    setStarting(true);
    setError('');
    try {
      const start = httpsCallable(functions, 'adminStartGalaxyLearningBackfill');
      const response = await start({
        scope,
        targetUid: cleanTargetUid,
        confirmation: confirmation.trim(),
      });
      const job = response.data?.job;
      if (!mountedRef.current) return;
      setConfirmation('');
      appendLog(`${scope === 'all' ? '전체' : '개별'} 백필 작업을 만들었습니다.`, 'success');
      await loadStatus();
      await runJob(job);
    } catch (startError) {
      const message = getErrorMessage(startError);
      if (mountedRef.current) setError(message);
      appendLog(`작업 시작 실패: ${message}`, 'error');
      await loadStatus({ clearError: false });
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  };

  const requestStop = () => {
    stopRef.current = true;
    setStopRequested(true);
    appendLog('중지 요청을 받았습니다. 현재 서버 배치가 끝나면 이 화면의 자동 호출을 멈춥니다.', 'warning');
  };

  const cancelJob = async (currentJob) => {
    if (!currentJob?.jobRunId || endingJob || autoRunning) return;
    const phrase = statusData?.confirmationPhrase || '';
    const typed = window.prompt(
      `이 관리자 작업만 종료하고 지금까지 반영된 원장·마커는 그대로 유지합니다.\n\n계속하려면 아래 문구를 입력하세요.\n${phrase}`,
    );
    if (typed === null) return;
    if (typed.trim() !== phrase) {
      setError('안전 확인 문구가 일치하지 않아 작업 종료를 취소했습니다.');
      return;
    }

    endingRef.current = true;
    setEndingJob(true);
    setError('');
    try {
      const cancel = httpsCallable(functions, 'adminCancelGalaxyLearningBackfill');
      await cancel({ jobRunId: currentJob.jobRunId, confirmation: typed.trim() });
      if (!mountedRef.current) return;
      appendLog('관리자 작업을 종료했습니다. 이미 반영된 원장과 중복 방지 마커는 유지됩니다.', 'warning');
      await loadStatus();
    } catch (cancelError) {
      const message = getErrorMessage(cancelError);
      if (mountedRef.current) setError(message);
      appendLog(`작업 종료 실패: ${message}`, 'error');
    } finally {
      endingRef.current = false;
      if (mountedRef.current) setEndingJob(false);
    }
  };

  const selectUser = (uid) => {
    setScope('user');
    setTargetUid(uid);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    startPanelRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const summary = statusData?.summary || {};
  const job = statusData?.job || null;
  const hasResumableJob = Boolean(job && RESUMABLE_JOB_STATUSES.has(job.status));
  const jobIsLocked = Boolean(job?.status === 'running' && job?.leaseActive);
  const confirmationMatches = Boolean(
    statusData?.confirmationPhrase
    && confirmation.trim() === statusData.confirmationPhrase,
  );
  const progressPercent = summary.totalUsers
    ? Math.round((Number(summary.completeUsers || 0) / Number(summary.totalUsers)) * 100)
    : 0;

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...(statusData?.users || [])]
      .filter((user) => {
        if (userFilter === 'pending' && user.status === 'complete') return false;
        if (userFilter === 'complete' && user.status !== 'complete') return false;
        return !query || `${user.displayName} ${user.uid}`.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (a.status === b.status) return a.displayName.localeCompare(b.displayName, 'ko');
        if (a.status === 'complete') return 1;
        if (b.status === 'complete') return -1;
        return a.status === 'in_progress' ? -1 : 1;
      });
  }, [search, statusData?.users, userFilter]);

  if (loading && !statusData) {
    return (
      <div className="ledger-admin ledger-admin-loading">
        <LoaderCircle className="spin" size={28} />
        학습 광석 원장 현황을 불러오는 중입니다…
      </div>
    );
  }

  return (
    <div className="ledger-admin">
      <header className="ledger-admin-hero">
        <div>
          <div className="ledger-admin-eyebrow"><Database size={15} /> ASTRA FRONTIER · ADMIN OPERATION</div>
          <h1>학습 광석 원장 백필</h1>
          <p>기존 학습 보상 거래를 광석 원장 V2에 안전하게 반영하고, 학생별 완료 상태를 관리합니다.</p>
        </div>
        <button className="ledger-btn ledger-btn-secondary" onClick={() => loadStatus()} disabled={refreshing || autoRunning}>
          <RefreshCw className={refreshing ? 'spin' : ''} size={17} />
          {refreshing ? '확인 중…' : '현황 새로 고침'}
        </button>
      </header>

      {error && (
        <div className="ledger-alert ledger-alert-error" role="alert">
          <AlertTriangle size={19} />
          <div><strong>작업을 확인해 주세요.</strong><span>{error}</span></div>
        </div>
      )}

      {statusData?.truncated && (
        <div className="ledger-alert ledger-alert-warning">
          <AlertTriangle size={19} />
          <div><strong>운영 도구 한도 도달</strong><span>첫 {formatNumber(statusData.scanLimit)}개 사용자 문서만 집계했습니다. 안전을 위해 전체 실행도 차단되므로, 실행 전에 도구의 사용자 한도를 확장해야 합니다.</span></div>
        </div>
      )}

      <section className="ledger-summary-grid" aria-label="백필 현황 요약">
        <article className="ledger-stat-card">
          <span>대상 학생</span><strong>{formatNumber(summary.totalUsers)}</strong><small>교직원·학부모·게스트·삭제 계정 제외</small>
        </article>
        <article className="ledger-stat-card is-green">
          <span>V2 완료</span><strong>{formatNumber(summary.completeUsers)}</strong><small>{progressPercent}% 완료</small>
        </article>
        <article className="ledger-stat-card is-amber">
          <span>진행 중</span><strong>{formatNumber(summary.inProgressUsers)}</strong><small>저장된 거래 커서 있음</small>
        </article>
        <article className="ledger-stat-card is-blue">
          <span>미시작</span><strong>{formatNumber(summary.notStartedUsers)}</strong><small>전체 미완료 {formatNumber(summary.pendingUsers)}명</small>
        </article>
      </section>

      <div
        className="ledger-progress"
        role="progressbar"
        aria-label="학생 원장 V2 완료율"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progressPercent}
      >
        <div style={{ width: `${progressPercent}%` }} />
      </div>

      <section className="ledger-panel ledger-job-panel" aria-live="polite">
        <div className="ledger-section-heading">
          <div>
            <span className="ledger-kicker">RESUMABLE JOB</span>
            <h2>현재 관리자 작업</h2>
          </div>
          <span className={`ledger-job-status is-${job?.status || 'none'}`}>
            {job ? JOB_STATUS_LABELS[job.status] || job.status : '작업 없음'}
          </span>
        </div>

        {job ? (
          <>
            <div className="ledger-job-meta">
              <div><span>범위</span><strong>{job.scope === 'user' ? `개별 · ${job.targetUid}` : '전체 학생'}</strong></div>
              <div><span>현재 UID</span><strong title={job.currentUid || ''}>{job.currentUid || '-'}</strong></div>
              <div><span>최근 갱신</span><strong>{formatDate(job.updatedAt)}</strong></div>
              <div><span>작업 ID</span><strong title={job.jobRunId}>{job.jobRunId || '-'}</strong></div>
            </div>
            <div className="ledger-counter-grid">
              <div><span>대상 진행</span><strong>{formatNumber(job.targetIndex)} / {formatNumber(job.targetCount)}</strong></div>
              <div><span>검사한 대상</span><strong>{formatNumber(job.counters?.usersVisited)}</strong></div>
              <div><span>이번 작업 신규 완료</span><strong>{formatNumber(job.counters?.usersCompleted)}</strong></div>
              <div><span>이미 완료 · 통과</span><strong>{formatNumber(job.counters?.usersAlreadyComplete)}</strong></div>
              <div><span>삭제·대상 제외</span><strong>{formatNumber(job.counters?.usersSkipped)}</strong></div>
              <div><span>원장 스캔</span><strong>{formatNumber(job.counters?.ledgerDocsScanned)}</strong></div>
              <div><span>신규 반영 광석</span><strong>{formatNumber(job.counters?.oreCredited)}</strong></div>
              <div><span>오류</span><strong>{formatNumber(job.counters?.errors)}</strong></div>
            </div>
            {job.lastError && (
              <div className="ledger-inline-error">
                <AlertTriangle size={16} />
                <span>{job.lastError.message} {job.lastError.currentUid ? `(${job.lastError.currentUid})` : ''}</span>
              </div>
            )}
            <div className="ledger-job-actions">
              {hasResumableJob && (
                <button
                  className="ledger-btn ledger-btn-primary"
                  onClick={() => runJob(job)}
                  disabled={autoRunning || starting || endingJob || jobIsLocked}
                >
                  {autoRunning ? <LoaderCircle className="spin" size={18} /> : <Play size={18} />}
                  {autoRunning ? '자동 배치 실행 중…' : jobIsLocked ? '서버 배치 실행 중' : job.status === 'failed' ? '오류 지점에서 재개' : '기존 작업 계속 실행'}
                </button>
              )}
              {autoRunning && (
                <button className="ledger-btn ledger-btn-stop" onClick={requestStop} disabled={stopRequested}>
                  <CircleStop size={18} />
                  {stopRequested ? '현재 배치 뒤 자동 호출 중지 예정' : '이 화면의 자동 연속 실행 중지'}
                </button>
              )}
              {hasResumableJob && !autoRunning && !jobIsLocked && (
                <button className="ledger-btn ledger-btn-danger" onClick={() => cancelJob(job)} disabled={endingJob || starting}>
                  <CircleStop size={18} />
                  {endingJob ? '작업 종료 중…' : '작업 종료 · 원장 유지'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="ledger-empty-job"><Clock3 size={22} /> 아직 만든 관리자 백필 작업이 없습니다.</div>
        )}
      </section>

      <section className="ledger-panel" ref={startPanelRef}>
        <div className="ledger-section-heading">
          <div>
            <span className="ledger-kicker">START SAFE BACKFILL</span>
            <h2>새 백필 작업 시작</h2>
          </div>
          <ShieldCheck size={28} className="ledger-heading-icon" />
        </div>

        {hasResumableJob && (
          <div className="ledger-alert ledger-alert-info compact">
            <ShieldCheck size={18} />
            <div><strong>기존 작업을 먼저 마쳐 주세요.</strong><span>작업 커서와 오류 지점을 보존하기 위해 새 작업 시작을 잠갔습니다.</span></div>
          </div>
        )}

        <div className="ledger-scope-grid">
          <button className={`ledger-scope-card ${scope === 'all' ? 'is-selected' : ''}`} aria-pressed={scope === 'all'} onClick={() => setScope('all')} disabled={hasResumableJob || autoRunning || starting}>
            <Database size={22} /><span><strong>전체 미완료 학생</strong><small>완료 학생은 읽기만 하고 자동 통과합니다.</small></span>
          </button>
          <button className={`ledger-scope-card ${scope === 'user' ? 'is-selected' : ''}`} aria-pressed={scope === 'user'} onClick={() => setScope('user')} disabled={hasResumableJob || autoRunning || starting}>
            <UserRound size={22} /><span><strong>학생 1명</strong><small>문의·긴급 확인용으로 UID 한 명만 처리합니다.</small></span>
          </button>
        </div>

        {scope === 'user' && (
          <label className="ledger-field">
            <span>대상 학생 UID</span>
            <input value={targetUid} onChange={(event) => setTargetUid(event.target.value)} placeholder="Firebase Auth / users 문서 UID" disabled={hasResumableJob || autoRunning || starting} />
          </label>
        )}

        <div className="ledger-confirm-box">
          <div>
            <span>안전 확인 문구</span>
            <code>{statusData?.confirmationPhrase || '불러오는 중…'}</code>
          </div>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="위 문구를 정확히 입력"
            aria-label="백필 안전 확인 문구"
            autoComplete="off"
            spellCheck="false"
            disabled={hasResumableJob || autoRunning || starting}
          />
        </div>

        <div className="ledger-safety-note">
          <ShieldCheck size={19} />
          <p><strong>중복 지급 방지:</strong> 이미 반영된 거래 마커는 건너뛰고, 각 배치가 끝날 때 사용자·거래 커서를 저장합니다. 총액을 초기화하거나 기존 마커를 삭제하지 않습니다.</p>
        </div>

        <button
          className="ledger-btn ledger-btn-primary ledger-start-btn"
          onClick={startJob}
          disabled={hasResumableJob || autoRunning || starting || !confirmationMatches || (scope === 'user' && !targetUid.trim())}
        >
          {starting || autoRunning ? <LoaderCircle className="spin" size={19} /> : <Play size={19} />}
          {starting ? '작업 생성 중…' : autoRunning ? '자동 배치 실행 중…' : '작업 시작 후 안전 한도까지 자동 실행'}
        </button>
      </section>

      <section className="ledger-panel">
        <div className="ledger-section-heading ledger-table-heading">
          <div>
            <span className="ledger-kicker">READ-ONLY PREVIEW</span>
            <h2>학생별 원장 상태</h2>
          </div>
          <span>{formatNumber(visibleUsers.length)}명 표시</span>
        </div>
        <div className="ledger-table-controls">
          <label><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름 또는 UID 검색" /></label>
          <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)} aria-label="학생 원장 상태 필터">
            <option value="pending">미완료만</option>
            <option value="complete">완료만</option>
            <option value="all">전체</option>
          </select>
        </div>
        <div className="ledger-table-wrap">
          <table>
            <thead><tr><th scope="col">학생</th><th scope="col">원장 상태</th><th scope="col">누적 광석</th><th scope="col">저장 커서</th><th scope="col">최근 동기화</th><th scope="col">개별 작업</th></tr></thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.uid}>
                  <td><strong>{user.displayName}</strong><small title={user.uid}>{user.uid}</small></td>
                  <td><span className={`ledger-user-status ${getUserStatusClass(user.status)}`}>{USER_STATUS_LABELS[user.status] || user.status}</span></td>
                  <td>{formatNumber(user.oreTotal)}</td>
                  <td><code title={user.cursor}>{user.cursor ? `${user.cursor.slice(0, 12)}…` : '-'}</code></td>
                  <td>{formatDate(user.syncedAt)}</td>
                  <td><button className="ledger-row-btn" onClick={() => selectUser(user.uid)} disabled={autoRunning || starting || hasResumableJob || user.status === 'complete'}>{user.status === 'complete' ? '완료됨' : 'UID 선택'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleUsers.length && <div className="ledger-table-empty"><CheckCircle2 size={22} /> 조건에 맞는 학생이 없습니다.</div>}
        </div>
      </section>

      <section className="ledger-panel ledger-guide">
        <div className="ledger-section-heading">
          <div><span className="ledger-kicker">OPERATOR GUIDE</span><h2>권장 사용 순서</h2></div>
        </div>
        <ol>
          <li><span>1</span><div><strong>현황을 먼저 확인</strong><p>“미완료”가 0명이면 실행할 필요가 없습니다. 현황 조회는 거래 원장을 읽지 않습니다.</p></div></li>
          <li><span>2</span><div><strong>수업 전·후에 전체 실행</strong><p>시작 시점의 미완료 UID 목록을 고정해 처리합니다. 수업 중에도 중복 지급은 막지만, 부하를 줄이려면 수업 외 시간에 실행하세요.</p></div></li>
          <li><span>3</span><div><strong>멈췄으면 기존 작업 재개</strong><p>페이지를 닫으면 현재 배치 뒤 자동 호출이 멈춥니다. 다시 들어와 “기존 작업 계속 실행”을 누르면 커서부터 이어집니다.</p></div></li>
          <li><span>4</span><div><strong>완료 조건 확인</strong><p>작업이 “완료”이고 미완료 학생이 0명이면 끝입니다. 작업 중 새 학생이 생겨 미완료가 남으면 새 전체 작업을 한 번 더 실행하세요.</p></div></li>
        </ol>
      </section>

      <section className="ledger-panel ledger-log-panel">
        <div className="ledger-section-heading ledger-table-heading">
          <div><span className="ledger-kicker">SESSION LOG</span><h2>이번 화면의 실행 기록</h2></div>
          <button className="ledger-row-btn" onClick={() => setLogs([])} disabled={!logs.length}>지우기</button>
        </div>
        <div className="ledger-log-list" aria-live="polite">
          {logs.map((log) => <div key={log.id} className={`is-${log.tone}`}><time>{log.time}</time><span>{log.message}</span></div>)}
          {!logs.length && <p>아직 이 화면에서 실행한 배치가 없습니다.</p>}
        </div>
      </section>
    </div>
  );
}
