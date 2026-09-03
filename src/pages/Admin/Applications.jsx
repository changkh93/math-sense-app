import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ClipboardList, Phone, Gift, CheckCircle2 } from 'lucide-react';
import { db, functions } from '../../firebase';
import './Admin.css';

const statusLabels = {
  new: '신규',
  contacted: '연락완료',
  approved: '승인',
  rejected: '보류/거절',
  archived: '보관'
};

function formatDate(value) {
  const date = value?.toDate?.();
  if (!date) return '-';
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatPhone(phone = '') {
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  return phone || '-';
}

function addDaysToIsoDate(value, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function ReferralApplicationEditor({ app }) {
  const [trialStartDate, setTrialStartDate] = useState(app.trialStartDate || '');
  const [trialEndDate, setTrialEndDate] = useState(app.trialEndDate || '');
  const [referralStatus, setReferralStatus] = useState(app.referralStatus || 'applied');
  const [referredStudentUid, setReferredStudentUid] = useState(app.referredStudentUid || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!reason.trim()) return alert('변경 사유를 입력해 주세요.');
    setSaving(true);
    try {
      const fn = httpsCallable(functions, 'adminConfigureReferralApplication');
      await fn({ applicationId: app.id, trialStartDate, trialEndDate, referralStatus, referredStudentUid, reason });
      setReason('');
    } catch (error) {
      alert(error?.message || '추천 체험 정보 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)' }}>
      <strong style={{ color: '#86efac', fontSize: 13 }}>추천 4주 무료체험 운영</strong>
      <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(130px, 1fr))', gap: 8 }}>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>운영자 지정 시작일<input type="date" value={trialStartDate} onChange={(e) => { const value = e.target.value; setTrialStartDate(value); setTrialEndDate(addDaysToIsoDate(value, 27)); }} style={fieldStyle} /></label>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>운영자 지정 종료일<input type="date" value={trialEndDate} onChange={(e) => setTrialEndDate(e.target.value)} style={fieldStyle} /></label>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>전환 상태<select value={referralStatus} onChange={(e) => setReferralStatus(e.target.value)} style={fieldStyle}>
          <option value="applied">신청 완료</option><option value="trial_scheduled">체험 예정</option><option value="trial_active">무료체험 중</option><option value="trial_ended">체험 종료</option><option value="paid_active">유료 전환</option><option value="cancelled">종료</option><option value="rejected">혜택 제외</option>
        </select></label>
        <label style={{ fontSize: 11, color: '#94a3b8' }}>전환된 학생 UID<input value={referredStudentUid} onChange={(e) => setReferredStudentUid(e.target.value)} placeholder="회원가입 후 입력" style={fieldStyle} /></label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="변경 사유" style={fieldStyle} />
        <button type="button" onClick={save} disabled={saving} className="secondary-btn" style={{ padding: '9px 12px' }}>{saving ? '저장 중...' : '체험·전환 저장'}</button>
      </div>
    </div>
  );
}

const fieldStyle = { width: '100%', boxSizing: 'border-box', marginTop: 4, padding: '8px 9px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: '#171827', color: 'white' };

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'applications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return applications;
    return applications.filter(app => app.type === filter || app.status === filter);
  }, [applications, filter]);

  const updateApplication = async (id, patch) => {
    await setDoc(doc(db, 'applications', id), {
      ...patch,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  return (
    <div className="admin-page">
      <div className="admin-header-row">
        <h2><ClipboardList size={24} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle', color: '#00d4ff' }} />신청자 관리</h2>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {[
          ['all', '전체'],
          ['trial', '무료체험'],
          ['consultation', '전화상담'],
          ['new', '신규'],
          ['contacted', '연락완료'],
          ['approved', '승인']
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={filter === key ? 'primary-btn' : 'secondary-btn'}
            style={{ padding: '8px 14px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.55)' }}>로딩 중...</p>
      ) : filtered.length === 0 ? (
        <div className="editor-section" style={{ padding: 24, color: 'rgba(255,255,255,0.55)' }}>표시할 신청 내역이 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {filtered.map(app => (
            <div key={app.id} className="editor-section" style={{ padding: 18, borderLeft: `4px solid ${app.type === 'trial' ? '#22c55e' : '#45aaf2'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {app.type === 'trial' ? <Gift size={18} color="#22c55e" /> : <Phone size={18} color="#45aaf2" />}
                    <strong style={{ fontSize: '1.1rem' }}>{app.type === 'trial' ? '무료체험' : '전화상담'}</strong>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{formatDate(app.createdAt)}</span>
                  </div>
                  <div style={{ color: '#fff', lineHeight: 1.7 }}>
                    <strong>{app.applicantRole === 'student' ? '학생 간편 신청 · 운영자 전화 확인 필요' : `${app.applicantName} 학부모`}</strong> · {formatPhone(app.parentPhone)}<br />
                    자녀: {app.studentName} ({app.grade}) · 과정: {app.selectedCourse || '-'}
                  </div>
                  {app.type === 'trial' && (
                    <div style={{ marginTop: 8, color: '#bbf7d0', fontSize: '0.92rem' }}>
                      {app.referralInviteId ? <>
                        추천 혜택: {app.oneMonthReferralTrial ? '4주 무료체험' : '확인 필요'}<br />
                        추천 학생 UID: {app.referrerStudentUid || '-'} · 추천 학부모 UID: {app.referrerParentUid || '-'}<br />
                        초대 기록: {app.referralInviteId}
                      </> : <>추천 수강생: {app.referredStudentName || '-'} · 추천인 전화: {formatPhone(app.referrerParentPhone)}</>}
                    </div>
                  )}
                  {(app.preferredTime || app.message) && (
                    <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>
                      {app.preferredTime && <div>연락 가능 시간: {app.preferredTime}</div>}
                      {app.message && <div>메모: {app.message}</div>}
                    </div>
                  )}
                </div>

                {(app.referralInviteId || app.referredStudentName || app.referrerParentPhone) && <ReferralApplicationEditor app={app} />}

                <div style={{ display: 'grid', gap: 8, minWidth: 180 }}>
                  <select
                    value={app.status || 'new'}
                    onChange={(e) => updateApplication(app.id, { status: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--panel-bg)', color: 'white' }}
                  >
                    {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  <button
                    className="secondary-btn"
                    onClick={() => updateApplication(app.id, { status: 'contacted', contactedAt: serverTimestamp() })}
                    style={{ padding: '10px 12px' }}
                  >
                    <CheckCircle2 size={14} /> 연락완료
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
