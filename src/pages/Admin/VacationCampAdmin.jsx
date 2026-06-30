import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, Tent } from 'lucide-react';
import { db } from '../../firebase';
import './Admin.css';

const COURSE_META = {
  multiplication: { name: '곱셈', time: '오전 9:30 ~ 10:20' },
  division: { name: '나눗셈', time: '오전 9:30 ~ 10:20' },
  fraction: { name: '분수', time: '오전 9:30 ~ 10:20' },
  decimal: { name: '소수', time: '오전 10:30 ~ 11:20' },
  ratio: { name: '비와 비례식', time: '오전 10:30 ~ 11:20' },
};

const statusLabels = {
  new: '신규',
  contacted: '연락완료',
  approved: '승인(개설)',
  rejected: '폐강/거절',
  archived: '보관',
};

const MIN_ATTENDEES = 15;

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

export default function VacationCampAdmin() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'vacationCampApplications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const courseCounts = useMemo(() => {
    const counts = {};
    Object.keys(COURSE_META).forEach((id) => { counts[id] = 0; });
    applications.forEach((app) => {
      if (counts[app.courseId] !== undefined) counts[app.courseId] += 1;
    });
    return counts;
  }, [applications]);

  const filtered = useMemo(() => {
    if (filter === 'all') return applications;
    if (Object.prototype.hasOwnProperty.call(COURSE_META, filter)) {
      return applications.filter(app => app.courseId === filter);
    }
    return applications.filter(app => app.status === filter);
  }, [applications, filter]);

  const updateApplication = async (id, patch) => {
    await setDoc(doc(db, 'vacationCampApplications', id), {
      ...patch,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  const filterChips = [
    ['all', '전체'],
    ...Object.entries(COURSE_META).map(([id, meta]) => [id, meta.name]),
    ['new', '신규'],
    ['contacted', '연락완료'],
    ['approved', '승인(개설)'],
  ];

  return (
    <div className="admin-page">
      <div className="admin-header-row">
        <h2>
          <Tent size={24} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle', color: '#22d3ee' }} />
          방학특강 관리 · 2026 여름방학
        </h2>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 16, fontSize: '0.92rem' }}>
        기간: 7/27(월) ~ 8/14(금) · 오리엔테이션 7/25(토) 저녁 7:30 · 개설 기준 과정별 {MIN_ATTENDEES}명
      </p>

      {/* 과정별 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {Object.entries(COURSE_META).map(([id, meta]) => {
          const count = courseCounts[id] || 0;
          const reached = count >= MIN_ATTENDEES;
          return (
            <div key={id} className="editor-section" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ color: '#22d3ee' }}>{meta.name}</strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{meta.time}</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 6 }}>
                {count}
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}> / {MIN_ATTENDEES}명</span>
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: reached ? '#4ade80' : 'rgba(255,255,255,0.6)',
                marginTop: 4,
              }}>
                {reached ? '개설 확정' : `개설까지 ${MIN_ATTENDEES - count}명`}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {filterChips.map(([key, label]) => (
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
          {filtered.map(app => {
            const course = COURSE_META[app.courseId];
            return (
              <div key={app.id} className="editor-section" style={{ padding: 18, borderLeft: `4px solid ${course ? '#22d3ee' : '#94a3b8'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <Tent size={18} color="#22d3ee" />
                      <strong style={{ fontSize: '1.1rem' }}>{course?.name || app.courseName || '-'}</strong>
                      {course && <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{course.time}</span>}
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{formatDate(app.createdAt)}</span>
                    </div>
                    <div style={{ color: '#fff', lineHeight: 1.7 }}>
                      <strong>{app.applicantName}</strong> 학부모 · {formatPhone(app.parentPhone)}<br />
                      자녀: {app.studentName} ({app.grade})
                    </div>
                    {app.message && (
                      <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>
                        메모: {app.message}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
