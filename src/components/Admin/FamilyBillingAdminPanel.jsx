import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Calculator, Copy, RefreshCw, Send } from 'lucide-react';
import { functions } from '../../firebase';

const money = (value) => `${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}원`;
const monthKey = (offset = 0) => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const statuses = [
  ['trial', '체험/무료'],
  ['active_paid', '유료 수강 중'],
  ['cancel_scheduled', '해지 예정'],
  ['paused', '일시정지'],
  ['ended', '수강 종료'],
  ['complimentary', '무료 제공'],
];

const statusLabels = Object.fromEntries(statuses);

function formatTimestamp(value) {
  if (!value) return '';
  let date;
  if (typeof value.toDate === 'function') {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value.seconds === 'number' || typeof value._seconds === 'number') {
    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
    date = new Date((seconds * 1000) + Math.floor(nanoseconds / 1e6));
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', marginTop: 4, borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: '#171827', color: 'white', padding: '8px 9px'
};

// 읽기 전용 변경 이력 표시 (가족 수강료용)
function FeeHistory({ account }) {
  const history = Array.isArray(account?.changeHistory) ? [...account.changeHistory].reverse() : [];
  const lastReason = account?.lastChangeReason || '';
  const lastChangedAt = formatTimestamp(account?.lastChangedAt);
  if (!lastReason && history.length === 0) {
    return <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>아직 변경 이력이 없습니다.</div>;
  }
  return (
    <div style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: 10 }}>
      {lastReason && (
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: '#cbd5e1' }}>최근 변경 사유:</span> {lastReason}
          {account.lastChangeMonthKey && <span style={{ marginLeft: 6 }}>({account.lastChangeMonthKey} 기준)</span>}
          {lastChangedAt && <span style={{ marginLeft: 6, color: 'rgba(255,255,255,0.4)' }}>{lastChangedAt}</span>}
        </div>
      )}
      {history.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', color: '#67e8f9' }}>변경 이력 {history.length}건</summary>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
            {history.map((row, index) => (
              <li key={index} style={{ lineHeight: 1.5 }}>
                <span style={{ color: '#cbd5e1' }}>{row.reason}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {' '}· {row.monthKey} {money(row.baseFeeFrom)} → {money(row.baseFeeTo)}
                  {row.changedAt ? ` · ${formatTimestamp(row.changedAt)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// 읽기 전용 변경 이력 표시 (학생 enrollment용)
function EnrollmentHistory({ enrollment }) {
  const history = Array.isArray(enrollment?.changeHistory) ? [...enrollment.changeHistory].reverse() : [];
  const lastReason = enrollment?.lastChangeReason || '';
  const lastChangedAt = formatTimestamp(enrollment?.lastChangedAt);
  if (!lastReason && history.length === 0) {
    return <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>아직 변경 이력이 없습니다.</div>;
  }
  return (
    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
      {lastReason && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: '#cbd5e1' }}>최근 변경 사유:</span> {lastReason}
          {lastChangedAt && <span style={{ marginLeft: 6, color: 'rgba(255,255,255,0.4)' }}>{lastChangedAt}</span>}
        </div>
      )}
      {history.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', color: '#67e8f9' }}>변경 이력 {history.length}건</summary>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
            {history.map((row, index) => (
              <li key={index} style={{ lineHeight: 1.5 }}>
                <span style={{ color: '#cbd5e1' }}>{row.reason}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {' '}· {statusLabels[row.statusFrom] || row.statusFrom || '신규'} → {statusLabels[row.statusTo] || row.statusTo}
                  {row.changedAt ? ` · ${formatTimestamp(row.changedAt)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// 학생 enrollment 입력 폼 (이력과 분리)
function EnrollmentForm({ child, onSaved = async () => {} }) {
  const current = child.enrollment || {};
  const [status, setStatus] = useState(current.status || 'trial');
  const [activeFrom, setActiveFrom] = useState(current.activeFrom || '');
  const [activeThrough, setActiveThrough] = useState(current.activeThrough || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const save = async () => {
    if (!reason.trim()) return setNotice({ type: 'error', text: '변경 사유를 입력해 주세요.' });
    setSaving(true);
    setNotice(null);
    try {
      const fn = httpsCallable(functions, 'adminUpdateStudentEnrollment');
      await fn({ studentUid: child.uid, status, activeFrom, activeThrough, reason });
      setReason('');
      setNotice({ type: 'success', text: '저장되었습니다.' });
      await onSaved();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || '유료 상태 저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) repeat(2, minmax(125px, .8fr)) minmax(130px, 1fr)', gap: 8, alignItems: 'end' }}>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>{child.name}<select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>유료 시작일<input type="date" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} style={inputStyle} /></label>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>유료 종료일<input type="date" value={activeThrough} onChange={(e) => setActiveThrough(e.target.value)} style={inputStyle} /></label>
        <div style={{ display: 'flex', gap: 6 }}><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="변경 사유" style={{ ...inputStyle, flex: 1 }} /><button type="button" onClick={save} disabled={saving} className="secondary-btn" style={{ padding: '7px 10px' }}>{saving ? '...' : '저장'}</button></div>
      </div>
      {notice && (
        <div style={{ marginTop: 8, fontSize: 12, color: notice.type === 'success' ? '#86efac' : '#fecaca' }}>{notice.text}</div>
      )}
    </>
  );
}

// 저장 폼 + 이력을 묶은 학생 블록 (형제로 배치하여 인터레이스 방지)
function EnrollmentEditor({ child, onSaved = async () => {} }) {
  // 저장 후 child prop이 갱신되면 폼을 새 값으로 리마운트한다.
  const formKey = `${child.uid}_${child.enrollment?.lastChangedAt?.seconds || child.enrollment?.updatedAt?.seconds || 0}`;
  return (
    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
      <EnrollmentForm key={formKey} child={child} onSaved={onSaved} />
      <EnrollmentHistory enrollment={child.enrollment || {}} />
    </div>
  );
}

export { EnrollmentEditor };

export default function FamilyBillingAdminPanel({ parent }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fee, setFee] = useState('');
  const [effectiveMonth, setEffectiveMonth] = useState(monthKey());
  const [reason, setReason] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const [feeNotice, setFeeNotice] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'adminGetFamilyBillingDashboard');
      const result = await fn({ parentUid: parent.id });
      setData(result.data || null);
      setFee(String(result.data?.next?.baseFee || result.data?.current?.baseFee || ''));
    } catch (error) {
      alert(error?.message || '가족 수강료 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !data) await load();
  };

  const saveFee = async () => {
    if (!reason.trim()) return setFeeNotice({ type: 'error', text: '변경 사유를 입력해 주세요.' });
    setSavingFee(true);
    setFeeNotice(null);
    try {
      const fn = httpsCallable(functions, 'adminUpdateFamilyBilling');
      await fn({ parentUid: parent.id, baseFee: Number(fee), effectiveMonth, reason });
      setReason('');
      setFeeNotice({ type: 'success', text: '수강료가 저장되었습니다.' });
      await load();
    } catch (error) {
      setFeeNotice({ type: 'error', text: error?.message || '수강료 저장에 실패했습니다.' });
    } finally {
      setSavingFee(false);
    }
  };

  const prepare = async () => {
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'adminPrepareFamilyBillingStatement');
      await fn({ parentUid: parent.id, monthKey: effectiveMonth, reason: '운영자 수동 명세 생성' });
      await load();
    } catch (error) {
      alert(error?.message || '명세 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const sendNotice = async (statementId) => {
    if (!window.confirm('해당 학부모에게 수강료 안내 LMS를 발송할까요?')) return;
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'adminSendFamilyBillingNotice');
      const result = await fn({ statementId });
      alert(result.data?.skipped ? '이미 발송된 명세라 재발송하지 않았습니다.' : 'SOLAPI LMS 발송이 완료되었습니다.');
      await load();
    } catch (error) {
      alert(error?.message || 'SOLAPI LMS 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const account = data?.account || {};
  const nextStatement = data?.statements?.find((row) => row.billingMonth === effectiveMonth);

  return (
    <div style={{ margin: '12px 0', border: '1px solid rgba(0,212,255,0.18)', borderRadius: 10, overflow: 'hidden' }}>
      <button type="button" onClick={toggle} style={{ width: '100%', border: 0, padding: '10px 12px', background: 'rgba(0,212,255,0.08)', color: '#67e8f9', textAlign: 'left', fontWeight: 850, cursor: 'pointer' }}>
        <Calculator size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />수강료·추천·월별 명세 {open ? '접기' : '펼치기'}
      </button>
      {open && (
        <div style={{ padding: 12, display: 'grid', gap: 12 }}>
          {loading && <div style={{ color: '#94a3b8' }}>불러오는 중...</div>}
          {data && !loading && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                <b>현재 {data.current.monthKey}: {money(data.current.finalFee)}</b>
                <span style={{ color: '#86efac' }}>추천 {data.current.activeReferralCount}가구 · {Math.round(data.current.discountRate * 100)}%</span>
                <b>다음 {data.next.monthKey} 예상: {money(data.next.finalFee)}</b>
                <button type="button" onClick={load} style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><RefreshCw size={14} /></button>
              </div>

              {/* 가족 수강료 입력 폼 */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px minmax(140px, 1fr) minmax(160px, 1fr) auto', gap: 8, alignItems: 'end' }}>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>적용 월<input type="month" value={effectiveMonth} onChange={(e) => setEffectiveMonth(e.target.value)} style={inputStyle} /></label>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>가족 기본 수강료<input type="number" min="0" step="1000" value={fee} onChange={(e) => setFee(e.target.value)} style={inputStyle} /></label>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>변경 사유<input value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} /></label>
                <button type="button" onClick={saveFee} disabled={savingFee} className="primary-btn" style={{ padding: '8px 12px' }}>{savingFee ? '...' : '수강료 저장'}</button>
              </div>
              {feeNotice && (
                <div style={{ fontSize: 12, color: feeNotice.type === 'success' ? '#86efac' : '#fecaca' }}>{feeNotice.text}</div>
              )}

              {/* 가족 수강료 변경 이력 (읽기 전용, 폼과 분리) */}
              <FeeHistory account={account} />

              {/* 학생별 enrollment 블록 (각각 폼 + 이력 분리) */}
              <div style={{ display: 'grid', gap: 7 }}>
                {data.children.map((child) => <EnrollmentEditor key={child.uid} child={child} onSaved={load} />)}
              </div>

              <div style={{ color: '#cbd5e1', fontSize: 12 }}>
                추천 내역 {data.referrals.length}건 · 학부모/자녀 추천 모두 가족 실적에 합산되어 보입니다.
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={prepare} className="secondary-btn" style={{ padding: '8px 11px' }}><Calculator size={14} /> {effectiveMonth} 명세 생성</button>
                {nextStatement && <button type="button" onClick={() => navigator.clipboard.writeText(nextStatement.noticeText || '')} className="secondary-btn" style={{ padding: '8px 11px' }}><Copy size={14} /> 문구 복사</button>}
                {nextStatement && nextStatement.noticeStatus !== 'sent' && <button type="button" onClick={() => sendNotice(nextStatement.id)} className="secondary-btn" style={{ padding: '8px 11px' }}><Send size={14} /> SOLAPI LMS 발송</button>}
              </div>
              {nextStatement?.noticeStatus === 'sent' && <div style={{ color: '#86efac', fontSize: 12 }}>발송 완료</div>}
              {nextStatement?.noticeStatus === 'failed' && <div style={{ color: '#fecaca', fontSize: 12 }}>발송 실패: {nextStatement.noticeError || '원인을 확인해 주세요.'}</div>}
              {nextStatement && <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: '#cbd5e1', fontSize: 11 }}>{nextStatement.noticeText}</pre>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
