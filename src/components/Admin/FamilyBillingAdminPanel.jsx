import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Calculator, Copy, RefreshCw, Send } from 'lucide-react';
import { functions } from '../../firebase';

const money = (value) => `${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}원`;
const monthKey = (offset = 0) => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const statuses = [
  ['trial', '체험/무료'],
  ['active_paid', '유료 수강 중'],
  ['cancel_scheduled', '해지 예정'],
  ['paused', '일시정지'],
  ['ended', '수강 종료'],
  ['complimentary', '무료 제고'],
];

export function EnrollmentEditor({ child, onSaved = async () => {} }) {
  const current = child.enrollment || {};
  const [status, setStatus] = useState(current.status || 'trial');
  const [activeFrom, setActiveFrom] = useState(current.activeFrom || '');
  const [activeThrough, setActiveThrough] = useState(current.activeThrough || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!reason.trim()) return alert('변경 사유를 입력해 주세요.');
    setSaving(true);
    try {
      const fn = httpsCallable(functions, 'adminUpdateStudentEnrollment');
      await fn({ studentUid: child.uid, status, activeFrom, activeThrough, reason });
      setReason('');
      await onSaved();
    } catch (error) {
      alert(error?.message || '유료 상태 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 10, padding: 10, display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) repeat(2, minmax(125px, .8fr)) minmax(130px, 1fr)', gap: 8, alignItems: 'end' }}>
      <label style={{ fontSize: 11, color: '#94a3b8' }}>{child.name}<select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label style={{ fontSize: 11, color: '#94a3b8' }}>유료 시작일<input type="date" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} style={inputStyle} /></label>
      <label style={{ fontSize: 11, color: '#94a3b8' }}>유료 종료일<input type="date" value={activeThrough} onChange={(e) => setActiveThrough(e.target.value)} style={inputStyle} /></label>
      <div style={{ display: 'flex', gap: 6 }}><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="변경 사유" style={{ ...inputStyle, flex: 1 }} /><button type="button" onClick={save} disabled={saving} className="secondary-btn" style={{ padding: '7px 10px' }}>{saving ? '...' : '저장'}</button></div>
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', marginTop: 4, borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: '#171827', color: 'white', padding: '8px 9px'
};

export default function FamilyBillingAdminPanel({ parent }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fee, setFee] = useState('');
  const [effectiveMonth, setEffectiveMonth] = useState(monthKey());
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'adminGetFamilyBillingDashboard');
      const result = await fn({ parentUid: parent.id });
      setData(result.data || null);
      setFee(String(result.data?.next?.baseFee || result.data?.current?.baseFee || ''));
    } catch (error) {
      alert(error?.message || '가족 수강료 정보를 불러오지 못했습니다.');
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
    if (!reason.trim()) return alert('변경 사유를 입력해 주세요.');
    const fn = httpsCallable(functions, 'adminUpdateFamilyBilling');
    await fn({ parentUid: parent.id, baseFee: Number(fee), effectiveMonth, reason });
    setReason('');
    await load();
  };

  const prepare = async () => {
    const fn = httpsCallable(functions, 'adminPrepareFamilyBillingStatement');
    await fn({ parentUid: parent.id, monthKey: effectiveMonth, reason: '운영자 수동 명세 생성' });
    await load();
  };

  const markSent = async (statementId) => {
    const fn = httpsCallable(functions, 'adminMarkBillingNoticeSent');
    await fn({ statementId });
    await load();
  };

  const nextStatement = data?.statements?.find((row) => row.billingMonth === effectiveMonth);

  return (
    <div style={{ margin: '12px 0', border: '1px solid rgba(0,212,255,0.18)', borderRadius: 10, overflow: 'hidden' }}>
      <button type="button" onClick={toggle} style={{ width: '100%', border: 0, padding: '10px 12px', background: 'rgba(0,212,255,0.08)', color: '#67e8f9', textAlign: 'left', fontWeight: 850, cursor: 'pointer' }}>
        <Calculator size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />수강료·추천·월별 명세 {open ? '접기' : '펼치기'}
      </button>
      {open && (
        <div style={{ padding: 12, display: 'grid', gap: 12 }}>
          {loading && <div style={{ color: '#94a3b8' }}>불러오는 중...</div>}
          {data && !loading && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                <b>현재 {data.current.monthKey}: {money(data.current.finalFee)}</b>
                <span style={{ color: '#86efac' }}>추천 {data.current.activeReferralCount}가구 · {Math.round(data.current.discountRate * 100)}%</span>
                <b>다음 {data.next.monthKey} 예상: {money(data.next.finalFee)}</b>
                <button type="button" onClick={load} style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><RefreshCw size={14} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '140px minmax(140px, 1fr) minmax(160px, 1fr) auto', gap: 8, alignItems: 'end' }}>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>적용 월<input type="month" value={effectiveMonth} onChange={(e) => setEffectiveMonth(e.target.value)} style={inputStyle} /></label>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>가족 기본 수강료<input type="number" min="0" step="1000" value={fee} onChange={(e) => setFee(e.target.value)} style={inputStyle} /></label>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>변경 사유<input value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} /></label>
                <button type="button" onClick={saveFee} className="primary-btn" style={{ padding: '8px 12px' }}>수강료 저장</button>
              </div>

              <div style={{ display: 'grid', gap: 7 }}>
                {data.children.map((child) => <EnrollmentEditor key={child.uid} child={child} onSaved={load} />)}
              </div>

              <div style={{ color: '#cbd5e1', fontSize: 12 }}>
                추천 내역 {data.referrals.length}건 · 학부모/자녀 추천 모두 가족 실적에 합산되어 보입니다.
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={prepare} className="secondary-btn" style={{ padding: '8px 11px' }}><Calculator size={14} /> {effectiveMonth} 명세 생성</button>
                {nextStatement && <button type="button" onClick={() => navigator.clipboard.writeText(nextStatement.noticeText || '')} className="secondary-btn" style={{ padding: '8px 11px' }}><Copy size={14} /> 문구 복사</button>}
                {nextStatement && nextStatement.noticeStatus !== 'sent' && <button type="button" onClick={() => markSent(nextStatement.id)} className="secondary-btn" style={{ padding: '8px 11px' }}><Send size={14} /> 발송 완료</button>}
              </div>
              {nextStatement && <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: '#cbd5e1', fontSize: 11 }}>{nextStatement.noticeText}</pre>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
