import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp } from 'firebase/firestore';
import { ClipboardList, Phone, Gift, CheckCircle2 } from 'lucide-react';
import { db } from '../../firebase';
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
                    <strong>{app.applicantName}</strong> 학부모 · {formatPhone(app.parentPhone)}<br />
                    자녀: {app.studentName} ({app.grade}) · 과정: {app.selectedCourse || '-'}
                  </div>
                  {app.type === 'trial' && (
                    <div style={{ marginTop: 8, color: '#bbf7d0', fontSize: '0.92rem' }}>
                      추천 수강생: {app.referredStudentName || '-'} · 추천인 전화: {formatPhone(app.referrerParentPhone)}
                    </div>
                  )}
                  {(app.preferredTime || app.message) && (
                    <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>
                      {app.preferredTime && <div>연락 가능 시간: {app.preferredTime}</div>}
                      {app.message && <div>메모: {app.message}</div>}
                    </div>
                  )}
                </div>

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
